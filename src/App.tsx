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

const savedCardsKey = "cardsmith.savedCards";
const themeStorageKey = "cardsmith.theme";

const pageTitles: Record<AppPage, string> = {
  Library: "Library",
  Sources: "Import Sources",
  Cards: "Generate Cards",
  Review: "Review Session",
  Progress: "Progress",
  Settings: "Settings",
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
  const [theme, setTheme] = useState<AppTheme>("Calm Study");
  const [appearanceOpen, setAppearanceOpen] = useState(false);

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
    if (savedTheme) {
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
    setImportState("loading");
    setAnswerVisible(false);
    setCurrentPage("Sources");

    try {
      const result = await invoke<ImportedFile>("import_study_file", {
        path: selectedPath,
      });
      const cards = buildDraftCards(result);

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
          <ProcessingExperience fileName={processingFileName} />
        </section>
      );
    }

    if (currentPage === "Library" || currentPage === "Sources") {
      return (
        <SourceCard
          draftCount={draftCards.length}
          file={importedFile}
          onGenerate={() => setCurrentPage("Cards")}
          onImport={importFile}
        />
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
          completePercent={savedCards.length ? Math.round((reviewIndex / savedCards.length) * 100) : 0}
          onNext={moveReviewNext}
          onToggleAnswer={() => setAnswerVisible((visible) => !visible)}
          remaining={Math.max(savedCards.length - reviewIndex, 0)}
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

    return (
      <section className="empty-state compact">
        <h2>Settings</h2>
        <p>Storage, appearance, and import settings will live here.</p>
      </section>
    );
  }

  return (
    <main className={`desktop-shell theme-${themeSlug(theme)}`}>
      <Sidebar
        currentPage={currentPage}
        draftCount={draftCards.length}
        onPageChange={(page) => {
          setCurrentPage(page);
          setAnswerVisible(false);
        }}
        savedCount={savedCards.length}
        sourceCount={sourceCount}
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

function ProcessingExperience({ fileName }: { fileName: string }) {
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
          <span>23 flashcards</span>
          <span>8 topics</span>
          <span>4 tags</span>
        </div>
      </div>
    </div>
  );
}

function buildDraftCards(importedFile: ImportedFile): Flashcard[] {
  const sentences = splitIntoSentences(importedFile.preview);
  const source = importedFile.name;
  const firstCard: Flashcard = {
    id: makeCardId(source, 0),
    ...importedFile.card,
    tags: [importedFile.kind],
    difficulty: "Medium",
    created: "Today",
  };
  const extraCards = sentences.slice(1, 4).map((sentence, index) => ({
    id: makeCardId(source, index + 1),
    question: makeQuestion(source, importedFile.kind, sentence, index + 1),
    answer: sentence,
    source,
    tags: [importedFile.kind],
    difficulty: "Medium" as const,
    created: "Today",
  }));

  return [firstCard, ...extraCards].slice(0, 4);
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
) {
  if (kind === "Code") return `What does this section of ${source} do?`;
  if (sentence.includes(":")) return `What does this note from ${source} define?`;
  return `What is idea ${index + 1} from ${source}?`;
}

function makeCardId(source: string, index: number) {
  return `${source}-${index}-${Date.now()}`;
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
