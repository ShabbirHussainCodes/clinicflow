export interface Fact {
  value: string;
  label: string;
}

/** A quiet row of facts about the clinic, all computed from the clinic's own data. */
export function FactsRow({ facts }: { facts: Fact[] }) {
  return (
    <ul
      aria-label="The clinic at a glance"
      className="container-page grid grid-cols-2 gap-x-6 gap-y-8 py-9 lg:grid-cols-4 lg:gap-0"
    >
      {facts.map((fact) => (
        <li
          key={fact.label}
          className="lg:border-l lg:border-sand-200 lg:pl-8 lg:first:border-l-0 lg:first:pl-0"
        >
          <p className="font-display text-[2.25rem] font-medium leading-none tabular-nums text-ink-900">
            {fact.value}
          </p>
          <p className="mt-2.5 max-w-[12rem] text-sm leading-snug text-ink-500">{fact.label}</p>
        </li>
      ))}
    </ul>
  );
}
