import { nodeIsList, nodeIsOrderedList } from 'tiptap-utils'

function setCounterLinked(tr, pos, linked) {
  const node = tr.doc.nodeAt(pos)
  const { counterReset = null } = node.attrs
  const nextCounterReset = linked
    ? 'none'
    : null
  let transformation = tr

  if (nextCounterReset !== counterReset) {
    const nodeAttrs = {
      ...node.attrs,
      counterReset: nextCounterReset,
    }

    transformation = transformation.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
  }

  return transformation
}

function canJoinListNodes(one, two) {
  return !!(
    one.type === two.type
    && one.attrs.indent === two.attrs.indent
    && nodeIsList(one)
    && nodeIsList(two)
  )
}

/**
 * If two siblings nodes that can be joined as single list, returns
 * the information of how to join them.
 */
function resolveJointInfo(node, pos, prevNode, firstListNodePos) {
  if (!prevNode || !canJoinListNodes(node, prevNode)) {
    return null
  }

  return {
    deleteFrom: pos,
    deleteTo: pos + node.nodeSize,
    insertAt: pos - 1,
    content: node.content,
    firstListNodePos,
  }
}

/**
 * This ensures that ordered lists with the same indent level among the same
 * Lists Island share the same counter.
 *
 * For example, the following three lists:
 *   --------
 *   1. AAA
 *   2. BBB
 *   --------
 *     a. CCC
 *     d. DDD
 *   --------
 *   1. EEE
 *   2. FFF
 *   --------
 * Will transform into
 *   --------
 *   1. AAA
 *   2. BBB
 *   --------
 *     a. CCC
 *     d. DDD
 *   --------
 *   3. EEE
 *   4. FFF
 *   --------
 * This means that the 1st and the 3rd lists are linked.
 */
function linkOrderedListCounters(tr) {
  const { doc } = tr
  const from = 1
  const to = doc.nodeSize - 2

  if (from >= to) {
    return tr
  }

  const namedLists = new Set()
  let listsBefore = null
  let transformation = tr

  doc.nodesBetween(from, to, (node, pos, parentNode) => {
    let willTraverseNodeChildren = true

    if (nodeIsList(node)) {
      // List Node can't be nested, no need to traverse its children.
      willTraverseNodeChildren = false
      const indent = node.attrs.indent || 0
      const start = node.attrs.start || 1
      const { name, following } = node.attrs

      if (name) {
        namedLists.add(name)
      }

      if (listsBefore) {
        if (start === 1 && nodeIsOrderedList(node)) {
          // Look backward until we could find another ordered list node to
          // link with.
          let counterIsLinked

          listsBefore.some(list => {
            if (list.node.type !== node.type && list.indent === indent) {
              // This encounters different type of list node (e.g a bullet
              // list node), we need to restart the counter.
              // ------
              // 1. AAA
              // 2. BBB
              // ------
              // -. CCC
              // -. DDD
              // ------
              // 1. DDD <- Counter restarts here.
              // 2. EEE
              // ------
              counterIsLinked = false

              return true
            }

            if (list.indent < indent) {
              // This encounters an ordered list node that has less indent.
              // we need to restart the counter.
              // ------
              // 1. AAA
              // 2. BBB
              // ------
              //   1. DDD <- Counter restarts here.
              //   2. EEE
              // ------
              counterIsLinked = false

              return true
            }

            if (list.indent === indent) {
              // This encounters an ordered list node that has same indent.
              // Do not Restart the counter.
              // ------
              // 1. AAA
              // 2. BBB
              // ------
              // 3. DDD <- Counter continues here.
              // 4. EEE
              // ------
              counterIsLinked = true

              return true
            }

            return false
          })

          if (counterIsLinked !== undefined) {
            transformation = setCounterLinked(transformation, pos, counterIsLinked)
          }
        }
      } else {
        // Found the first list among a new Lists Island.
        // ------
        // 1. AAA <- Counter restarts here.
        // 2. BBB
        listsBefore = []

        if (nodeIsOrderedList(node)) {
          // The list may follow a previous list that is among another Lists
          // Island. If so, do not reset the list counter.
          const counterIsLinked = namedLists.has(following)

          transformation = setCounterLinked(transformation, pos, counterIsLinked)
        }
      }

      listsBefore.unshift({ parentNode, indent, node })
    } else {
      // Not traversing within any list node. No lists need to be updated.
      listsBefore = null
    }

    return willTraverseNodeChildren
  })

  return transformation
}

function traverseDocAndFindJointInfo(doc, prevJointInfo) {
  const minFrom = 1
  const to = doc.nodeSize - 2
  const from = prevJointInfo
    ? Math.max(minFrom, prevJointInfo.firstListNodePos)
    : minFrom

  if (to <= from) {
    return null
  }

  let prevNode = null
  let jointInfo = null
  let firstListNodePos = 0

  // Perform the breadth-first traversal.
  doc.nodesBetween(from, to, (node, pos) => {
    if (jointInfo) {
      // We've found the list to merge. Stop traversing deeper.
      return false
    }

    if (nodeIsList(node)) {
      firstListNodePos = firstListNodePos === 0
        ? pos
        : firstListNodePos
      jointInfo = resolveJointInfo(node, pos, prevNode, firstListNodePos)
      prevNode = node

      // Stop the traversing recursively inside the this list node because
      // its content only contains inline nodes.
      return false
    }

    prevNode = node

    // This is not a list node, will keep traversing deeper until we've found
    // a list node or reach the leaf node.
    return true
  })

  if (jointInfo) {
    // Reduce the range of the next traversal so it could run faster.
    jointInfo.firstListNodePos = firstListNodePos
  }

  return jointInfo
}

/**
 * This function consolidates list nodes among the same "Lists Island".
 *
 * ## Definition of a "Lists Island"
 *   Separate list that are adjacent to each other are grouped as
 *   a "Lists Island".
 *   For example, the following HTML snippets contains two "Lists Island":
 *
 *     <h1>text</h1>
 *     <!-- Lists Island Starts -->
 *     <ul><li>text</li><li>text</li></ul>
 *     <ol><li>text</li><li>text</li></ul>
 *     <!-- Lists Island Ends -->
 *     <p>text</p>
 *     <!-- Lists Island Starts -->
 *     <ul><li>text</li><li>text</li></ul>
 *     <ol><li>text</li><li>text</li></ul>
 *     <!-- Lists Island Ends -->
 *     <p>text</p>
 *
 * List nodes with the same list type and indent level among the same Lists
 * Island will be joined into one list node.
 * Note that this transform may change the current user selection.
 */
export default function consolidateListNodes(tr) {
  if (tr.getMeta('dryrun')) {
    // This transform is potentially expensive to perform, so skip it if
    // the transform is performed as "dryrun".
    return tr
  }

  let transformation = tr
  let prevJointInfo

  // Keep the loop running until there's no more list nodes that can be joined.
  while (true) { /* eslint-disable-line no-constant-condition */
    const jointInfo = traverseDocAndFindJointInfo(tr.doc, prevJointInfo)

    if (jointInfo) {
      const {
        deleteFrom,
        deleteTo,
        insertAt,
        content,
      } = jointInfo

      transformation = transformation.delete(deleteFrom, deleteTo)
      transformation = transformation.insert(insertAt, content)
      prevJointInfo = jointInfo
    } else {
      transformation = linkOrderedListCounters(transformation)

      break
    }
  }

  return transformation
}
