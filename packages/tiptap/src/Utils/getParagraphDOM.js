import { ATTRIBUTE_INDENT } from './indent'

export default function getParagraphDOM(node) {
  const {
    align,
    indent,
  } = node.attrs

  const attrs = {}
  let style = ''

  if (align && align !== 'left') {
    style += `text-align: ${align};`
  }

  if (style) {
    attrs.style = style
  }

  if (indent) {
    attrs[ATTRIBUTE_INDENT] = Number(indent)
  }

  return ['p', attrs, 0]
}
