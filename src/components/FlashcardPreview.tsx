import type { Flashcard } from "../types";

type FlashcardPreviewProps = {
  card: Flashcard | null;
  answerVisible: boolean;
  onToggleAnswer: () => void;
};

export function FlashcardPreview({
  card,
  answerVisible,
  onToggleAnswer,
}: FlashcardPreviewProps) {
  return (
    <article className="panel preview-panel">
      <div className="section-label">Flashcard Preview</div>
      <div className="study-card">
        <small>Question</small>
        <h2>{card?.question ?? "Generate a card to preview study mode."}</h2>
        {answerVisible && card ? (
          <p>{card.answer}</p>
        ) : (
          <div className="answer-placeholder">Answer hidden</div>
        )}
        <button
          className="primary-button"
          disabled={!card}
          onClick={onToggleAnswer}
          type="button"
        >
          {answerVisible ? "Hide Answer" : "Reveal Answer"}
        </button>
      </div>
      {answerVisible && card ? (
        <div className="rating-row">
          <button type="button">Again</button>
          <button type="button">Hard</button>
          <button type="button">Good</button>
          <button type="button">Easy</button>
        </div>
      ) : null}
    </article>
  );
}
