import marked from 'marked'
import {compileTemplate} from 'statil/lib/template'

export function html(props) {
  const {entry} = props
  const text = compileTemplate(entry.body, {context: props})(entry)
  return /\.md$/.test(entry.path) ? marked(text) : text
}
