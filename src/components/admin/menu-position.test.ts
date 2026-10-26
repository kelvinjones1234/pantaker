import { describe, expect, it } from "vitest";
import { menuPosition } from "@/components/admin/menu-position";

const viewport = { width: 1280, height: 800 };
const menu = { width: 200, height: 160 };

describe("menuPosition", () => {
  it("opens below the trigger when there is room", () => {
    const trigger = { top: 100, bottom: 136, left: 400, right: 436 };

    expect(menuPosition(trigger, menu, viewport, "end")).toEqual({
      top: 144,
      left: 236,
      placement: "below",
    });
  });

  it("flips above the trigger near the viewport bottom", () => {
    const trigger = { top: 700, bottom: 736, left: 400, right: 436 };

    expect(menuPosition(trigger, menu, viewport, "end")).toEqual({
      top: 532,
      left: 236,
      placement: "above",
    });
  });

  it("aligns the left edge for a start-aligned menu", () => {
    const trigger = { top: 100, bottom: 136, left: 400, right: 436 };

    expect(menuPosition(trigger, menu, viewport, "start")).toEqual({
      top: 144,
      left: 400,
      placement: "below",
    });
  });

  it("clamps to the left viewport margin", () => {
    const trigger = { top: 100, bottom: 136, left: 4, right: 40 };

    expect(menuPosition(trigger, menu, viewport, "start").left).toBe(8);
  });

  it("clamps to the right viewport margin", () => {
    const trigger = { top: 100, bottom: 136, left: 1240, right: 1276 };

    expect(menuPosition(trigger, menu, viewport, "end").left).toBe(1072);
  });

  it("keeps the menu inside the viewport when it is taller than the space", () => {
    const tallMenu = { width: 200, height: 500 };
    const trigger = { top: 400, bottom: 436, left: 400, right: 436 };

    expect(menuPosition(trigger, tallMenu, viewport, "end").top).toBe(8);
  });

  it("honours custom gap and margin options", () => {
    const trigger = { top: 100, bottom: 136, left: 400, right: 436 };

    expect(
      menuPosition(
        trigger,
        menu,
        viewport,
        "start",
        { gap: 4, margin: 20 },
      ),
    ).toEqual({
      top: 140,
      left: 400,
      placement: "below",
    });
  });
});
