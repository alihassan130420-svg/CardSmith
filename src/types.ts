export type AppPage = "Library" | "Sources" | "Cards" | "Review" | "Progress" | "Settings";

export type AppTheme =
  | "Calm Study"
  | "Midnight Focus"
  | "Paper Notes"
  | "Ocean Blue"
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
  card: Omit<Flashcard, "id" | "tags" | "difficulty" | "created">;
};
