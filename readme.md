## Overview

Papyre is a build tool for static sites. It handles watching, rebuilding, aggregating templates, parsing front matter; everything except actual rendering. Bring your own rendering engine (but it must be JS).

Papyre is JS-centric. It requires a JS entry file that exports rendering functions, and uses those to render templates. It also uses Webpack to watch the dependency graph and transpile JS. You can add React with a few lines of code, and reuse code between static layouts, client-side bundle, Netlify CMS previews, or whatever. Check the `examples` directory.

Works well with React and Netlify CMS.

New and immature. Feedback and suggestions are welcome.

## TOC

* [Overview](#overview)
* [Why](#why)
* [Usage](#usage)
* [API](#api)
  * [Front Matter and Props](#front-matter-and-props)
  * [`build`](#buildwebpackconfig-ondone)
  * [`watch`](#watchwebpackconfig-ondone)
  * [`writeEntries`](#writeentriesdir-entries)
* [Misc](#misc)

## Why

Static site generators tend to combine build tooling and an opinionated rendering engine. Also, React-based generators, like Gatsby, tend to have WAY too many concepts and API surface. Papyre is the missing link: a simple build tool that lets you bring your own rendering tool. You can add React, or whatever else, with just a few lines.

## Usage

Install from NPM:

```sh
npm i papyre
```

This example uses React and involves three files: a build script, a markdown/HTML template, and a JS publics file with rendering functions.

```
╠═ build.js
╚═ src
   ╚═ templates
      ╠═ index.md
      ╚═ index.js
```

Here, `build.js` will be a standalone build script. Don't balk at the glue code; some things are better in user code.

```js
'use strict'

const pt = require('path')
const papyre = require('papyre')

const webpackConfig = {
  entry: pt.resolve('src/templates/index.js'),
  module: {rules: [{
    test: /\.jsx?$/,
    include: pt.resolve('src/templates'),
    use: {loader: 'babel-loader'},
  }]},
}

const [_exec, _file, cmd] = process.argv

if (cmd === 'build') {
  papyre.build(webpackConfig, (err, result) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    else {
      console.info(result.timing)
      papyre.writeEntries('public', renameEntries(result.entries))
    }
  })
}
else if (cmd === 'watch') {
  papyre.watch(webpackConfig, (err, result) => {
    if (err) {
      console.error(err)
    }
    else {
      console.info(result.timing)
      papyre.writeEntries('public', renameEntries(result.entries))
    }
  })
}
else {
  throw Error(`Unrecognized or missing command: ${cmd}`)
}

function renameEntries(entries) {
  for (const entry of entries) {
    entry.path = entry.path.replace(/\.md$/, '.html')
  }
  return entries
}
```

`index.md` will be a template with a front matter. The latter also specifies which rendering function to use.

```
---
papyre: {fn: html, layout: Index}
---

# Home

**Hello world!**
```

`index.js` must export the rendering function `html` specified in the template. A rendering function receives a template with metadata and returns a string. That's it. It could be making network calls on a meson uplink to the dark side of the Moon. Or it could use React:

```js
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

export function html(props) {
  const {layout} = Object(props.entry.papyre)
  const Layout = exports[layout]
  if (typeof Layout !== 'function') {
    throw Error(`Expected to find layout function ${layout}, got ${Layout}`)
  }
  return `<!doctype html>${renderToStaticMarkup(<Layout {...props} />)}`
}

export function Index({entry, entries: __, tree: ___}) {
  return (
    <html>
      <head>
        <title>{entry.title}</title>
      </head>
      <body>
        {entry.body}
      </body>
    </html>
  )
}
```

Build once:

```sh
node build build
```

Watch and rebuild:

```sh
node build watch
```

The `public` dir should now contain the output:

```
╚═ public
   ╚═ index.html
```

## API

### Front Matter and Props

Templates typically look like this:

```
---
(optional metadata in YAML format)
---

(body)
```

The `--- ... ---` part is called ["front matter"](https://github.com/jxson/front-matter) and must be YAML.

Papyre renders those and only those templates that specify a rendering function, which must be exported by your main JS file.

```
---
papyre: {fn: myRenderingFunction}
---
```

```js
export function myRenderingFunction(props) {
  return props.entry.body
}
```

Each template is parsed into an entry, which is the YAML front matter dict, with the remaining content added as `body`, plus the template's relative `path`.

The rendering function receives props with the following shape:

```js
interface Props {
  entry: Entry
  entries: [Entry]
  tree: EntryTree
}

interface Entry {
  path: string
  body: string
  ...
}

interface EntryTree {
  [string]: Entry | EntryTree
}
```

`entries` is the collection of all parsed entries. `tree` is the tree of all entries matching the folder structure, for convenient lookup. It's especially useful for rendering "index" pages that display multiple items, such as blog posts.

### Using the Tree

Suppose you want to render a page with multiple elements, say, blog posts. Say we have this structure:

```
╚═ src
   ╚═ templates
      ╠═ index.js
      ╠═ posts.md
      ╚═ posts
         ╠═ first.md
         ╚═ second.md
```

Suppose `posts.md` looks like this:

```
---
papyre: {fn: posts}
---
```

And `first.md` and `second.md` look like this:

```
---
papyre: {fn: post}
title: Post Title
---

(body)
```

Then `posts` would receive the following tree, and could use it to render multiple posts:

```js
const _tree = {
  'index.js': {path: 'index.js', body: '(JS code)'},
  'posts.md': {path: 'posts.md', body: ''},
  'posts': {
    'first.md': {path: 'posts/first.md', title: 'Post Title', body: '(body)'},
    'second.md': {path: 'posts/second.md', title: 'Post Title', body: '(body)'},
  }
}

function posts({tree}) {
  // Should also sort these by date
  return Object.values(tree.posts).map(post => (
    `<div>${post.title}</div>`
  )).join('\n')
}

function post({entry: {title}}) {
  return `<div>${title}</div>`
}
```

### `build(webpackConfig, onDone)`

Runs a single build cycle: compile JS, compile templates, trigger `onDone` when completed. See example in [Usage](#usage).

The config is used to create a new Webpack compiler instance, with modifications:
  * store output in RAM
  * don't bundle libraries
  * compile for Node.js, without polyfills

The config must contain an `entry`, which must be a single string, a path to the JS file that exports rendering functions.

```js
papyre.build({entry: './src/templates/index.js'}, () => {})
```

The template folder is assumed to be the entry file's directory; if the entry is `'./src/templates/index.js'`, the template folder is `'./src/templates'`.

`onDone` receives either an error or the build result:

```js
papyre.build({entry: './src/templates/index.js'}, (err, result) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  else {
    papyre.writeEntries('public', result.entries)
  }
})
```

The result has the following shape:

```js
interface Result {
  entries: [Entry]
  timing: string
}

interface Entry {
  path: string
  body: string
}
```

To write the result to disk, use `writeEntries`, see below.

When reusing a browser-oriented config, make sure to disable minification, i.e. `webpack.optimize.UglifyJsPlugin`, since it's expensive and pointless for a build-only bundle.

### `watch(webpackConfig, onDone)`

Accepts the same configuration as `build`. Watches the templates directory and the dependency graph of the entry file. Triggers `onDone` on each rebuild. Returns a reference that can stop the watching:

```js
const watch = papyre.watch({entry: './src/templates/index.js'}, () => {})

watch.deinit()
```

### `writeEntries(dir, entries)`

Writes entries relative to `dir`, creating intermediary directories if necessary.

This:

```js
writeEntries('public', [{path: 'index.html', body: ''}])
```

will create this:

```
╚═ public
   ╚═ index.html
```

Should be called in the `build` or `watch` callback; see the `examples` directory.

## Misc

Feedback and suggestions are welcome!
