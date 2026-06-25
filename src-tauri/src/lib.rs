use serde::Serialize;
use std::{fs, path::PathBuf};

#[derive(Serialize)]
struct ImportedFile {
    name: String,
    kind: String,
    preview: String,
    card: Flashcard,
}

#[derive(Serialize)]
struct Flashcard {
    question: String,
    answer: String,
    source: String,
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

    let raw_text = if extension == "pdf" {
        "This PDF source was imported into CardSmith. Add a short summary or key idea here, then save it as a study card."
            .to_string()
    } else {
        fs::read_to_string(&path).map_err(|error| {
            format!(
                "CardSmith could not read this file as plain text yet: {}",
                error
            )
        })?
    };

    let cleaned_text = normalize_text(&raw_text);
    let preview = cleaned_text.chars().take(900).collect::<String>();
    let answer = best_answer(&cleaned_text);
    let question = build_question(&name, &kind, &answer);

    Ok(ImportedFile {
        name: name.clone(),
        kind,
        preview,
        card: Flashcard {
            question,
            answer,
            source: name,
        },
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
