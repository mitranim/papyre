'use strict'

const pt = require('path')
const papyre = require('../../')

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
