import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StatTone } from "../common/StatCard";
import KpiIcon, { type KpiIconKind } from "../../pages/shared/KpiIcon";

/* ============================================================================
 * Utilities & Hooks (Storage + Vietnamese text normalization)
 * ========================================================================== */

export function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function usePageUiState<T extends Record<string, unknown>>(
  storageKey: string,
  initialValue: T,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialValue;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return initialValue;
      }
      return { ...initialValue, ...(parsed as Partial<T>) };
    } catch {
      return initialValue;
    }
  });

  const update = (updater: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors in demo mode
      }
      return next;
    });
  };

  return [state, update];
}

/* ============================================================================
 * 1. StatusPill (Reuses .badge classes from assets/css/app.css)
 * ========================================================================== */

export type PillTone = "success" | "warning" | "danger" | "info" | "neutral";

const PILL_BADGE_CLASSES: Record<PillTone, string> = {
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  info: "badge badge-info",
  neutral: "badge badge-gray",
};

export function StatusPill({
  label,
  tone = "neutral",
  title,
  className = "",
}: {
  label: string;
  tone?: PillTone;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`${PILL_BADGE_CLASSES[tone]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}

/* ============================================================================
 * 2. SegmentedControl (32px compact control for unit/tab/view switch)
 * ========================================================================== */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 h-8 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-xs font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-[var(--surface)] text-[var(--heading-color)] shadow-sm font-semibold border border-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums ${
                  active
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-200/70 dark:bg-slate-700 text-[var(--muted)]"
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 3. ScopeBadge (Unified Branch Scope Pill / Dropdown across all B pages)
 * ========================================================================== */

export interface StoreOption {
  id: string;
  code: string;
  name: string;
}

export function ScopeBadge({
  branchScope,
  value,
  onChange,
  stores,
  allValue = "ALL",
  allLabel = "Toàn chuỗi",
  extraOptions = [],
}: {
  branchScope: string | null;
  value: string;
  onChange: (next: string) => void;
  stores: readonly StoreOption[];
  allValue?: string;
  allLabel?: string;
  extraOptions?: readonly { id: string; label: string }[];
}) {
  const lockedStore = branchScope
    ? stores.find((s) => s.id === branchScope || s.code === branchScope)
    : null;

  if (branchScope) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
        title="Bị giới hạn theo tài khoản chi nhánh — không thể xem chi nhánh khác"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          {lockedStore ? `${lockedStore.code} — ${lockedStore.name}` : branchScope}
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 h-8">
      <span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap">
        Phạm vi:
      </span>
      <select
        aria-label="Chọn phạm vi chi nhánh"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-semibold text-[var(--text)] focus:outline-none cursor-pointer pr-1"
      >
        <option value={allValue}>{allLabel}</option>
        {extraOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.code} — {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================================
 * 4. InfoTip (Hover tooltip 1-2 lines + Click Popover for rule details)
 * ========================================================================== */

export function InfoTip({
  label,
  summary,
  title,
  details,
  footerAction,
  align = "right",
  children,
}: {
  label?: string;
  summary: string;
  title?: string;
  details?: readonly { label: string; value: string }[];
  footerAction?: { label: string; onClick: () => void };
  align?: "left" | "right";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label ?? title ?? "Xem thuyết minh"}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[10px] font-bold text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
      >
        i
      </button>

      {/* Lightweight hover tooltip when popover is closed */}
      {hovered && !open && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute bottom-full mb-1.5 z-50 w-56 rounded-lg border border-[var(--border)] bg-slate-900 text-white px-2.5 py-1.5 text-[11px] leading-snug shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {summary}
        </div>
      )}

      {/* Rich click popover */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl text-left ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {title && (
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--heading-color)]">
                {title}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--muted)] leading-relaxed">{summary}</p>
          {details && details.length > 0 && (
            <dl className="mt-2.5 space-y-1.5 rounded-lg bg-[var(--background)] p-2 text-xs border border-[var(--border)]">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2"
                >
                  <dt className="text-[var(--muted)]">{row.label}</dt>
                  <dd className="font-semibold tabular-nums text-[var(--text)] text-right">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {children}
          {footerAction && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                footerAction.onClick();
              }}
              className="mt-2.5 w-full text-center text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              {footerAction.label} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 5. SideDrawer (Slide-over right panel 440-560px with pinned header & footer)
 * ========================================================================== */

export function SideDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  widthClass = "max-w-[500px]",
  footer,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  widthClass?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex h-full w-full ${widthClass} flex-col bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl animate-fadeIn`}
      >
        <header className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-[var(--heading-color)] truncate">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--muted)] mt-0.5 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng panel"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--background)]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. SortMenu & SortableTh (Explicit field names shown in sort options)
 * ========================================================================== */

