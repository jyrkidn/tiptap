import { Node } from 'prosemirror-model'

export default function nodeIsBulletList(node) {
  if (!(node instanceof Node)) {
    return false
  }

  return node.type.name === 'bullet_list'
}
