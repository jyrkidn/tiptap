import { SIZE_PATTERN, PT_TO_PX_RATIO } from './indent'

export default function convertToCSSPTValue(styleValue) {
  const matches = styleValue.match(SIZE_PATTERN)

  if (!matches) {
    return 0
  }

  const unit = matches[2]
  let value = parseFloat(matches[1])

  if (!value || !unit) {
    return 0
  }

  if (unit === 'px') {
    value *= (1 / PT_TO_PX_RATIO)
  }

  return value
}
