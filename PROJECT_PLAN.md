# CardSmith Project Plan

## Product Vision

CardSmith is a local-first desktop app that turns study files into organized flashcards. It should feel like a focused study workbench: import files, extract useful ideas, shape them into clean question/answer cards, and review them without sending private notes or code to the internet.

## Target Stack

- Desktop shell: Tauri 2
- Backend/core: Rust
- Frontend: React, TypeScript, Vite
- Storage: local app data directory, starting with JSON; SQLite can be added when the card model grows
- Packaging: Tauri Windows bundles for `.exe` setup and `.msi` installer

## UI Direction

The first design direction is a minimalist three-pane workbench:

- Left rail: library navigation, source files, tags, and local storage status
- Center workbench: extracted document text, highlights, generated card table, and card editing actions
- Right study panel: current review card, answer reveal, progress, and spaced-repetition buttons

The visual style should be modern, calm, and practical: true white, cool gray surfaces, charcoal text, restrained teal/blue accents, small amber highlights for extracted source text, crisp typography, and compact controls.

## Core User Flow

1. User imports a PDF, Markdown, text, or code file.
2. CardSmith records the file locally and shows it in the source library.
3. User selects a source and sees extracted text sections.
4. User creates cards manually or generates draft cards from selected text.
5. User edits question, answer, tags, and source metadata.
6. User reviews cards in a focused study panel.
7. Progress is stored locally.

## Milestones

### Milestone 1: App Skeleton

- Create Tauri + React + TypeScript project
- Configure app identity as CardSmith
- Add app shell layout and design tokens
- Add sample local data for sources, tags, cards, and progress
- Add basic navigation states for Library, Extract, Cards, and Review

### Milestone 2: Local Data Model

- Define Rust structs for source files, extracted sections, flashcards, tags, and review progress
- Add Tauri commands for reading/writing app data
- Persist data in a local JSON store
- Add frontend API wrappers

### Milestone 3: File Import

- Add file picker for PDF, Markdown, text, and common code files
- Copy or register imported files in local app storage
- Extract plain text from Markdown, text, and code files
- Add PDF text extraction after the basic import path is stable

### Milestone 4: Card Creation

- Manual card creation and editing
- Highlight-to-card flow from extracted text
- Rule-based draft generation for definitions, formulas, headings, and code functions
- Tag and subject assignment

### Milestone 5: Review Mode

- Study card reveal interaction
- Again, Hard, Good, Easy rating buttons
- Local progress tracking
- Filter review by subject, tag, or source

### Milestone 6: Packaging

- Add app icon and Windows bundle metadata
- Build production frontend
- Build Tauri release bundle
- Produce Windows setup `.exe`
- Produce `.msi` after WiX is installed and available on the Windows machine

## Initial Implementation Scope

The first implementation should be a polished, interactive skeleton with sample data and working UI states. It will not claim full PDF parsing or smart generation until those flows are implemented. The goal is to establish a strong foundation that already feels like the final product.

## Risks And Notes

- PDF extraction quality varies by document; scanned PDFs will need OCR later.
- Fully offline generation should start with deterministic rules before considering optional local model integrations.
- Windows MSI output depends on WiX being installed because Tauri uses WiX for MSI generation.
- App signing is separate from local packaging and can be added before public distribution.
