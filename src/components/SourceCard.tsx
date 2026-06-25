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
      <section className="empty-source-card">
        <div className="empty-source-icon" aria-hidden="true">
          📄
        </div>
        <h2>No sources yet</h2>
        <p>
          Import your first document and CardSmith will help turn it into
          flashcards.
        </p>
        <button className="primary-button" onClick={onImport} type="button">
          + Import File
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
          <small>
            {sourceMeta(file)}
            {" · "}
            {draftCount} draft cards created
          </small>
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

function sourceMeta(file: ImportedFile) {
  if (file.metadata.page_count) {
    return `${file.metadata.page_count} pages`;
  }

  return `${file.metadata.extracted_characters.toLocaleString()} characters`;
}
