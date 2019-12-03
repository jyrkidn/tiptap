import { ALIGN_PATTERN } from './alignment'
import convertMarginLeftToIndentValue from './convertMarginLeftToIndentValue'
import { MIN_INDENT_LEVEL, ATTRIBUTE_INDENT } from './indent.js'

export default function getParagraphNodeAttrs(dom) {
  const {
    textAlign,
    marginLeft,
  } = dom.style
  const attrs = {}

  const align = dom.getAttribute('align') || textAlign || ''
  if (align && ALIGN_PATTERN.test(align)) {
    attrs.align = align

  let indent = parseInt(dom.getAttribute(ATTRIBUTE_INDENT), 10)
  if (!indent && marginLeft) {
    indent = convertMarginLeftToIndentValue(marginLeft)
  }

  attrs.indent = indent || MIN_INDENT_LEVEL

  return attrs
}
