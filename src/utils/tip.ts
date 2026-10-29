/** room kept from the screen's edges, the gap to the anchor (the triangle sits in it) */
const EDGE = 8
const GAP = 10
/** the triangle in a corner: this far from the bubble's side */
const CORNER = 14

/**
 * Where a tooltip goes (HoverTip's and v-tip's): above its anchor and centred; pushed sideways when it would leave the
 * screen (the triangle still points at the anchor), below it when there's no room above (under the top bar and the
 * sticky header).
 */
export function placeTip (box: DOMRect, size: DOMRect): { below: boolean, position: Record<string, string> } {
  const center = box.left + box.width / 2
  let left = center - size.width / 2

  // too close to an edge to centre it: the bubble goes the other way, its corner (and the triangle) at the anchor
  if (left + size.width > window.innerWidth - EDGE) {
    left = center + CORNER - size.width
  } else if (left < EDGE) {
    left = center - CORNER
  }

  left = Math.min(Math.max(left, EDGE), window.innerWidth - size.width - EDGE)

  // the top bar and the page's sticky header cover the upper part of the screen – no room above there
  const top = (document.querySelector('.head')?.getBoundingClientRect().bottom ?? 0) + EDGE
  const below = box.top - GAP - size.height < top

  return {
    below,
    position: {
      'left': `${left}px`,
      'top': `${below ? box.bottom + GAP : box.top - GAP - size.height}px`,
      // where the triangle points – the anchor's centre, kept off the rounded corners
      '--arrow': `${Math.min(Math.max(center - left, CORNER), size.width - CORNER)}px`,
    },
  }
}
