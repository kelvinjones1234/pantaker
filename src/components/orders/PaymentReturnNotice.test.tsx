import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PaymentReturnNotice } from "@/components/orders/PaymentReturnNotice";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("PaymentReturnNotice", () => {
  it("renders nothing when the visitor did not return from checkout", () => {
    const html = renderToStaticMarkup(
      <PaymentReturnNotice requested={false} paid={false} reference="PTK-1" />,
    );

    expect(html).toBe("");
  });

  it("confirms a completed payment", () => {
    const html = renderToStaticMarkup(
      <PaymentReturnNotice requested paid reference="PTK-1" />,
    );

    expect(html).toContain("Payment confirmed");
  });

  it("tells the buyer not to pay again while confirmation is pending", () => {
    const html = renderToStaticMarkup(
      <PaymentReturnNotice requested paid={false} reference="PTK-1" />,
    );

    expect(html).toContain("Confirming your payment");
    expect(html).toContain("PTK-1");
  });
});
