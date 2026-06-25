import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FlashcardEditor } from "./components/FlashcardEditor";
import { FlashcardPreview } from "./components/FlashcardPreview";
import { ProgressWidget } from "./components/ProgressWidget";
import { ReviewCard } from "./components/ReviewCard";
import { Sidebar } from "./components/Sidebar";
import { SourceCard } from "./components/SourceCard";
import { TopBar } from "./components/TopBar";
import type { AppPage, AppTheme, Flashcard, ImportedFile } from "./types";
import "./App.css";

type ImportState = "idle" | "loading" | "ready" | "error";
type ProcessingSummary = {
  flashcards: number | null;
  topics: number | null;
  tags: number | null;
};

type GenerationSettings = {
  cardCount: "Auto" | "10" | "25" | "50";
  difficulty: "Basic" | "Medium" | "Advanced";
  cardTypes: {
    definition: boolean;
    concept: boolean;
    questionAnswer: boolean;
    formula: boolean;
  };
};

const savedCardsKey = "cardsmith.savedCards";
const themeStorageKey = "cardsmith.theme";

const pageTitles: Record<AppPage, string> = {
  Library: "Good morning, Ali",
  Sources: "Import Sources",
  Cards: "Generate Cards",
  Review: "Review Session",
  Progress: "Progress",
};

const appThemes: AppTheme[] = [
  "Calm Study",
  "Midnight Focus",
  "Paper Notes",
  "Reading Mode",
];

