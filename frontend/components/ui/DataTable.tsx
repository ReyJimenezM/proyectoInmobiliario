"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
};

const PAGE_SIZE = 15;

function getValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function toComparable(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

export function DataTable<T>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Buscar...",
  emptyMessage = "No hay resultados para mostrar.",
  onRowClick,
  actions,
}: {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) =>
      Object.values(row as Record<string, unknown>).some(
        (value) => typeof value === "string" && value.toLowerCase().includes(q)
      )
    );
  }, [data, query, searchable]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = toComparable(getValue(a, sortKey));
      const bv = toComparable(getValue(b, sortKey));
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    }
    setPage(1);
  }

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
    );
  }, [totalPages, currentPage]);

  return (
    <div className="w-full">
      {(searchable || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {searchable ? (
            <div className="relative w-full max-w-xs">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="input-field pl-9"
              />
            </div>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-card">
        <table className="w-full border-collapse text-left text-sm max-[819px]:block">
          <thead className="max-[819px]:hidden">
            <tr className="border-b border-ink-100 bg-sand-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => toggleSort(col)}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 ${
                    col.sortable ? "cursor-pointer select-none hover:text-ink-800" : ""
                  } ${col.className ?? ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col leading-none text-ink-300">
                        <svg
                          width="8"
                          height="6"
                          viewBox="0 0 8 6"
                          className={sortKey === col.key && sortDir === "asc" ? "text-ink-800" : ""}
                          fill="currentColor"
                        >
                          <path d="M4 0L8 6H0L4 0Z" />
                        </svg>
                        <svg
                          width="8"
                          height="6"
                          viewBox="0 0 8 6"
                          className={`mt-0.5 ${sortKey === col.key && sortDir === "desc" ? "text-ink-800" : ""}`}
                          fill="currentColor"
                        >
                          <path d="M4 6L0 0H8L4 6Z" />
                        </svg>
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-[819px]:flex max-[819px]:flex-col max-[819px]:gap-3 max-[819px]:p-3">
            {pageRows.length === 0 ? (
              <tr className="max-[819px]:block">
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-ink-400 max-[819px]:block max-[819px]:rounded-lg max-[819px]:border max-[819px]:border-ink-100"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-ink-100 last:border-0 transition max-[819px]:block max-[819px]:rounded-lg max-[819px]:border max-[819px]:border-ink-100 max-[819px]:p-3 max-[819px]:last:border ${
                    onRowClick ? "cursor-pointer hover:bg-sand-50" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      data-label={col.header}
                      className={`px-4 py-3 align-middle text-ink-700 max-[819px]:flex max-[819px]:items-center max-[819px]:justify-between max-[819px]:gap-3 max-[819px]:px-1 max-[819px]:py-1.5 max-[819px]:before:text-xs max-[819px]:before:font-semibold max-[819px]:before:uppercase max-[819px]:before:tracking-wide max-[819px]:before:text-ink-400 max-[819px]:before:content-[attr(data-label)] ${
                        col.className ?? ""
                      }`}
                    >
                      {col.render ? col.render(row) : (getValue(row, col.key) as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Paginación">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {pageNumbers.map((p, idx) => (
            <span key={p} className="flex items-center gap-2">
              {idx > 0 && pageNumbers[idx - 1] !== p - 1 && <span className="text-ink-300">…</span>}
              <button
                type="button"
                onClick={() => setPage(p)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition ${
                  p === currentPage ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {p}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página siguiente"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
}
