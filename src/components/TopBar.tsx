import type { AppTheme } from "../types";

type TopBarProps = {
  title: string;
  onImport: () => void;
  currentTheme: AppTheme;
  isAppearanceOpen: boolean;
  onAppearanceToggle: () => void;
  onThemeChange: (theme: AppTheme) => void;
};

const themes: Array<{
  name: AppTheme;
  description: string;
}> = [
  { name: "Calm Study", description: "Clean academic workspace" },
  { name: "Midnight Focus", description: "Dark study mode" },
  { name: "Paper Notes", description: "Digital notebook feel" },
  { name: "Ocean Blue", description: "Modern technology palette" },
  { name: "Reading Mode", description: "Warm eye-comfort palette" },
];

export function TopBar({
  title,
  onImport,
  currentTheme,
  isAppearanceOpen,
  onAppearanceToggle,
  onThemeChange,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <small>Import notes, generate cards, then study offline.</small>
      </div>
      <div className="topbar-actions">
        <button className="icon-button" aria-label="Search" type="button">
          Search
        </button>
        <div className="appearance-menu">
          <button
            className="icon-button"
            aria-expanded={isAppearanceOpen}
            aria-haspopup="menu"
            onClick={onAppearanceToggle}
            type="button"
          >
            Appearance
          </button>
          {isAppearanceOpen ? (
            <div className="appearance-dropdown" role="menu">
              {themes.map((theme) => (
                <button
                  className={theme.name === currentTheme ? "selected" : ""}
                  key={theme.name}
                  onClick={() => onThemeChange(theme.name)}
                  role="menuitem"
                  type="button"
                >
                  <span>{theme.name}</span>
                  <small>{theme.description}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button className="primary-button" onClick={onImport} type="button">
          + Import File
        </button>
        <button className="icon-button" aria-label="Settings" type="button">
          Settings
        </button>
      </div>
    </header>
  );
}