export interface SortOption<T extends string = string> {
  key: T;
  label: string;
  fieldLabel: string;
}

export function SortMenu<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SortOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 h-8 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)] whitespace-nowrap"
      >
        <span aria-hidden="true">↕</span>
        <span>Sắp xếp:</span>
        <span className="font-semibold text-[var(--heading-color)]">
          {current?.label}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)] border-b border-[var(--border)] mb-1">
            Chọn tiêu chí &amp; trường dữ liệu
          </div>
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "hover:bg-[var(--background)] text-[var(--text)]"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
                  {opt.fieldLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SortableTh({
  label,
  fieldHint,
  ascKey,
  descKey,
  currentSort,
  onSort,
  align = "left",
}: {
  label: string;
  fieldHint?: string;
  ascKey: string;
  descKey: string;
  currentSort: string;
  onSort: (nextKey: string) => void;
  align?: "left" | "right" | "center";
}) {
  const isAsc = currentSort === ascKey;
  const isDesc = currentSort === descKey;
  const next = isAsc ? descKey : ascKey;

  return (
    <th
      className={`px-3 py-2.5 font-semibold whitespace-nowrap ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(next)}
        title={fieldHint ? `Sắp xếp theo ${fieldHint}` : undefined}
        className="inline-flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
      >
        <span>{label}</span>
        <span className="text-[10px] text-[var(--muted)]">
          {isAsc ? "↑" : isDesc ? "↓" : "↕"}
        </span>
      </button>
    </th>
  );
}

/* ============================================================================
 * 7. FilterBar (Sticky 48px toolbar + smart suggestions + active filter chips)
 * ========================================================================== */

export interface SearchSuggestion {
  id: string;
  group: string;
  label: string;
  subLabel?: string;
  onSelect: () => void;
}

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export interface ColumnToggleOption {
  key: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  suggestions,
  filters,
  sortMenu,
  columns,
  chips = [],
  onClearAll,
  density,
  onToggleDensity,
  rightActions,
}: {
  search?: string;
  onSearchChange?: (next: string) => void;
  searchPlaceholder?: string;
  suggestions?: readonly SearchSuggestion[];
  filters?: ReactNode;
  sortMenu?: ReactNode;
  columns?: readonly ColumnToggleOption[];
  chips?: readonly FilterChip[];
  onClearAll?: () => void;
  density?: "normal" | "compact";
  onToggleDensity?: () => void;
  rightActions?: ReactNode;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: `/` focuses search unless typing in an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && onSearchChange) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        const editable = (e.target as HTMLElement | null)?.isContentEditable;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape") {
        setSuggestOpen(false);
        setColsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSearchChange]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
        setColsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const groupedSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const map = new Map<string, SearchSuggestion[]>();
    for (const s of suggestions) {
      map.set(s.group, [...(map.get(s.group) ?? []), s]);
    }
    return [...map.entries()];
  }, [suggestions]);

  return (
    <div ref={wrapRef} className="space-y-2.5 mb-6">
      <div className="card !p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {onSearchChange !== undefined && (
            <div className="relative flex-1 min-w-[210px] max-w-[340px]">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search ?? ""}
                onFocus={() => setSuggestOpen(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setSuggestOpen(true);
                }}
                placeholder={searchPlaceholder}
                className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] pl-8 pr-7 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                >
                  ×
                </button>
              ) : (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] px-1 text-[10px] text-[var(--muted)]">
                  /
                </span>
              )}

              {suggestOpen && search && groupedSuggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 z-50 w-80 max-w-[90vw] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl max-h-72 overflow-y-auto">
                  {groupedSuggestions.map(([group, list]) => (
                    <div key={group} className="mb-1 last:mb-0">
                      <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {group}
                      </div>
                      {list.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            s.onSelect();
                            setSuggestOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-[var(--background)]"
                        >
                          <span className="font-medium text-[var(--text)] truncate">
                            {s.label}
                          </span>
                          {s.subLabel && (
                            <span className="text-[11px] text-[var(--muted)] shrink-0">
                              {s.subLabel}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filters}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {sortMenu}

          {columns && columns.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColsOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 h-8 text-xs font-medium text-[var(--text)] hover:border-[var(--primary)]"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
                <span>Cột</span>
              </button>
              {colsOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl space-y-1">
                  <div className="text-[11px] font-semibold text-[var(--muted)] pb-1 border-b border-[var(--border)]">
                    Hiển thị cột
                  </div>
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs cursor-pointer hover:bg-[var(--background)]"
                    >
                      <input
                        type="checkbox"
                        checked={c.visible}
                        onChange={c.onToggle}
                        className="accent-emerald-600"
                      />
                      <span className="text-[var(--text)]">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {onToggleDensity && (
            <button
              type="button"
              onClick={onToggleDensity}
              title="Đổi mật độ hàng bảng (Thường / Gọn)"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 h-8 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
            >
              {density === "compact" ? "Mật độ: Gọn" : "Mật độ: Thường"}
            </button>
          )}

          {rightActions}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Bỏ ${chip.label}`}
                className="font-bold hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-[var(--muted)] hover:text-rose-600 px-1.5"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 8. MiniProgress (Single bar & Multi-segment stacked bar)
 * ========================================================================== */

export interface ProgressSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function MiniProgress({
  value,
  max,
  tone = "success",
  label,
  segments,
}: {
  value?: number;
  max: number;
  tone?: "success" | "warning" | "danger" | "info";
  label?: string;
  segments?: readonly ProgressSegment[];
}) {
  const safeMax = Math.max(1, max);
  const fillColor =
    tone === "danger"
      ? "bg-rose-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "info"
          ? "bg-sky-500"
          : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="h-1.5 flex-1 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden flex">
        {segments && segments.length > 0 ? (
          segments.map((seg) => {
            const pct = Math.min(100, Math.max(0, (seg.value / safeMax) * 100));
            if (pct <= 0) return null;
            return (
              <div
                key={seg.key}
                style={{ width: `${pct}%`, backgroundColor: seg.color }}
                title={`${seg.label}: ${seg.value.toLocaleString("vi-VN")}`}
                className="h-full transition-all"
              />
            );
          })
        ) : (
          <div
            style={{
              width: `${Math.min(100, Math.max(0, ((value ?? 0) / safeMax) * 100))}%`,
            }}
            className={`h-full rounded-full transition-all ${fillColor}`}
          />
        )}
      </div>
      {label && (
        <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}

/* ============================================================================
 * 9. EmptyState, ConfirmInline, HighlightText, KpiStrip, UndoToastBanner
 * ========================================================================== */

export function EmptyState({
  title,
  actionLabel,
  onAction,
  locked = false,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
        {locked ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
      </div>
      <p className="text-xs font-medium text-[var(--muted)] max-w-sm">{title}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 btn btn-secondary btn-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ConfirmInline({
  triggerLabel,
  confirmText = "Chắc chắn?",
  onConfirm,
  tone = "neutral",
  title,
  triggerClassName = "",
}: {
  triggerLabel: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  tone?: "neutral" | "danger" | "primary";
  title?: string;
  triggerClassName?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setArmed(true);
        }}
        className={
          triggerClassName ||
          `inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium transition-colors ${
            tone === "danger"
              ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              : tone === "primary"
                ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--background)]"
          }`
        }
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <span
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 px-2 py-0.5 text-[11px]"
    >
      <span className="font-semibold text-amber-800 dark:text-amber-200">
        {confirmText}
      </span>
      <button
        type="button"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        className="rounded px-1.5 py-0.5 font-bold bg-emerald-600 text-white hover:bg-emerald-700"
      >
        Có
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded px-1.5 py-0.5 font-medium text-[var(--muted)] hover:text-[var(--text)]"
      >
        Không
      </button>
    </span>
  );
}

export function HighlightText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const normText = normalizeVi(text);
  const normQ = normalizeVi(q);
  const idx = normText.indexOf(normQ);
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="rounded bg-amber-200/70 dark:bg-amber-700/60 px-0.5 text-inherit">
        {match}
      </mark>
      {after}
    </>
  );
}

export interface KpiStripItem {
  key: string;
  label: string;
  value: string;
  subLabel?: string;
  icon?: KpiIconKind;
  tone?: StatTone;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  valueTone?: "default" | "success" | "warning" | "danger";
  active?: boolean;
  onClick?: () => void;
  info?: {
    summary: string;
    details?: readonly { label: string; value: string }[];
  };
}

const KPI_ICON_BG: Record<StatTone, string> = {
  primary: "icon-bg-primary",
  success: "icon-bg-success",
  warning: "icon-bg-warning",
  danger: "icon-bg-danger",
  info: "icon-bg-info",
  purple: "icon-bg-purple",
};

function defaultToneFromValueTone(
  valueTone?: KpiStripItem["valueTone"],
): StatTone {
  if (valueTone === "danger") return "danger";
  if (valueTone === "warning") return "warning";
  if (valueTone === "success") return "success";
  return "primary";
}

function defaultIconFromTone(tone: StatTone): KpiIconKind {
  if (tone === "danger" || tone === "warning") return "warning";
  if (tone === "success") return "document-check";
  if (tone === "info") return "clock";
  return "box";
}

export function KpiStrip({ items }: { items: readonly KpiStripItem[] }) {
  const gridCols =
    items.length <= 3
      ? "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      : items.length === 4
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6";

  return (
    <section className={gridCols} aria-label="Chỉ số tổng quan">
      {items.map((item) => {
        const tone = item.tone ?? defaultToneFromValueTone(item.valueTone);
        const iconKind = item.icon ?? defaultIconFromTone(tone);
        const valColorClass =
          item.valueTone === "danger"
            ? "!text-rose-600 dark:!text-rose-400"
            : item.valueTone === "warning"
              ? "!text-amber-600 dark:!text-amber-400"
              : item.valueTone === "success"
                ? "!text-emerald-600 dark:!text-emerald-400"
                : "";
        const trendClass =
          item.deltaTone === "up"
            ? "trend-up"
            : item.deltaTone === "down"
              ? "trend-down"
              : "";
        const subText =
          item.delta && item.subLabel
            ? `${item.delta} · ${item.subLabel}`
            : item.delta || item.subLabel;

        return (
          <div
            key={item.key}
            role={item.onClick ? "button" : undefined}
            tabIndex={item.onClick ? 0 : undefined}
            onClick={item.onClick}
            onKeyDown={
              item.onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      item.onClick?.();
                    }
                  }
                : undefined
            }
            style={
              item.active
                ? {
                    borderColor: "var(--primary)",
                    boxShadow: "0 0 0 1px var(--primary)",
                  }
                : undefined
            }
            className={`stat-card text-left ${item.onClick ? "cursor-pointer" : ""}`}
          >
            <div
              className={`stat-card-icon ${KPI_ICON_BG[tone]}`}
              aria-hidden="true"
            >
              <KpiIcon kind={iconKind} />
            </div>

            <div className="stat-card-body">
              <div className="flex items-center justify-between gap-1.5">
                <div className="stat-label truncate">{item.label}</div>
                {item.info && (
                  <span
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <InfoTip
                      title={item.label}
                      summary={item.info.summary}
                      details={item.info.details}
                    />
                  </span>
                )}
              </div>
              <div className={`stat-value tabular-nums ${valColorClass}`}>
                {item.value}
              </div>
              {subText && (
                <div className={`stat-sub-label ${trendClass}`}>{subText}</div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function UndoBanner({
  message,
  onUndo,
  onDismiss,
}: {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-slate-900 text-white px-4 py-2.5 text-xs shadow-2xl animate-fadeIn"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-bold text-emerald-400 hover:underline"
      >
        Hoàn tác
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng"
        className="text-slate-400 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
