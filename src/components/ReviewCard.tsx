import type { Flashcard } from "../types";

type ReviewCardProps = {
  card: Flashcard | null;
  currentIndex: number;
  totalCards: number;
  completePercent: number;
  answerVisible: boolean;
  onToggleAnswer: () => void;
  onNext: () => void;
};

export function ReviewCard({
  card,
  currentIndex,
  totalCards,
  completePercent,
  answerVisible,
  onToggleAnswer,
  onNext,
}: ReviewCardProps) {
  if (!card) {
    return (
      <section className="review-screen">
        <div className="empty-state compact">
          <h2>No cards due today</h2>
          <p>Great job. Save some cards to start a review session.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="review-screen">
      <div className="review-header">
        <div>
          <span>Source</span>
          <strong>{card.source}</strong>
        </div>
        <div>
          <span>Total Cards</span>
          <strong>
            {currentIndex} of {totalCards}
          </strong>
        </div>
      </div>

      <article className="review-card">
        <small>Question</small>
        <h2>{card.question}</h2>
        {answerVisible ? <p>{card.answer}</p> : null}
        <button className="primary-button" onClick={onToggleAnswer} type="button">
          {answerVisible ? "Hide Answer" : "Reveal Answer"}
        </button>
      </article>

      {answerVisible ? (
        <div className="difficulty-row">
          {["Again", "Hard", "Good", "Easy"].map((rating) => (
            <button key={rating} onClick={onNext} type="button">
              {rating}
            </button>
          ))}
        </div>
      ) : null}

      <div className="progress-bar" aria-label={`${completePercent}% complete`}>
        <span style={{ width: `${completePercent}%` }} />
      </div>
    </section>
  );
}
