import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

const navigation = vi.hoisted(() => ({ pathname: "/marketplace" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: unknown; children?: ReactNode } & Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const user = { email: "buyer@example.com" };

describe("MarketplaceHeader", () => {
  beforeEach(() => {
    navigation.pathname = "/marketplace";
  });

  it("omits messages and notifications on browse pages for signed-in users", () => {
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).not.toContain('href="/messages"');
    expect(html).not.toContain('href="/notifications"');
  });

  it("shows the orders link to signed-in users on mobile", () => {
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).toContain('href="/orders"');
    expect(html).toContain('aria-label="Your orders"');
  });

  it("right-aligns the mobile orders and list-item actions", () => {
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).toContain("ml-auto flex shrink-0 items-center gap-1 lg:ml-0");
    expect(html).toContain('aria-label="Your orders"');
    expect(html).toContain('aria-label="List an item"');
  });

  it("routes list-item action to /sell for signed-in users and /login?next=/sell for guests", () => {
    const signedInHtml = renderToStaticMarkup(<MarketplaceHeader user={user} />);
    expect(signedInHtml).toContain('href="/sell"');
    expect(signedInHtml).not.toContain('href="/login?next=/sell"');

    const guestHtml = renderToStaticMarkup(<MarketplaceHeader />);
    expect(guestHtml).toContain('href="/login?next=/sell"');
    expect(guestHtml).not.toContain('href="/sell"');
  });

  it("right-aligns the list-item action for signed-out visitors", () => {
    const html = renderToStaticMarkup(<MarketplaceHeader />);

    expect(html).toContain("ml-auto flex shrink-0 items-center gap-1 lg:ml-0");
    expect(html).toContain('aria-label="List an item"');
    expect(html).not.toContain('aria-label="Your orders"');
  });

  it("keeps the search bar on browse pages", () => {
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).toContain('role="search"');
    expect(html).toContain('id="market-search"');
    expect(html).toContain("max-w-[1072px]");
    expect(html).not.toContain("lg:pl-24");
  });

  it("shows messages but not notifications on listing detail pages", () => {
    navigation.pathname = "/marketplace/listing/123";
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).toContain('href="/messages"');
    expect(html).not.toContain('href="/notifications"');
  });

  it("omits the search bar and aligns with the detail body on listing detail pages", () => {
    navigation.pathname = "/marketplace/listing/123";
    const html = renderToStaticMarkup(<MarketplaceHeader user={user} />);

    expect(html).not.toContain('role="search"');
    expect(html).not.toContain('id="market-search"');
    expect(html).toContain("max-w-6xl");
    expect(html).toContain("lg:pl-24");
  });

  it("omits both actions on listing detail pages for guests", () => {
    navigation.pathname = "/marketplace/listing/123";
    const html = renderToStaticMarkup(<MarketplaceHeader />);

    expect(html).not.toContain('href="/messages"');
    expect(html).not.toContain('href="/notifications"');
  });
});
