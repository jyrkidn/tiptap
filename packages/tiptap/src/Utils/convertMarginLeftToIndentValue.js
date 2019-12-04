import convertToCSSPTValue from './convertToCSSPTValue'
import {
  INDENT_MARGIN_PT_SIZE,
  MIN_INDENT_LEVEL,
  MAX_INDENT_LEVEL,
} from './indent'
import minMax from './minMax'

export default function convertMarginLeftToIndentValue(marginLeft) {
  const ptValue = convertToCSSPTValue(marginLeft)
  const indentLevel = Math.floor(ptValue / INDENT_MARGIN_PT_SIZE)

  return minMax(MIN_INDENT_LEVEL, indentLevel, MAX_INDENT_LEVEL)
}
