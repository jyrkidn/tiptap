import {
  minMax,
  compareNumber,
  consolidateListNodes,
  transformAndPreserveTextSelection,
  MIN_INDENT_LEVEL,
  MAX_INDENT_LEVEL,
} from 'tiptap/Utils'
import { nodeEqualsType } from 'tiptap-utils'
import { AllSelection, TextSelection } from 'prosemirror-state'
import { Fragment } from 'prosemirror-model'

function setNodeIndentMarkup(tr, pos, delta) {
  if (!tr.doc) {
    return tr
  }

  const node = tr.doc.nodeAt(pos)

  if (!node) {
    return tr
  }

  const indent = minMax(
    MIN_INDENT_LEVEL,
    (node.attrs.indent || 0) + delta,
    MAX_INDENT_LEVEL
  )

  if (indent === node.attrs.indent) {
    return tr
  }

  const nodeAttrs = {
    ...node.attrs,
    indent,
  }

  return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
}

function setListNodeIndent(tr, schema, pos, delta) {
  const listItem = schema.nodes.list_item

  if (!listItem) {
    return tr
  }

  const { doc, selection } = tr

  if (!doc) {
    return tr
  }

  const listNode = doc.nodeAt(pos)

  if (!listNode) {
    return tr
  }

  const indentNew = minMax(
    MIN_INDENT_LEVEL,
    listNode.attrs.indent + delta,
    MAX_INDENT_LEVEL
  )

  if (indentNew === listNode.attrs.indent) {
    return tr
  }

  const { from, to } = selection

  if (from <= pos && to >= pos + listNode.nodeSize) {
    return setNodeIndentMarkup(tr, pos, delta)
  }

  // listNode is partially selected.
  const itemsBefore = []
  const itemsSelected = []
  const itemsAfter = []

  doc.nodesBetween(pos, pos + listNode.nodeSize, (itemNode, itemPos) => {
    if (itemNode.type === listNode.type) {
      return true
    }

    if (itemNode.type === listItem) {
      const listItemNode = listItem.create(
        itemNode.attrs,
        itemNode.content,
        itemNode.marks
      )

      if (itemPos + itemNode.nodeSize <= from) {
        itemsBefore.push(listItemNode)
      } else if (itemPos > to) {
        itemsAfter.push(listItemNode)
      } else {
        itemsSelected.push(listItemNode)
      }

      return false
    }

    return true
  })

  let transformation = tr.delete(pos, pos + listNode.nodeSize)

  if (itemsAfter.length) {
    const listNodeNew = listNode.type.create(
      listNode.attrs,
      Fragment.from(itemsAfter)
    )

    transformation = transformation.insert(pos, Fragment.from(listNodeNew))
  }

  if (itemsSelected.length) {
    const listNodeAttrs = {
      ...listNode.attrs,
      indent: indentNew,
    }

    const listNodeNew = listNode.type.create(
      listNodeAttrs,
      Fragment.from(itemsSelected)
    )

    transformation = transformation.insert(pos, Fragment.from(listNodeNew))
  }

  if (itemsBefore.length) {
    const listNodeNew = listNode.type.create(
      listNode.attrs,
      Fragment.from(itemsBefore)
    )

    transformation = transformation.insert(pos, Fragment.from(listNodeNew))
  }

  return transformation
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
    const listItemType = Object.entries(schema.nodes)
      .map(([, value]) => value)
      .filter(node => ['list_item'].includes(node.name))
    const listNodePoses = []
    let transformation = tr

    doc.nodesBetween(from, to, (node, pos) => {
      if (nodeEqualsType({ node, types })) {
        transformation = setNodeIndentMarkup(tr, pos, delta)

        return false
      }

      if (nodeEqualsType({ node, type: listItemType })) {
        listNodePoses.push(pos)

        return false
      }

      return true
    })

    if (!listNodePoses.length) {
      return dispatch(transformation)
    }

    transformation = transformAndPreserveTextSelection(tr, schema, memo => {
      const schema2 = memo.schema
      let tr2 = memo.tr

      listNodePoses
        .sort(compareNumber)
        .reverse()
        .forEach(pos => {
          tr2 = setListNodeIndent(tr2, schema2, pos, delta)
        })

      return consolidateListNodes(tr2)
    })

    return dispatch(transformation)
  }
}
