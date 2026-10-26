import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, FieldError } from "@/components/ui/form-field";
import { StatusPill } from "@/components/ui/status-pill";
import { Timestamp } from "@/components/ui/timestamp";

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

describe("AdminPagination", () => {
  const render = (
    overrides: Partial<Parameters<typeof AdminPagination>[0]> = {},
  ) =>
    renderToStaticMarkup(
      <AdminPagination
        page={1}
        pageSize={20}
        totalItems={45}
        hrefForPage={(page) => `/admin/accounts?page=${page}`}
        {...overrides}
      />,
    );

  it("marks the current page and links to neighbors", () => {
    const html = render();
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/admin/accounts?page=2"');
    expect(html).toContain("Showing");
  });

  it("disables the previous control on the first page", () => {
    expect(render()).toContain('aria-disabled="true"');
  });

  it("renders nothing when there are no items", () => {
    expect(render({ totalItems: 0, page: 1 })).toBe("");
  });
});

describe("AdminDataTable", () => {
  interface Row {
    id: string;
    name: string;
  }
  const columns = [
    { key: "name", header: "Name", render: (row: Row) => row.name },
    {
      key: "id",
      header: "ID",
      render: (row: Row) => row.id,
      align: "end" as const,
    },
  ];

  it("renders a caption, column headers, and each row in both layouts", () => {
    const html = renderToStaticMarkup(
      <AdminDataTable
        caption="Users"
        columns={columns}
        rows={[{ id: "u1", name: "Ada" }]}
        getRowKey={(row) => row.id}
      />,
    );
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain("Users");
    expect(html).toContain('scope="col"');
    expect(html).toContain("Ada");
  });

  it("falls back to the empty slot and nothing when empty", () => {
    expect(
      renderToStaticMarkup(
        <AdminDataTable
          caption="Users"
          columns={columns}
          rows={[]}
          getRowKey={(row) => row.id}
          empty={<p>No users yet</p>}
        />,
      ),
    ).toBe("<p>No users yet</p>");
    expect(
      renderToStaticMarkup(
        <AdminDataTable
          caption="Users"
          columns={columns}
          rows={[]}
          getRowKey={(row) => row.id}
        />,
      ),
    ).toBe("");
  });
});

describe("AdminActionMenu", () => {
  it("renders a collapsed, labelled trigger", () => {
    const html = renderToStaticMarkup(
      <AdminActionMenu
        label="User actions"
        items={[{ key: "view", label: "View", href: "/x" }]}
      />,
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="User actions"');
    expect(html).not.toContain('role="menu"');
  });
});

describe("ConfirmDialog", () => {
  it("renders a labelled modal when open", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Suspend account"
        description="They will lose access."
        confirmLabel="Suspend"
        tone="danger"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Suspend account");
  });

  it("renders nothing when closed", () => {
    expect(
      renderToStaticMarkup(
        <ConfirmDialog
          open={false}
          title="t"
          description="d"
          confirmLabel="c"
          onConfirm={() => {}}
          onCancel={() => {}}
        />,
      ),
    ).toBe("");
  });
});

describe("StatusPill", () => {
  it("keeps the neutral pill white and exposes a tone class", () => {
    expect(renderToStaticMarkup(<StatusPill>Active</StatusPill>)).toContain(
      "badge-condition",
    );
    expect(
      renderToStaticMarkup(
        <StatusPill tone="danger">Needs changes</StatusPill>,
      ),
    ).toContain("var(--color-error)");
  });
});

describe("Field and FieldError", () => {
  it("wires a label to its control and surfaces the first error", () => {
    const html = renderToStaticMarkup(
      <Field label="Email" htmlFor="email" error={["Required", "Second"]}>
        <input id="email" />
      </Field>,
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Required");
    expect(html).not.toContain("Second");
  });

  it("renders nothing without errors", () => {
    expect(renderToStaticMarkup(<FieldError messages={[]} />)).toBe("");
    expect(renderToStaticMarkup(<FieldError />)).toBe("");
  });
});

describe("Timestamp", () => {
  it("uses a semantic time element and falls back to an em dash", () => {
    const html = renderToStaticMarkup(
      <Timestamp value="2026-01-05T10:00:00Z" />,
    );
    expect(html).toContain("<time");
    expect(html).toContain('dateTime="2026-01-05T10:00:00Z"');
    expect(renderToStaticMarkup(<Timestamp value={null} />)).toContain("—");
  });
});
