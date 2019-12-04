import { Node } from 'prosemirror-model'

export default function nodeIsTodoList(node) {
  if (!(node instanceof Node)) {
    return false
  }

  return node.type.name === 'todo_list'
}
