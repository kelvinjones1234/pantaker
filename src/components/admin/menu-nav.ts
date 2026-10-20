/**
 * Roving-focus maths for the admin action menu. Kept pure so the keyboard
 * behaviour can be unit-tested without a DOM.
 */

export type MenuMove = 1 | -1 | "first" | "last";

/**
 * Next position within a list of `count` focusable items.
 * `current` is the active position (-1 when none). Wraps in both directions and
 * returns -1 for an empty list.
 */
export function nextMenuIndex(current: number, count: number, move: MenuMove): number {
  if (count <= 0) return -1;
  if (move === "first") return 0;
  if (move === "last") return count - 1;

  const from = current < 0 ? (move === 1 ? -1 : 0) : current;
  return (from + move + count) % count;
}
