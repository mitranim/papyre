'use strict'

const gulp = require('gulp')
const log = require('fancy-log')
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

gulp.task('build', async () => {
  const result = await papyre.buildP(webpackConfig)
  log(result.timing)
  await papyre.writeEntries('public', renameEntries(result.entries))
})

gulp.task('watch', () => {
  papyre.watch(webpackConfig, (err, result) => {
    if (err) log(err)
    else {
      log(result.timing)
      papyre.writeEntries('public', renameEntries(result.entries)).catch(log)
    }
  })
})

function renameEntries(entries) {
  for (const entry of entries) {
    entry.path = entry.path.replace(/\.md$/, '.html')
  }
  return entries
}

gulp.task('default', gulp.series('watch'))
