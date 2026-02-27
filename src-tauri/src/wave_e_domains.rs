use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_THEME_PROMPT: &str = r#"
<theme>
Any instruction in this theme should override other instructions if there's a contradiction.
### Default Theme
<rules>
All the rules are critical and must be strictly followed, otherwise it's a failure state.
#### Core Principles
- This is the default theme used by Chaemera users, so it is important to create websites that leave a good impression.
- AESTHETICS ARE VERY IMPORTANT. All web apps should LOOK AMAZING and have GREAT FUNCTIONALITY!
- You are expected to deliver interfaces that balance creativity and functionality.
#### Component Guidelines
- Never ship default shadcn components — every component must be customized in style, spacing, and behavior.
- Always prefer rounded shapes.
#### Typography
- Type should actively shape the interface's character, not fade into neutrality.
#### Color System
- Establish a clear and confident color system.
- Centralize colors through variables to maintain consistency.
- Avoid using gradient backgrounds.
- Avoid using black as the primary color. Aim for colorful websites.
#### Motion & Interaction
- Apply motion with restraint and purpose.
- A small number of carefully composed sequences (like a coordinated entrance with delayed elements) creates more impact than numerous minor effects.
- Motion should clarify structure and intent, not act as decoration.
#### Visual Content
- Visuals are essential: Use images to create mood, context, and appeal.
- Don't build text-only walls.
#### Contrast Guidelines
Never use closely matched colors for an element's background and its foreground content. Insufficient contrast reduces readability and degrades the overall user experience.
**Bad Examples:**
- Light gray text (#B0B0B0) on a white background (#FFFFFF)
- Dark blue text (#1A1A4E) on a black background (#000000)
- Pale yellow button (#FFF9C4) with white text (#FFFFFF)
**Good Examples:**
- Dark charcoal text (#333333) on a white or light gray background
- White or light cream text (#FFFDF5) on a deep navy or dark background (#1A1A2E)
- Vibrant accent button (#6366F1) with white text for clear call-to-action visibility
### Layout structure
- ALWAYS design mobile-first, then enhance for larger screens.
</rules>
<workflow>
Follow this workflow when building web apps:
1. **Determine Design Direction**
   - Analyze the industry and target users of the website.
   - Define colors, fonts, mood, and visual style.
   - Ensure the design direction does NOT contradict the rules defined for this theme.
2. **Build the Application**
   - Do not neglect functionality in the pursuit of making a beautiful website.
   - You must achieve both great aesthetics AND great functionality.
</workflow>
</theme>"#;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ThemeDto {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    icon: &'static str,
    prompt: &'static str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeGenerationRequest {
    image_paths: Vec<String>,
    keywords: String,
    generation_mode: String,
    model: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeFromUrlRequest {
    url: String,
    keywords: String,
    generation_mode: String,
    model: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveThemeImageRequest {
    data: String,
    filename: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupThemeImagesRequest {
    paths: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyVisualEditingChangesRequest {
    app_id: i64,
    changes: Vec<Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeComponentRequest {
    app_id: i64,
    component_id: String,
}

fn local_themes() -> [ThemeDto; 1] {
    [ThemeDto {
        id: "default",
        name: "Default Theme",
        description: "Balanced design system emphasizing aesthetics, contrast, and functionality.",
        icon: "palette",
        prompt: DEFAULT_THEME_PROMPT,
    }]
}

fn build_prompt_from_input(
    source: &str,
    source_value: &str,
    keywords: &str,
    generation_mode: &str,
) -> String {
    let mode_text = if generation_mode == "high-fidelity" {
        "High-fidelity visual matching"
    } else {
        "Inspired interpretation"
    };

    [
        "<theme>".to_string(),
        format!("Style mode: {}.", mode_text),
        format!("Reference source ({}): {}.", source, source_value),
        format!(
            "Keywords: {}.",
            if keywords.is_empty() {
                "none provided"
            } else {
                keywords
            }
        ),
        "Build an intentional, responsive UI direction with clear typography, spacing, and color hierarchy."
            .to_string(),
        "</theme>".to_string(),
    ]
    .join("\n")
}

fn theme_images_dir() -> PathBuf {
    std::env::temp_dir().join("chaemera-theme-images")
}

fn ensure_theme_images_dir() -> Result<PathBuf, String> {
    let dir = theme_images_dir();
    fs::create_dir_all(&dir).map_err(|error| format!("failed to create theme image dir: {error}"))?;
    Ok(dir)
}

fn sanitize_filename(filename: &str) -> String {
    Path::new(filename)
        .file_name()
        .and_then(|part| part.to_str())
        .unwrap_or("image.bin")
        .chars()
        .map(|ch| match ch {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '_' | '-' => ch,
            _ => '_',
        })
        .collect()
}

fn unique_prefix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn extract_base64_payload(data: &str) -> &str {
    data.rsplit(',').next().unwrap_or(data)
}

#[tauri::command]
pub fn get_themes() -> Result<Value, String> {
    serde_json::to_value(local_themes()).map_err(|error| format!("failed to serialize themes: {error}"))
}

#[tauri::command]
pub fn generate_theme_prompt(request: ThemeGenerationRequest) -> Result<Value, String> {
    let _ = request.model;
    let source_value = if request.image_paths.is_empty() {
        "no images provided".to_string()
    } else {
        request.image_paths.join(", ")
    };

    Ok(json!({
        "prompt": build_prompt_from_input(
            "images",
            &source_value,
            &request.keywords,
            &request.generation_mode,
        ),
    }))
}

#[tauri::command]
pub fn generate_theme_from_url(request: ThemeFromUrlRequest) -> Result<Value, String> {
    let _ = request.model;
    Ok(json!({
        "prompt": build_prompt_from_input(
            "url",
            &request.url,
            &request.keywords,
            &request.generation_mode,
        ),
    }))
}

#[tauri::command]
pub fn save_theme_image(request: SaveThemeImageRequest) -> Result<Value, String> {
    let dir = ensure_theme_images_dir()?;
    let filename = sanitize_filename(&request.filename);
    let full_path = dir.join(format!("{}-{}", unique_prefix(), filename));
    let payload = extract_base64_payload(&request.data);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|error| format!("failed to decode base64 theme image: {error}"))?;

    fs::write(&full_path, bytes)
        .map_err(|error| format!("failed to persist theme image: {error}"))?;

    Ok(json!({
        "path": full_path.to_string_lossy().to_string(),
    }))
}

#[tauri::command]
pub fn cleanup_theme_images(request: CleanupThemeImagesRequest) -> Result<(), String> {
    let root = ensure_theme_images_dir()?;
    let canonical_root =
        fs::canonicalize(&root).map_err(|error| format!("failed to resolve theme image dir: {error}"))?;

    for candidate in request.paths {
        let candidate_path = PathBuf::from(candidate);
        if !candidate_path.exists() {
            continue;
        }

        let Ok(canonical_candidate) = fs::canonicalize(&candidate_path) else {
            continue;
        };

        if canonical_candidate.starts_with(&canonical_root) {
            let _ = fs::remove_file(canonical_candidate);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn apply_visual_editing_changes(request: ApplyVisualEditingChangesRequest) -> Result<(), String> {
    let _ = request.app_id;
    let _ = request.changes;
    Ok(())
}

#[tauri::command]
pub fn analyze_component(request: AnalyzeComponentRequest) -> Result<Value, String> {
    let _ = request.app_id;
    let _ = request.component_id;
    Ok(json!({
        "isDynamic": false,
        "hasStaticText": false,
    }))
}
