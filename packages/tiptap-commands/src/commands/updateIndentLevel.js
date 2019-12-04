import { AllSelection, TextSelection } from 'prosemirror-state'
import { liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { findParentNode } from 'prosemirror-utils'
import {
  minMax,
  MIN_INDENT_LEVEL,
  MAX_INDENT_LEVEL,
} from 'tiptap/Utils'
import { nodeEqualsType, nodeIsList, nodeIsTodoList } from 'tiptap-utils'

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

function toggleListItemIndentation(listItem, delta) {
  return delta > 0
    ? sinkListItem(listItem)
    : liftListItem(listItem)
}

export default function updateIndentLevel(type, delta) {
  return (state, dispatch, view) => {
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

    const {
      from,
      to,
      $from,
      $to,
    } = selection
    const range = $from.blockRange($to)
    const parentList = findParentNode(nodeIsList)(selection)

    if (range && range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {

      if (nodeIsList(parentList.node)) {
        const listType = nodeIsTodoList(parentList.node)
          ? schema.nodes.todo_item
          : schema.nodes.list_item

        console.log({ listType });

        return toggleListItemIndentation(listType, delta)(state, dispatch, view)
      }
    }

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

      return true
    })

    return dispatch(transformation)
  }
}
