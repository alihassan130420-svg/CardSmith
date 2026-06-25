export type AppPage = "Library" | "Sources" | "Cards" | "Review" | "Progress" | "Settings";

export type AppTheme =
  | "Calm Study"
  | "Midnight Focus"
  | "Paper Notes"
  | "Reading Mode";

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  source: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  created: string;
};

export type ImportedFile = {
  name: string;
  kind: string;
  preview: string;
  metadata: {
    page_count: number | null;
    extracted_characters: number;
    extraction_method: string;
  };
  card: Omit<Flashcard, "id" | "tags" | "difficulty" | "created">;
};
