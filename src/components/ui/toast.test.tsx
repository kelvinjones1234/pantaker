import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToastCard, type ToastItem } from "@/components/ui/toast";

const base: ToastItem = {
  id: "toast-1",
  title: "Listing deleted",
  description: "The listing has been removed.",
  tone: "success",
  duration: 4800,
};

describe("ToastCard", () => {
  it("announces a success message politely", () => {
    const html = renderToStaticMarkup(
      <ToastCard item={base} onDismiss={() => {}} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("Listing deleted");
    expect(html).toContain("removed");
    expect(html).toContain('aria-label="Dismiss notification"');
  });

  it("uses an assertive alert for failures", () => {
    const html = renderToStaticMarkup(
      <ToastCard
        item={{
          ...base,
          tone: "error",
          title: "Could not delete listing",
          description: "It has an active order.",
        }}
        onDismiss={() => {}}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("active order");
  });
});
