import { formatCalendarDate } from "@/lib/datetime";

interface DayPoint {
  date: string;
  active: number;
  cancelled: number;
}

/**
 * Stacked daily bars: confirmed/pending/completed visits in teal, cancelled and no-shows in clay.
 * Rendered as SVG with a visually hidden table so the numbers are available to screen readers.
 */
export function DailyBarChart({ days, today }: { days: DayPoint[]; today: string }) {
  const width = 400;
  const height = 200;
  const padding = { top: 14, right: 8, bottom: 40, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(4, ...days.map((day) => day.active + day.cancelled));
  const step = innerWidth / Math.max(days.length, 1);
  const barWidth = Math.min(20, step * 0.64);
  const ticks = [0, Math.ceil(maxValue / 2), maxValue];

  const summary = days
    .map(
      (day) =>
        `${formatCalendarDate(day.date, "month-day")}: ${day.active} visits, ${day.cancelled} cancelled or no-show`,
    )
    .join("; ");

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Appointments per day. ${summary}`}
        focusable="false"
      >
        {ticks.map((tick) => {
          const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e1d9cb"
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#566e6b">
                {tick}
              </text>
            </g>
          );
        })}
        {days.map((day, index) => {
          const x = padding.left + index * step + (step - barWidth) / 2;
          const activeHeight = (day.active / maxValue) * innerHeight;
          const cancelledHeight = (day.cancelled / maxValue) * innerHeight;
          const baseY = padding.top + innerHeight;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          return (
            <g key={day.date}>
              <rect
                x={x}
                y={baseY - activeHeight}
                width={barWidth}
                height={activeHeight}
                rx="4"
                className={isFuture ? "fill-brand-400" : "fill-brand-600"}
                opacity={isFuture ? 0.8 : 1}
              />
              {cancelledHeight > 0 ? (
                <rect
                  x={x}
                  y={baseY - activeHeight - cancelledHeight}
                  width={barWidth}
                  height={cancelledHeight}
                  rx="4"
                  fill="#e9b995"
                />
              ) : null}
              <text
                x={x + barWidth / 2}
                y={height - 22}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isToday ? 700 : 500}
                className={isToday ? "fill-brand-700" : "fill-ink-500"}
              >
                {formatCalendarDate(day.date, "weekday-short").slice(0, 3)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isToday ? 700 : 400}
                className={isToday ? "fill-brand-700" : "fill-ink-500"}
              >
                {Number(day.date.slice(8))}
              </text>
              {isToday ? (
                <rect
                  x={x - 3}
                  y={height - 36}
                  width={barWidth + 6}
                  height={2.5}
                  rx="1"
                  className="fill-brand-700"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-xs bg-brand-600" aria-hidden="true" /> Visits (past)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-xs bg-brand-400" aria-hidden="true" /> Booked (upcoming)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-3 rounded-xs bg-clay-100 ring-1 ring-clay-500/40"
            aria-hidden="true"
          />{" "}
          Cancelled / no-show
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Appointments per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Visits</th>
            <th scope="col">Cancelled or no-show</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatCalendarDate(day.date)}</th>
              <td>{day.active}</td>
              <td>{day.cancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function HorizontalBars({
  items,
  emptyLabel,
}: {
  items: { name: string; total: number }[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <p className="text-sm text-ink-500">{emptyLabel}</p>;
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink-900">{item.name}</span>
            <span className="shrink-0 font-semibold text-ink-700">{item.total}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-100" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${(item.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
