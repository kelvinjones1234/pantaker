import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Generic, presentational admin data table. It knows nothing about permissions
 * or domain rules — callers supply columns, rows, and (optionally) a per-row
 * action slot. On small screens the same rows render as stacked cards so the
 * table stays usable on a phone. Exactly one of the two layouts is in the DOM's
 * accessibility tree at any width (the other is `display:none`).
 */
export interface AdminColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function AdminDataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  rowActions,
  empty,
}: {
  columns: Array<AdminColumn<Row>>;
  rows: Row[];
  getRowKey: (row: Row) => string;
  /** Accessible name for the table (visually hidden). */
  caption: string;
  /** Rendered in an extra trailing column/row area when supplied. */
  rowActions?: (row: Row) => ReactNode;
  /** Rendered instead of the table when there are no rows. */
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className="shop-card overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-[var(--color-faint-border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]",
                    column.align === "end" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-[var(--color-faint-border)] align-top last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-[var(--color-ink-black)]",
                      column.align === "end" && "text-right",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {rowActions && <td className="px-4 py-3 text-right">{rowActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-[var(--color-faint-border)] md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="flex flex-col gap-2 p-4">
            {columns.map((column) => (
              <div key={column.key} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]">
                  {column.header}
                </span>
                <span className="min-w-0 text-right text-[13px] text-[var(--color-ink-black)]">
                  {column.render(row)}
                </span>
              </div>
            ))}
            {rowActions && <div className="pt-1">{rowActions(row)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
