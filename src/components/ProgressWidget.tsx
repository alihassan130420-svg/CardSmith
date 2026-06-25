type ProgressWidgetProps = {
  sourceCount: number;
  draftCount: number;
  savedCount: number;
};

export function ProgressWidget({
  sourceCount,
  draftCount,
  savedCount,
}: ProgressWidgetProps) {
  const mastered = Math.min(savedCount, Math.max(0, savedCount - 1));

  return (
    <section className="progress-grid">
      <article className="panel stat-card">
        <span>Sources</span>
        <strong>{sourceCount}</strong>
      </article>
      <article className="panel stat-card">
        <span>Draft cards</span>
        <strong>{draftCount}</strong>
      </article>
      <article className="panel stat-card">
        <span>Saved cards</span>
        <strong>{savedCount}</strong>
      </article>
      <article className="panel stat-card">
        <span>Mastered</span>
        <strong>{mastered}</strong>
      </article>
    </section>
  );
}
