import { setBlockType } from 'tiptap-commands'
import getParagraphNodeAttrs from '../Utils/getParagraphNodeAttrs'
import getParagraphDOM from '../Utils/getParagraphDOM'
import { MIN_INDENT_LEVEL } from '../Utils/indent'
import Node from '../Utils/Node'

function getAttrs(dom) {
    return getParagraphNodeAttrs(dom)
}

function toDOM(node) {
    return getParagraphDOM(node)
}

export default class Paragraph extends Node {

  get name() {
    return 'paragraph'
  }

  get schema() {
    return {
      attrs: {
        align: { default: null },
        indent: { default: MIN_INDENT_LEVEL },
      },
      content: 'inline*',
      group: 'block',
      draggable: false,
      parseDOM: [{
        tag: 'p',
        getAttrs,
      }],
      toDOM,
    }
  }

  commands({ type, schema }) {
    return () => toggleBlockType(type, schema.nodes.paragraph)
  }

}
