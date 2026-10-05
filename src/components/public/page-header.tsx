/** The title band at the top of inner pages: a label, the page title and one plain sentence. */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="border-b border-sand-200 bg-sand-50">
      <div className="container-page py-12 sm:py-16">
        <p className="eyebrow eyebrow-rule mb-5">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-[1.1875rem] leading-relaxed text-ink-700">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
