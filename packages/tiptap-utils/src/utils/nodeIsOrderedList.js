import { Node } from 'prosemirror-model'

export default function nodeIsOrderedList(node) {
  if (!(node instanceof Node)) {
    return false
  }

  return node.type.name === 'ordered_list'
}
