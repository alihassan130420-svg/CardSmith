use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};

const MIN_EXTRACTED_CHARACTERS: usize = 24;
const PREVIEW_CHARACTER_LIMIT: usize = 6_000;
const ANSWER_CHARACTER_LIMIT: usize = 260;

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

    let cleaned_text = normalize_extracted_text(&extracted.text);
    let extracted_characters = cleaned_text.chars().count();
    if extracted_characters < MIN_EXTRACTED_CHARACTERS {
        return Err(format!(
            "CardSmith imported {}, but could not find enough readable text to create flashcards.",
            name
        ));
    }

    let preview = cleaned_text
        .chars()
        .take(PREVIEW_CHARACTER_LIMIT)
        .collect::<String>();
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

fn extract_pdf_text(path: &Path) -> Result<ExtractedSource, String> {
    let document = lopdf::Document::load(path).map_err(|error| {
        format!(
            "CardSmith could not open this PDF. It may be damaged or unsupported. Details: {}",
            error
        )
    })?;
    let page_count = Some(document.get_pages().len());

    if document.is_encrypted() {
        return Err(
            "This PDF is password protected. CardSmith can import unlocked text-based PDFs right now."
                .to_string(),
        );
    }

    let text = pdf_extract::extract_text(path).map_err(|error| {
        format!(
            "CardSmith opened this PDF but could not extract text from it. If it is scanned or image-only, OCR support will be needed. Details: {}",
            error
        )
    })?;

    let cleaned = normalize_extracted_text(&text);
    if cleaned.chars().count() < MIN_EXTRACTED_CHARACTERS {
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

fn normalize_extracted_text(text: &str) -> String {
    let text = text.replace('\u{000C}', "\n");
    let lines = text
        .lines()
        .map(clean_pdf_line)
        .filter(|line| !line.is_empty() && !is_probable_page_number(line))
        .collect::<Vec<_>>();

    let mut output = String::new();
    for line in lines {
        if output.is_empty() {
            output.push_str(&line);
            continue;
        }

        if output.ends_with('-') && begins_with_lowercase(&line) {
            output.pop();
            output.push_str(&line);
        } else if should_keep_paragraph_gap(&output, &line) {
            output.push_str("\n\n");
            output.push_str(&line);
        } else {
            output.push(' ');
            output.push_str(&line);
        }
    }

    collapse_inline_spaces(&output)
}

fn clean_pdf_line(line: &str) -> String {
    let without_control_chars = line
        .chars()
        .map(|character| {
            if character.is_control() && character != '\t' {
                ' '
            } else {
                character
            }
        })
        .collect::<String>();

    collapse_inline_spaces(without_control_chars.trim())
}

fn collapse_inline_spaces(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn is_probable_page_number(line: &str) -> bool {
    let trimmed = line.trim();
    !trimmed.is_empty()
        && trimmed.len() <= 4
        && trimmed.chars().all(|character| character.is_ascii_digit())
}

fn begins_with_lowercase(line: &str) -> bool {
    line.chars()
        .next()
        .map(|character| character.is_lowercase())
        .unwrap_or(false)
}

fn should_keep_paragraph_gap(current: &str, next_line: &str) -> bool {
    current.ends_with('.')
        || current.ends_with('!')
        || current.ends_with('?')
        || looks_like_heading(next_line)
}

fn looks_like_heading(line: &str) -> bool {
    let word_count = line.split_whitespace().count();
    word_count <= 8
        && line.len() <= 80
        && line
            .chars()
            .any(|character| character.is_ascii_alphabetic())
        && !line.ends_with('.')
}

fn best_answer(text: &str) -> String {
    let first_sentence = text
        .split(['.', '!', '?'])
        .map(str::trim)
        .find(|sentence| sentence.len() > 24)
        .unwrap_or(text);

    let answer = first_sentence
        .chars()
        .take(ANSWER_CHARACTER_LIMIT)
        .collect::<String>();
    if answer.is_empty() {
        "This file was imported successfully. Add your own answer here.".to_string()
    } else {
        answer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_pdf_line_breaks_and_hyphenation() {
        let raw = "Market struc-\nture is important.\n\n1\nRisk management matters.";

        assert_eq!(
            normalize_extracted_text(raw),
            "Market structure is important. Risk management matters."
        );
    }

    #[test]
    fn removes_short_page_numbers() {
        let raw = "Introduction\n12\nA useful concept appears here.";

        assert_eq!(
            normalize_extracted_text(raw),
            "Introduction A useful concept appears here."
        );
    }

    #[test]
    fn keeps_enough_answer_text_for_study_cards() {
        let answer = best_answer(
            "A trading candle shows open, high, low, and close prices for a chosen period. The next sentence is extra.",
        );

        assert!(answer.starts_with("A trading candle shows"));
        assert!(answer.len() <= ANSWER_CHARACTER_LIMIT);
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
