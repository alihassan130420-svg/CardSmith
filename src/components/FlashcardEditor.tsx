import type { Flashcard } from "../types";

type FlashcardEditorProps = {
  card: Flashcard | null;
  currentIndex: number;
  total: number;
  sourcePreview: string;
  onChange: (field: "question" | "answer", value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onSave: () => void;
  onReject: () => void;
};

export function FlashcardEditor({
  card,
  currentIndex,
  total,
  sourcePreview,
  onChange,
  onMove,
  onSave,
  onReject,
}: FlashcardEditorProps) {
  if (!card) {
    return (
      <section className="panel muted-panel">
        <div className="section-label">Draft Cards</div>
        <p>No flashcards created yet.</p>
      </section>
    );
  }

  return (
    <section className="generate-grid">
      <article className="panel source-preview">
        <div className="section-label">Source Text</div>
        <p>{sourcePreview}</p>
      </article>

      <article className="panel editor-panel">
        <div className="panel-title-row">
          <div>
            <div className="section-label">Draft Cards</div>
            <h2>{total} generated</h2>
          </div>
          <span>
            {currentIndex + 1} / {total}
          </span>
        </div>

        <label className="edit-field">
          Question
          <textarea
            value={card.question}
            onChange={(event) => onChange("question", event.currentTarget.value)}
          />
        </label>

        <label className="edit-field">
          Answer
          <textarea
            value={card.answer}
            onChange={(event) => onChange("answer", event.currentTarget.value)}
          />
        </label>

        <div className="metadata-row">
          {card.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
          <small>{card.source}</small>
        </div>

        <div className="button-row">
          <button className="danger-button" onClick={onReject} type="button">
            Reject
          </button>
          <button className="secondary-button" onClick={() => onMove(-1)} type="button">
            Previous
          </button>
          <button className="secondary-button" onClick={() => onMove(1)} type="button">
            Next
          </button>
          <button className="primary-button" onClick={onSave} type="button">
            Save Card
          </button>
        </div>
      </article>
    </section>
  );
}
