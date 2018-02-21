import marked from 'marked'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

// Usage in template:
// ---
// papyre: {fn: html, layout: Index}
// ---
export function html(props) {
  const {layout} = Object(props.entry.papyre)
  const Layout = exports[layout]
  if (typeof Layout !== 'function') {
    throw Error(`Expected to find layout function ${layout}, got ${Layout}`)
  }
  return `<!doctype html>${renderToStaticMarkup(<Layout {...props} />)}`
}

export function Index({entry, entries: __, tree: ___}) {
  // Be aware: marked doesn't sanitize HTML.
  const body = /\.md$/.test(entry.path) ? marked(entry.body) : entry.body

  return (
    <html>
      <head>
        <title>{entry.title}</title>
      </head>
      <body {...innerHtmlProps(body)} />
    </html>
  )
}

function innerHtmlProps(text) {
  return {dangerouslySetInnerHTML: {__html: text}}
}
