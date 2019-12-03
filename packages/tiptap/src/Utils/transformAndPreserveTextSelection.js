import { TextSelection } from 'prosemirror-state'
import { Fragment } from 'prosemirror-model'
import applyMark from './applyMark'
import uuid from './uuid'

// Text used to create temporary selection.
// This assumes that no user could enter such string manually.
const PLACEHOLDER_TEXT = `[\u200b\u2800PLACEHOLDER_TEXT_${uuid()}\u2800\u200b]`

// Perform the transform without losing the perceived text selection.
// The way it works is that this will annotate teh current selection with
// temporary marks and restores the selection with those marks after performing
// the transform.
export default function transformAndPreserveTextSelection(tr, schema, fn) {
  if (tr.getMeta('dryrun')) {
    // There's no need to preserve the selection in dryrun mode.
    return fn({ tr, schema })
  }

  const { selection, doc } = tr
  const markType = schema.marks['mark-text-selection']

  if (!markType || !selection || !doc || !(selection instanceof TextSelection)) {
    return tr
  }

  const { from, to } = selection

  // Mark current selection so that we could resume the selection later
  // after changing the whole list.
  let fromOffset = 0
  let toOffset = 0
  let placeholderTextNode
  let transaction = tr

  if (from === to) {
    if (from === 0) {
      return tr
    }

    // Selection is collapsed, create a temporary selection that the marks can
    // be applied to.
    const currentNode = tr.doc.nodeAt(from)
    const prevNode = tr.doc.nodeAt(from - 1)
    const nextNode = tr.doc.nodeAt(from + 1)


    switch (true) {
        case !currentNode && prevNode && prevNode.type.name === 'paragraph' && !prevNode.firstChild:
          // The selection is at a paragraph node which has no content.
          // Create a temporary text and move selection into that text.
          placeholderTextNode = schema.text(PLACEHOLDER_TEXT)
          transaction = transaction.insert(from, Fragment.from(placeholderTextNode))
          toOffset = 1
          break

        case !currentNode && prevNode && prevNode.type.name === 'text':
          // The selection is at the end of the text node. Select the last
          // character instead.
          fromOffset = -1
          break

        case prevNode && currentNode && currentNode.type === prevNode.type:
          // Ensure that the mark is applied to the same type of node.
          fromOffset = -1
          break

        case nextNode && currentNode && currentNode.type === nextNode.type:
          toOffset = 1
          break

        case nextNode:
          // Could not find the same type of node, assume the next node is safe to use.
          toOffset = 1
          break

        case prevNode:
          // Could not find the same type of node, assume the next node is safe to use.
          fromOffset = -1
          break

        default:
          // Selection can't be safely preserved.
          return transaction
    }

    transaction = transaction.setSelection(
      TextSelection.create(doc, from + fromOffset, to + toOffset)
    )
  }

  // This is an unique ID (by reference).
  const id = {}
  const findMark = mark => mark.attrs.id === id
  const findMarkRange = () => {
    let markFrom = 0
    let markTo = 0

    transaction.doc.descendants((node, pos) => {
      if (node.marks && node.marks.find(findMark)) {
        markFrom = markFrom === 0 ? pos : markFrom
        markTo = pos + node.nodeSize
      }

      return true
    })

    return {
      from: markFrom,
      to: markTo,
    }
  }

  // TODO: This has side-effect. It will cause `tr.docChanged` to be `true`.
  // No matter whether `fn({tr, schema})` did change the doc or not.
  transaction = applyMark(transaction, schema, markType, { id })
  transaction = fn({ transaction, schema })

  const markRange = findMarkRange()
  const selectionRange = {
    from: Math.max(0, markRange.from - fromOffset),
    to: Math.max(0, markRange.to - toOffset),
  }

  selectionRange.to = Math.max(0, selectionRange.from, selectionRange.to)

  transaction = transaction.removeMark(markRange.from, markRange.to, markType)

  if (placeholderTextNode) {
    transaction.doc.descendants((node, pos) => {
      if (node.type.name === 'text' && node.text === PLACEHOLDER_TEXT) {
        transaction = transaction.delete(pos, pos + PLACEHOLDER_TEXT.length)
        placeholderTextNode = null

        return false
      }

      return true
    })
  }

  transaction = transaction.setSelection(
    TextSelection.create(transaction.doc, selectionRange.from, selectionRange.to)
  )

  return transaction
}