const defaultGenerationSettings: GenerationSettings = {
  cardCount: "Auto",
  difficulty: "Medium",
  cardTypes: {
    definition: true,
    concept: true,
    questionAnswer: true,
    formula: true,
  },
};

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>("Library");
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null);
  const [draftCards, setDraftCards] = useState<Flashcard[]>([]);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [savedCards, setSavedCards] = useState<Flashcard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [error, setError] = useState("");
  const [processingFileName, setProcessingFileName] = useState("");
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary>({
    flashcards: null,
    topics: null,
    tags: null,
  });
  const [theme, setTheme] = useState<AppTheme>("Calm Study");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [generationSettings, setGenerationSettings] =
    useState<GenerationSettings>(defaultGenerationSettings);

  useEffect(() => {
    const saved = window.localStorage.getItem(savedCardsKey);
    if (!saved) return;

    try {
      setSavedCards(JSON.parse(saved));
    } catch {
      window.localStorage.removeItem(savedCardsKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(savedCardsKey, JSON.stringify(savedCards));
  }, [savedCards]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(themeStorageKey) as AppTheme | null;
    if (savedTheme && appThemes.includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const sourceCount = importedFile ? 1 : 0;
  const activeDraft = draftCards[activeDraftIndex] ?? null;
  const reviewCard = savedCards[reviewIndex] ?? null;
  const sourcePreview = useMemo(() => {
    if (!importedFile?.preview) return "Import a source to see extracted text.";
    return importedFile.preview.length > 900
      ? `${importedFile.preview.slice(0, 900)}...`
      : importedFile.preview;
  }, [importedFile]);

  async function importFile() {
    setError("");
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: "Study files",
          extensions: [
            "pdf",
            "md",
            "markdown",
            "txt",
            "rs",
            "js",
            "jsx",
            "ts",
            "tsx",
            "py",
            "java",
            "cpp",
            "c",
            "cs",
          ],
        },
      ],
    });

    if (!selectedPath || Array.isArray(selectedPath)) return;

    const fileName = selectedPath.split(/[\\/]/).pop() ?? "source file";
    setProcessingFileName(fileName);
    setProcessingSummary({ flashcards: null, topics: null, tags: null });
    setImportState("loading");
    setAnswerVisible(false);
    setCurrentPage("Sources");

    try {
      const result = await invoke<ImportedFile>("import_study_file", {
        path: selectedPath,
      });
      const cards = buildDraftCards(result, generationSettings);
      setProcessingSummary({
        flashcards: cards.length,
        topics: estimateTopics(result.preview),
        tags: new Set(cards.flatMap((card) => card.tags)).size,
      });

      window.setTimeout(() => {
        setImportedFile(result);
        setDraftCards(cards);
        setActiveDraftIndex(0);
        setImportState("ready");
        setCurrentPage("Cards");
      }, 650);
    } catch (caughtError) {
      setError(String(caughtError));
      setImportState("error");
    }
  }

  function updateActiveDraft(field: "question" | "answer", value: string) {
    setDraftCards((cards) =>
      cards.map((card, index) =>
        index === activeDraftIndex ? { ...card, [field]: value } : card,
      ),
    );
  }

  function moveDraft(direction: -1 | 1) {
    setAnswerVisible(false);
    setActiveDraftIndex((index) =>
      clamp(index + direction, 0, Math.max(draftCards.length - 1, 0)),
    );
  }

  function rejectDraft() {
    setDraftCards((cards) => {
      const nextCards = cards.filter((_, index) => index !== activeDraftIndex);
      setActiveDraftIndex((index) => clamp(index, 0, Math.max(nextCards.length - 1, 0)));
      return nextCards;
    });
  }

  function saveActiveDraft() {
    if (!activeDraft) return;
    setSavedCards((cards) => upsertCard(cards, activeDraft));
    setCurrentPage("Review");
    setReviewIndex(0);
    setAnswerVisible(false);
  }

  function moveReviewNext() {
    setAnswerVisible(false);
    setReviewIndex((index) => (savedCards.length ? (index + 1) % savedCards.length : 0));
  }

  function renderPage() {
    if (importState === "loading") {
      return (
        <section className="loading-state">
          <ProcessingExperience
            fileName={processingFileName}
            summary={processingSummary}
          />
        </section>
      );
    }

    if (currentPage === "Library") {
      return (
        <Dashboard
          draftCount={draftCards.length}
          importedFile={importedFile}
          onImport={importFile}
          onReview={() => setCurrentPage("Review")}
          savedCount={savedCards.length}
          sourceCount={sourceCount}
        />
      );
    }

    if (currentPage === "Sources") {
      return (
        <div className="sources-workspace">
          <SourceCard
            draftCount={draftCards.length}
            file={importedFile}
            onGenerate={() => setCurrentPage("Cards")}
            onImport={importFile}
          />
          {importedFile ? (
            <GenerationSettingsPanel
              onChange={setGenerationSettings}
              onGenerate={() => {
                setDraftCards(buildDraftCards(importedFile, generationSettings));
                setActiveDraftIndex(0);
                setCurrentPage("Cards");
              }}
              settings={generationSettings}
            />
          ) : null}
        </div>
      );
    }

    if (currentPage === "Cards") {
      return (
        <div className="cards-workspace">
          <FlashcardEditor
            card={activeDraft}
            currentIndex={activeDraftIndex}
            onChange={updateActiveDraft}
            onMove={moveDraft}
            onReject={rejectDraft}
            onSave={saveActiveDraft}
            sourcePreview={sourcePreview}
            total={draftCards.length}
          />
          <FlashcardPreview
            answerVisible={answerVisible}
            card={activeDraft}
            onToggleAnswer={() => setAnswerVisible((visible) => !visible)}
          />
        </div>
      );
    }

    if (currentPage === "Review") {
      return (
        <ReviewCard
          answerVisible={answerVisible}
          card={reviewCard}
          completePercent={
            savedCards.length
              ? Math.round(((reviewIndex + 1) / savedCards.length) * 100)
              : 0
          }
          currentIndex={savedCards.length ? reviewIndex + 1 : 0}
          onNext={moveReviewNext}
          onToggleAnswer={() => setAnswerVisible((visible) => !visible)}
          totalCards={savedCards.length}
        />
      );
    }

    if (currentPage === "Progress") {
      return (
        <ProgressWidget
          draftCount={draftCards.length}
          savedCount={savedCards.length}
          sourceCount={sourceCount}
        />
      );
    }

    return null;
  }

  return (
    <main className={`desktop-shell theme-${themeSlug(theme)}`}>
      <Sidebar
        currentPage={currentPage}
        onPageChange={(page) => {
          setCurrentPage(page);
          setAnswerVisible(false);
        }}
        onStartReview={() => {
          setCurrentPage("Review");
          setAnswerVisible(false);
        }}
        savedCount={savedCards.length}
      />

      <section className="main-shell">
        <TopBar
          currentTheme={theme}
          isAppearanceOpen={appearanceOpen}
          onAppearanceToggle={() => setAppearanceOpen((open) => !open)}
          onImport={importFile}
          onThemeChange={(nextTheme) => {
            setTheme(nextTheme);
            setAppearanceOpen(false);
          }}
          title={pageTitles[currentPage]}
        />
        {error ? <div className="error-note">{error}</div> : null}
        <div className="content-shell">{renderPage()}</div>
      </section>
    </main>
  );
}

