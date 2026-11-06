import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderProgress } from "@/components/orders/OrderProgress";

describe("OrderProgress", () => {
  it("marks the payment stage as current before payment", () => {
    const html = renderToStaticMarkup(<OrderProgress status="pending_payment" />);

    expect(html).toContain("Payment");
    expect(html).toContain("Ready for handover");
    expect(html).toContain("Collected");
    expect(html).toContain("Seller paid");
    expect(html).toContain('aria-current="step"');
  });

  it("shows all normal stages after release", () => {
    const html = renderToStaticMarkup(<OrderProgress status="released" />);

    expect(html.match(/bg-\[var\(--color-shop-violet\)\]/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("explains exceptional statuses instead of showing a misleading progress bar", () => {
    const html = renderToStaticMarkup(<OrderProgress status="disputed" />);

    expect(html).toContain("Disputed");
    expect(html).toContain("seller payout is on hold");
    expect(html).not.toContain('aria-current="step"');
  });
});
