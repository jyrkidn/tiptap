import { Node } from 'prosemirror-model'
import nodeIsBulletList from './nodeIsBulletList'
import nodeIsOrderedList from './nodeIsOrderedList'

export default function nodeIsList(node) {
  if (!(node instanceof Node)) {
    return false
  }

  return nodeIsBulletList(node) || nodeIsOrderedList(node)
}