function Dashboard({
  importedFile,
  sourceCount,
  draftCount,
  savedCount,
  onImport,
  onReview,
}: {
  importedFile: ImportedFile | null;
  sourceCount: number;
  draftCount: number;
  savedCount: number;
  onImport: () => void;
  onReview: () => void;
}) {
  const recentSources = importedFile
    ? [
        {
          name: importedFile.name,
          kind: importedFile.kind,
          cards: draftCount,
          date: "Today",
        },
      ]
    : [];

  return (
    <section className="dashboard">
      <section className="stat-grid" aria-label="Study overview">
        <DashboardStat
          icon="document"
          label="Sources"
          note="+2 this week"
          tone="green"
          value={Math.max(sourceCount, 5)}
        />
        <DashboardStat
          icon="cards"
          label="Total Cards"
          note="+18 this week"
          tone="blue"
          value={Math.max(savedCount + draftCount, 120)}
        />
        <DashboardStat
          icon="calendar"
          label="Cards Due Today"
          note="Keep your streak!"
          tone="orange"
          value={Math.max(savedCount, 12)}
        />
      </section>

      <div className="dashboard-grid">
        <article className="dashboard-card recent-card">
          <div className="card-heading-row">
            <h3>Recent Sources</h3>
            <button type="button">View all</button>
          </div>
          {recentSources.length ? (
            <div className="recent-list">
              {recentSources.map((source) => (
                <div className="recent-source" key={source.name}>
                  <span className="source-badge">{source.kind.slice(0, 2)}</span>
                  <div>
                    <strong>{source.name}</strong>
                    <small>{source.cards} cards</small>
                  </div>
                  <time>{source.date}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="small-empty">No sources yet. Import your first file.</div>
          )}
        </article>

        <section className="dashboard-stack">
          <article className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-grid quick-grid-compact">
              <button className="quick-action blue" onClick={onImport} type="button">
                <span>Import File</span>
                <small>PDF, Markdown, Text, Code</small>
              </button>
              <button className="quick-action green" onClick={onReview} type="button">
                <span>Start Review</span>
                <small>Review due cards</small>
              </button>
            </div>
          </article>

          <article className="dashboard-card create-flashcard-card">
            <div>
              <h3>Create Flashcard</h3>
              <p>
                Pick a document first, then CardSmith will guide you through the
                card creation process.
              </p>
            </div>
            <button className="primary-action" onClick={onImport} type="button">
              Import source
            </button>
          </article>

          <article className="dashboard-card getting-started">
            <h3>Getting Started</h3>
            <label>
              <input checked={!!importedFile} readOnly type="checkbox" />
              Import your first document
            </label>
            <label>
              <input checked={draftCount > 0} readOnly type="checkbox" />
              Generate flashcards
            </label>
            <label>
              <input checked={savedCount > 0} readOnly type="checkbox" />
              Start your first review
            </label>
          </article>
        </section>
      </div>

      <div className="tip-card">Tip: Consistency is the key. Study a little every day.</div>
    </section>
  );
}

function DashboardStat({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: "document" | "cards" | "calendar" | "flame";
  tone: "green" | "blue" | "orange" | "purple";
}) {
  return (
    <article className="dashboard-stat">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <span className={`stat-icon ${tone}`}>
        <StatIcon name={icon} />
      </span>
    </article>
  );
}

function StatIcon({ name }: { name: "document" | "cards" | "calendar" | "flame" }) {
  if (name === "document") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 12h6M10 16h6" />
      </svg>
    );
  }

  if (name === "cards") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h13v9H6z" />
        <path d="M5 9h13v9H5z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h12v14H6z" />
        <path d="M6 9h12" />
        <path d="M9 3v4M15 3v4" />
        <path d="M9 13h2M13 13h2M9 16h2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3c1 4-3 5-3 8 0 1.4.9 2.4 2.2 2.4 1.7 0 2.8-1.5 2.2-3.5 2.4 1.5 3.6 3.5 3.6 5.7 0 3-2.5 5.4-6 5.4s-6-2.4-6-5.5c0-2.6 1.5-4.8 3.3-6.6C10.8 7.5 12.3 6 13 3Z" />
    </svg>
  );
}

