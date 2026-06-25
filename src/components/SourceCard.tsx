import type { ImportedFile } from "../types";

type SourceCardProps = {
  file: ImportedFile | null;
  draftCount: number;
  onImport: () => void;
  onGenerate: () => void;
};

export function SourceCard({
  file,
  draftCount,
  onImport,
  onGenerate,
}: SourceCardProps) {
  if (!file) {
    return (
      <section className="empty-state">
        <h2>Welcome to CardSmith</h2>
        <p>Turn PDFs, Markdown, text, and code files into study flashcards.</p>
        <div className="file-types">
          <span>PDF</span>
          <span>Markdown</span>
          <span>Text</span>
          <span>Code</span>
        </div>
        <button className="primary-button" onClick={onImport} type="button">
          Import File
        </button>
      </section>
    );
  }

  return (
    <section className="source-card">
      <div className="section-label">Imported source</div>
      <div className="source-header">
        <span className="file-token">{file.kind}</span>
        <div>
          <h2>{file.name}</h2>
          <small>{draftCount} draft cards created</small>
        </div>
      </div>
      <div className="source-actions">
        <button className="primary-button" onClick={onGenerate} type="button">
          Generate Cards
        </button>
        <button className="secondary-button" type="button">
          Open Source
        </button>
        <button className="danger-button" type="button">
          Delete
        </button>
      </div>
    </section>
  );
}
