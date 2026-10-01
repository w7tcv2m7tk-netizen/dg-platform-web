export function OperatorCategoryHeader({
  eyebrow = "Operator",
  title,
  question,
}: {
  eyebrow?: string;
  title: string;
  question?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div>
      <p className="dg-page-eyebrow">{eyebrow}</p>
      <h1 className="dg-app-page-title">{title}</h1>
      {question ? <p className="dg-page-description">{question}</p> : null}
    </div>
  );
}