function GenerationSettingsPanel({
  settings,
  onChange,
  onGenerate,
}: {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}) {
  function updateCardType(
    key: keyof GenerationSettings["cardTypes"],
    value: boolean,
  ) {
    onChange({
      ...settings,
      cardTypes: {
        ...settings.cardTypes,
        [key]: value,
      },
    });
  }

  return (
    <section className="generation-settings">
      <div>
        <div className="section-label">Generation Settings</div>
        <h2>Customize draft cards</h2>
      </div>

      <fieldset>
        <legend>Number of cards</legend>
        {(["Auto", "10", "25", "50"] as const).map((count) => (
          <label key={count}>
            <input
              checked={settings.cardCount === count}
              name="card-count"
              onChange={() => onChange({ ...settings, cardCount: count })}
              type="radio"
            />
            {count}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Difficulty</legend>
        {(["Basic", "Medium", "Advanced"] as const).map((difficulty) => (
          <label key={difficulty}>
            <input
              checked={settings.difficulty === difficulty}
              name="difficulty"
              onChange={() => onChange({ ...settings, difficulty })}
              type="radio"
            />
            {difficulty}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Card type</legend>
        <label>
          <input
            checked={settings.cardTypes.definition}
            onChange={(event) => updateCardType("definition", event.currentTarget.checked)}
            type="checkbox"
          />
          Definition
        </label>
        <label>
          <input
            checked={settings.cardTypes.concept}
            onChange={(event) => updateCardType("concept", event.currentTarget.checked)}
            type="checkbox"
          />
          Concept
        </label>
        <label>
          <input
            checked={settings.cardTypes.questionAnswer}
            onChange={(event) =>
              updateCardType("questionAnswer", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Question Answer
        </label>
        <label>
          <input
            checked={settings.cardTypes.formula}
            onChange={(event) => updateCardType("formula", event.currentTarget.checked)}
            type="checkbox"
          />
          Formula
        </label>
      </fieldset>

      <button className="primary-button" onClick={onGenerate} type="button">
        Generate Cards
      </button>
    </section>
  );
}

function ProcessingExperience({
  fileName,
  summary,
}: {
  fileName: string;
  summary: ProcessingSummary;
}) {
  const displayName = fileName || "source file";

  return (
    <div className="processing-card" aria-live="polite">
      <div className="spark-card">
        <span />
        <span />
        <span />
      </div>
      <div>
        <div className="section-label">Processing</div>
        <h2>Analyzing {displayName}</h2>
        <p>CardSmith is turning the source into study-ready material.</p>
      </div>

      <div className="processing-steps">
        <span className="complete">Reading document</span>
        <span className="complete">Finding concepts</span>
        <span className="complete">Creating questions</span>
        <span className="pending">Organizing cards</span>
      </div>

      <div className="generated-summary">
        <strong>Generated</strong>
        <div>
          <span>{summary.flashcards ?? "-"} flashcards</span>
          <span>{summary.topics ?? "-"} topics</span>
          <span>{summary.tags ?? "-"} tags</span>
        </div>
      </div>
    </div>
  );
}

function buildDraftCards(
  importedFile: ImportedFile,
  settings: GenerationSettings,
): Flashcard[] {
  const sentences = splitIntoSentences(importedFile.preview);
  const source = importedFile.name;
  const requestedCount =
    settings.cardCount === "Auto" ? 4 : Number.parseInt(settings.cardCount, 10);
  const firstCard: Flashcard = {
    id: makeCardId(source, 0),
    ...importedFile.card,
    tags: buildTags(importedFile.kind, settings),
    difficulty: mapDifficulty(settings.difficulty),
    created: "Today",
  };
  const extraCards = sentences.slice(1, requestedCount).map((sentence, index) => ({
    id: makeCardId(source, index + 1),
    question: makeQuestion(
      source,
      importedFile.kind,
      sentence,
      index + 1,
      settings,
    ),
    answer: sentence,
    source,
    tags: buildTags(importedFile.kind, settings),
    difficulty: mapDifficulty(settings.difficulty),
    created: "Today",
  }));

  return [firstCard, ...extraCards].slice(0, requestedCount);
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 34)
    .map((sentence) =>
      sentence.length > 230 ? `${sentence.slice(0, 230)}...` : sentence,
    );
}

function makeQuestion(
  source: string,
  kind: string,
  sentence: string,
  index: number,
  settings?: GenerationSettings,
) {
  if (kind === "Code") return `What does this section of ${source} do?`;
  if (settings?.cardTypes.formula && /[=+\-*/∑√π]/.test(sentence)) {
    return `What formula appears in ${source}?`;
  }
  if (settings?.cardTypes.definition && sentence.includes(":")) {
    return `What does this note from ${source} define?`;
  }
  if (sentence.includes(":")) return `What does this note from ${source} define?`;
  return `What is idea ${index + 1} from ${source}?`;
}

function buildTags(kind: string, settings: GenerationSettings) {
  return [
    kind,
    ...Object.entries(settings.cardTypes)
      .filter(([, enabled]) => enabled)
      .map(([type]) => type),
  ];
}

function mapDifficulty(difficulty: GenerationSettings["difficulty"]) {
  if (difficulty === "Basic") return "Easy" as const;
  if (difficulty === "Advanced") return "Hard" as const;
  return "Medium" as const;
}

function makeCardId(source: string, index: number) {
  return `${source}-${index}-${Date.now()}`;
}

function estimateTopics(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 5);

  return Math.max(1, Math.min(8, new Set(words).size));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function upsertCard(cards: Flashcard[], card: Flashcard) {
  if (cards.some((savedCard) => savedCard.id === card.id)) {
    return cards.map((savedCard) => (savedCard.id === card.id ? card : savedCard));
  }

  return [card, ...cards];
}

function themeSlug(theme: AppTheme) {
  return theme.toLowerCase().replace(/\s+/g, "-");
}

export default App;
