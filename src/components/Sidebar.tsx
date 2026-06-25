import type { AppPage } from "../types";
import cardSmithMark from "../assets/cardsmith-mark.png";

type SidebarProps = {
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  onStartReview: () => void;
  savedCount: number;
};

const navGroups: Array<{ label: AppPage; icon: string }> = [
  { label: "Library", icon: "\u{1F4DA}" },
  { label: "Sources", icon: "\u{1F4C4}" },
  { label: "Cards", icon: "\u{1F0CF}" },
  { label: "Review", icon: "\u{1F3AF}" },
  { label: "Progress", icon: "\u{1F4CA}" },
];

export function Sidebar({
  currentPage,
  onPageChange,
  onStartReview,
  savedCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark image-mark">
          <img src={cardSmithMark} alt="" />
        </span>
        <div>
          <strong>CardSmith</strong>
          <small>Local study workspace</small>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navGroups.map((group) => (
          <button
            className={group.label === currentPage ? "nav-group active" : "nav-group"}
            key={group.label}
            onClick={() => onPageChange(group.label)}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              {group.icon}
            </span>
            <span>{group.label}</span>
          </button>
        ))}
      </nav>

      {currentPage === "Library" ? (
        <section className="today-card">
          <span>Today</span>
          <small>Reviews Due</small>
          <strong>{Math.max(savedCount, 12)}</strong>
          <button className="primary-button" onClick={onStartReview} type="button">
            Start Review
          </button>
        </section>
      ) : null}

      <div className="storage-card">
        <strong>Local storage active</strong>
        <small>Your data stays on this device</small>
      </div>
    </aside>
  );
}
