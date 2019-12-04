import { wrapInList, liftListItem } from 'prosemirror-schema-list'
import { findParentNode } from 'prosemirror-utils'
import { nodeIsList } from 'tiptap-utils'

export default function toggleList(listType, itemType) {
  return (state, dispatch, view) => {
    const { selection } = state
    const { $from, $to } = selection
    const range = $from.blockRange($to)

    if (!range) {
      return false
		}

    const parentList = findParentNode(nodeIsList)(selection)

    if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
      if (parentList.node.type === listType) {
        return liftListItem(itemType)(state, dispatch, view)
      }

      if (nodeIsList(parentList.node) && listType.validContent(parentList.node.content)) {
        const { tr } = state
        tr.setNodeMarkup(parentList.pos, listType)

        if (dispatch) {
          dispatch(tr)
        }

        return false
      }
    }

    return wrapInList(listType)(state, dispatch, view)
  }
}
