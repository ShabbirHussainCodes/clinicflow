"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { addDays, formatCalendarDate, weekdayOf } from "@/lib/datetime";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function firstOfMonth(key: string): string {
  return `${key}-01`;
}

function shiftMonth(key: string, delta: number): string {
  const [y = "1970", m = "1"] = key.split("-");
  const total = Number(y) * 12 + (Number(m) - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function monthTitle(key: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${firstOfMonth(key)}T00:00:00Z`));
}

/** Weeks (Monday-first) for the month, as arrays of 7 date strings or null for padding. */
function buildWeeks(key: string): (string | null)[][] {
  const first = firstOfMonth(key);
  const offset = (weekdayOf(first) + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  let cursor = first;
  while (monthKey(cursor) === key) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Accessible month calendar. Follows the ARIA grid pattern: one tab stop, arrow keys move between
 * days, PageUp/PageDown change month, Enter/Space select. Days without free slots stay focusable
 * (aria-disabled) so keyboard users can move across them, but cannot be selected.
 */
export function Calendar({
  today,
  lastDate,
  availability,
  selected,
  onSelect,
  loading,
}: {
  today: string;
  lastDate: string;
  availability: ReadonlyMap<string, number>;
  selected: string | null;
  onSelect: (date: string) => void;
  loading: boolean;
}) {
  const initialFocus = selected ?? [...availability.keys()].sort()[0] ?? today;
  const [focusDate, setFocusDate] = useState(initialFocus);
  const [viewKey, setViewKey] = useState(monthKey(initialFocus));
  const gridRef = useRef<HTMLTableElement>(null);
  const shouldMoveFocus = useRef(false);

  const firstKey = monthKey(today);
  const lastKey = monthKey(lastDate);
  const weeks = useMemo(() => buildWeeks(viewKey), [viewKey]);

  useEffect(() => {
    if (!shouldMoveFocus.current) return;
    shouldMoveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, viewKey]);

  function moveFocus(next: string) {
    const clamped = next < today ? today : next > lastDate ? lastDate : next;
    shouldMoveFocus.current = true;
    setFocusDate(clamped);
    setViewKey(monthKey(clamped));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      Home: () => addDays(focusDate, -((weekdayOf(focusDate) + 6) % 7)),
      End: () => addDays(focusDate, 6 - ((weekdayOf(focusDate) + 6) % 7)),
      PageUp: () =>
        addDays(
          firstOfMonth(shiftMonth(monthKey(focusDate), -1)),
          Math.min(Number(focusDate.slice(8)) - 1, 27),
        ),
      PageDown: () =>
        addDays(
          firstOfMonth(shiftMonth(monthKey(focusDate), 1)),
          Math.min(Number(focusDate.slice(8)) - 1, 27),
        ),
    };
    const handler = keys[event.key];
    if (!handler) return;
    event.preventDefault();
    moveFocus(handler());
  }

  return (
    <div
      className="rounded-md border border-sand-200 bg-surface p-4 sm:p-5"
      aria-busy={loading || undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewKey(shiftMonth(viewKey, -1))}
          disabled={viewKey <= firstKey}
          aria-label="Previous month"
          className="flex size-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-sand-100 disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h3 className="font-sans text-base font-semibold tracking-normal" aria-live="polite">
          {monthTitle(viewKey)}
        </h3>
        <button
          type="button"
          onClick={() => setViewKey(shiftMonth(viewKey, 1))}
          disabled={viewKey >= lastKey}
          aria-label="Next month"
          className="flex size-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-sand-100 disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-label={`Choose a date, ${monthTitle(viewKey)}`}
        onKeyDown={onKeyDown}
        className="w-full table-fixed border-separate border-spacing-y-1"
      >
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((day) => (
              <th
                key={day}
                scope="col"
                className="pb-1 text-center text-xs font-semibold text-ink-500"
              >
                <abbr title={day} className="no-underline">
                  {day}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((date, dayIndex) => {
                if (!date) return <td key={`pad-${dayIndex}`} />;
                const inWindow = date >= today && date <= lastDate;
                const count = availability.get(date) ?? 0;
                const available = inWindow && count > 0;
                const isSelected = selected === date;
                const isFocusStop = focusDate === date;
                return (
                  <td
                    key={date}
                    role="gridcell"
                    aria-selected={isSelected}
                    className="p-0 text-center"
                  >
                    <button
                      type="button"
                      data-date={date}
                      tabIndex={isFocusStop ? 0 : -1}
                      aria-disabled={!available}
                      aria-pressed={isSelected}
                      aria-label={`${formatCalendarDate(date, "long")}, ${
                        available
                          ? `${count} time${count === 1 ? "" : "s"} available`
                          : inWindow
                            ? "no times available"
                            : "not available"
                      }`}
                      onClick={() => {
                        setFocusDate(date);
                        if (available) onSelect(date);
                      }}
                      className={cn(
                        "relative mx-auto flex size-10 items-center justify-center rounded-full text-[0.9375rem] font-medium transition-colors sm:size-11",
                        available && !isSelected && "bg-brand-50 text-brand-800 hover:bg-brand-100",
                        available && isSelected && "bg-brand-700 text-white shadow-sm",
                        !available && "cursor-default text-ink-500",
                        date === today && !isSelected && "ring-1 ring-inset ring-ink-400",
                      )}
                    >
                      {Number(date.slice(8))}
                      {available && !isSelected ? (
                        <span
                          className="absolute bottom-1 size-1 rounded-full bg-brand-500"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-brand-100" aria-hidden="true" /> Times available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-full bg-sand-100 ring-1 ring-sand-300"
            aria-hidden="true"
          />{" "}
          Unavailable
        </span>
      </p>
    </div>
  );
}
