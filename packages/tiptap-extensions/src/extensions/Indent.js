import { Extension } from 'tiptap'
import {
  INDENT_MARGIN_PT_SIZE,
  MIN_INDENT_LEVEL,
  MAX_INDENT_LEVEL,
} from 'tiptap/Utils'
import { updateIndentLevel } from 'tiptap-commands'

export default class Indent extends Extension {

  constructor(options = {}) {
      super(options)

      this._delta = options.delta || 0
  }

  get name() {
    return 'indent'
  }

  get defaultOptions() {
    return {
      levels: [...Array(MAX_INDENT_LEVEL + 1).keys()],
      marginSize: INDENT_MARGIN_PT_SIZE,
    }
  }

  get schema() {
    return {
      attrs: {
        indent: { default: MIN_INDENT_LEVEL },
      },
    }
  }

  commands({ type }) {
    return attrs => updateIndentLevel(type, attrs, this._delta)
  }

}
