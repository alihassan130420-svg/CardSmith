use serde::Serialize;
use std::{fs, path::PathBuf};

#[derive(Serialize)]
struct ImportedFile {
    name: String,
    kind: String,
    preview: String,
    metadata: SourceMetadata,
    card: Flashcard,
}

#[derive(Serialize)]
struct Flashcard {
    question: String,
    answer: String,
    source: String,
}

#[derive(Serialize)]
struct SourceMetadata {
    page_count: Option<usize>,
    extracted_characters: usize,
    extraction_method: &'static str,
}

#[tauri::command]
fn import_study_file(path: String) -> Result<ImportedFile, String> {
    let path = PathBuf::from(path);
    let name = path
        .file_name()
        .and_then(|file_name| file_name.to_str())
        .unwrap_or("Imported file")
        .to_string();
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("")
        .to_lowercase();
    let kind = match extension.as_str() {
        "md" | "markdown" => "Markdown",
        "pdf" => "PDF",
        "rs" | "js" | "jsx" | "ts" | "tsx" | "py" | "java" | "cpp" | "c" | "cs" => "Code",
        "txt" => "Text",
        _ => "File",
    }
    .to_string();

    let extracted = if extension == "pdf" {
        extract_pdf_text(&path)?
    } else {
        let raw_text = fs::read_to_string(&path).map_err(|error| {
            format!(
                "CardSmith could not read this file as plain text yet: {}",
                error
            )
        })?;

        ExtractedSource {
            text: raw_text,
            page_count: None,
            extraction_method: "plain-text",
        }
    };

    let cleaned_text = normalize_text(&extracted.text);
    let extracted_characters = cleaned_text.chars().count();
    if extracted_characters < 24 {
        return Err(format!(
            "CardSmith imported {}, but could not find enough readable text to create flashcards.",
            name
        ));
    }

    let preview = cleaned_text.chars().take(900).collect::<String>();
    let answer = best_answer(&cleaned_text);
    let question = build_question(&name, &kind, &answer);

    Ok(ImportedFile {
        name: name.clone(),
        kind,
        preview,
        metadata: SourceMetadata {
            page_count: extracted.page_count,
            extracted_characters,
            extraction_method: extracted.extraction_method,
        },
        card: Flashcard {
            question,
            answer,
            source: name,
        },
    })
}

struct ExtractedSource {
    text: String,
    page_count: Option<usize>,
    extraction_method: &'static str,
}

fn extract_pdf_text(path: &PathBuf) -> Result<ExtractedSource, String> {
    let page_count = lopdf::Document::load(path)
        .map(|document| document.get_pages().len())
        .ok();

    let text = pdf_extract::extract_text(path).map_err(|error| {
        format!(
            "CardSmith could not extract text from this PDF. If it is scanned or image-only, OCR support will be needed. Details: {}",
            error
        )
    })?;

    let cleaned = normalize_text(&text);
    if cleaned.chars().count() < 24 {
        return Err(
            "CardSmith opened this PDF, but it appears to be scanned or image-only. Text-based PDFs are supported now; OCR can be added next."
                .to_string(),
        );
    }

    Ok(ExtractedSource {
        text,
        page_count,
        extraction_method: "pdf-text",
    })
}

fn normalize_text(text: &str) -> String {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn best_answer(text: &str) -> String {
    let first_sentence = text
        .split(['.', '!', '?'])
        .map(str::trim)
        .find(|sentence| sentence.len() > 24)
        .unwrap_or(text);

    let answer = first_sentence.chars().take(220).collect::<String>();
    if answer.is_empty() {
        "This file was imported successfully. Add your own answer here.".to_string()
    } else {
        answer
    }
}

fn build_question(file_name: &str, kind: &str, answer: &str) -> String {
    if kind == "Code" {
        format!("What is the main idea in {}?", file_name)
    } else if answer.contains(" is ") || answer.contains(" are ") {
        format!("What key idea should you remember from {}?", file_name)
    } else {
        format!("What does {} explain?", file_name)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![import_study_file])
        .run(tauri::generate_context!())
        .expect("error while running CardSmith");
}
