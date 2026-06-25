import type { AppPage } from "../types";
import cardSmithMark from "../assets/cardsmith-mark.png";

type SidebarProps = {
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  sourceCount: number;
  draftCount: number;
  savedCount: number;
};

const navGroups: AppPage[] = [
  "Library",
  "Sources",
  "Cards",
  "Review",
  "Progress",
  "Settings",
];

export function Sidebar({
  currentPage,
  onPageChange,
  sourceCount,
  draftCount,
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
            className={group === currentPage ? "nav-group active" : "nav-group"}
            key={group}
            onClick={() => onPageChange(group)}
            type="button"
          >
            <span>{group}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-stats">
        <div>
          <span>Sources</span>
          <strong>{sourceCount}</strong>
        </div>
        <div>
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </div>
        <div>
          <span>Saved</span>
          <strong>{savedCount}</strong>
        </div>
      </div>

      <div className="storage-card">
        <strong>Local storage active</strong>
        <small>Your data stays on this device</small>
      </div>
    </aside>
  );
}
