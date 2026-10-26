export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MenuSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface MenuCoordinates {
  top: number;
  left: number;
  placement: "below" | "above";
}

const DEFAULT_GAP = 8;
const DEFAULT_MARGIN = 8;

/**
 * Positions a floating menu next to its trigger. The menu opens below when
 * there is room, flips above near the bottom of the viewport, and clamps to the
 * viewport edges so it is never cut off or pushed off-screen.
 */
export function menuPosition(
  trigger: TriggerRect,
  menu: MenuSize,
  viewport: ViewportSize,
  align: "start" | "end",
  options: { gap?: number; margin?: number } = {},
): MenuCoordinates {
  const gap = options.gap ?? DEFAULT_GAP;
  const margin = options.margin ?? DEFAULT_MARGIN;

  const spaceBelow = viewport.height - trigger.bottom - gap - margin;
  const spaceAbove = trigger.top - gap - margin;
  const placeBelow = menu.height <= spaceBelow || spaceBelow >= spaceAbove;

  const preferredTop = placeBelow
    ? trigger.bottom + gap
    : trigger.top - gap - menu.height;
  const maxTop = Math.max(margin, viewport.height - menu.height - margin);
  const top = Math.min(Math.max(preferredTop, margin), maxTop);

  const preferredLeft =
    align === "end" ? trigger.right - menu.width : trigger.left;
  const maxLeft = Math.max(margin, viewport.width - menu.width - margin);
  const left = Math.min(Math.max(preferredLeft, margin), maxLeft);

  return {
    top,
    left,
    placement: placeBelow ? "below" : "above",
  };
}
