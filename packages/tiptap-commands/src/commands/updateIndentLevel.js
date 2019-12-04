import { AllSelection, TextSelection } from 'prosemirror-state'
import {
  minMax,
  MIN_INDENT_LEVEL,
  MAX_INDENT_LEVEL,
} from 'tiptap/Utils'
import { nodeEqualsType } from 'tiptap-utils'

function setNodeIndentMarkup(tr, pos, delta) {
  if (!tr.doc) {
    return tr
  }

  const node = tr.doc.nodeAt(pos)

  if (!node) {
    return tr
  }

  const indentLevel = (node.attrs.indent || MIN_INDENT_LEVEL) + delta
  const indent = minMax(MIN_INDENT_LEVEL, indentLevel, MAX_INDENT_LEVEL)

  if (indent === node.attrs.indent) {
    return tr
  }

  const nodeAttrs = {
    ...node.attrs,
    indent,
  }

  return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
}

export default function updateIndentLevel(type, delta) {
  return (state, dispatch) => {
    const {
      doc,
      schema,
      selection,
      tr,
    } = state

    if (!doc
      || !selection
      || !(selection instanceof TextSelection || selection instanceof AllSelection)
    ) {
      return false
    }

    const { from, to } = selection
    const types = Object.entries(schema.nodes)
      .map(([, value]) => value)
      .filter(node => ['paragraph', 'heading', 'blockquote'].includes(node.name))

    if (!types.length) {
      return false
    }

    let transformation = tr

    doc.nodesBetween(from, to, (node, pos) => {
      if (nodeEqualsType({ node, types })) {
        transformation = setNodeIndentMarkup(tr, pos, delta)

        return false
      }

      if (listItemType && nodeEqualsType({ node, types: listItemType })) {
        listNodePoses.push(pos)

        return false
      }

      return true
    })

    return dispatch(transformation)
  }
}
