use leptos::prelude::*;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeptosRenderRouteRequest {
    route_id: String,
    provider_id: Option<String>,
}

#[component]
fn ShellChip(label: String) -> impl IntoView {
    view! {
        <span class="chaemera-leptos-chip">{label}</span>
    }
}

#[component]
fn ShellFrame(
    title: String,
    eyebrow: String,
    summary: String,
    compatibility_title: String,
    compatibility_copy: String,
    chips: Vec<String>,
) -> impl IntoView {
    let chip_views = chips
        .into_iter()
        .map(|chip| view! { <ShellChip label=chip /> })
        .collect_view();

    view! {
        <section class="chaemera-leptos-shell" data-shell-title=title.clone()>
            <style>
                {r#"
                .chaemera-leptos-shell {
                  padding: 2rem;
                  border-bottom: 1px solid color-mix(in srgb, var(--border, #d4d4d8) 75%, transparent);
                  background:
                    radial-gradient(circle at top left, rgba(219, 234, 254, 0.9), transparent 38%),
                    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
                }
                .chaemera-leptos-shell__eyebrow {
                  font-size: 0.75rem;
                  letter-spacing: 0.18em;
                  text-transform: uppercase;
                  color: #0f766e;
                  font-weight: 700;
                }
                .chaemera-leptos-shell__title {
                  margin-top: 0.55rem;
                  font-size: 2rem;
                  line-height: 1.1;
                  font-weight: 700;
                  color: #111827;
                }
                .chaemera-leptos-shell__summary {
                  max-width: 52rem;
                  margin-top: 0.85rem;
                  font-size: 0.98rem;
                  line-height: 1.6;
                  color: #374151;
                }
                .chaemera-leptos-shell__chips {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 0.65rem;
                  margin-top: 1rem;
                }
                .chaemera-leptos-chip {
                  display: inline-flex;
                  align-items: center;
                  padding: 0.45rem 0.8rem;
                  border-radius: 999px;
                  background: rgba(15, 118, 110, 0.08);
                  border: 1px solid rgba(15, 118, 110, 0.18);
                  color: #115e59;
                  font-size: 0.8rem;
                  font-weight: 600;
                }
                .chaemera-leptos-shell__compat {
                  margin-top: 1.35rem;
                  display: grid;
                  gap: 0.4rem;
                  border-radius: 1rem;
                  padding: 1rem 1.1rem;
                  background: rgba(255, 255, 255, 0.72);
                  border: 1px dashed rgba(17, 24, 39, 0.18);
                }
                .chaemera-leptos-shell__compat-title {
                  font-size: 0.95rem;
                  font-weight: 700;
                  color: #111827;
                }
                .chaemera-leptos-shell__compat-copy {
                  font-size: 0.9rem;
                  line-height: 1.5;
                  color: #4b5563;
                }
                @media (max-width: 720px) {
                  .chaemera-leptos-shell {
                    padding: 1.25rem;
                  }
                  .chaemera-leptos-shell__title {
                    font-size: 1.55rem;
                  }
                }
                "#}
            </style>
            <div class="chaemera-leptos-shell__eyebrow">{eyebrow}</div>
            <h1 class="chaemera-leptos-shell__title">{title}</h1>
            <p class="chaemera-leptos-shell__summary">{summary}</p>
            <div class="chaemera-leptos-shell__chips">{chip_views}</div>
            <div class="chaemera-leptos-shell__compat">
                <div class="chaemera-leptos-shell__compat-title">{compatibility_title}</div>
                <div class="chaemera-leptos-shell__compat-copy">{compatibility_copy}</div>
            </div>
        </section>
    }
}

fn provider_display_name(provider_id: &str) -> String {
    match provider_id {
        "auto" => "Hosted AI".to_string(),
        "openai" => "OpenAI".to_string(),
        "anthropic" => "Anthropic".to_string(),
        "google" => "Google".to_string(),
        "azure" => "Azure OpenAI".to_string(),
        "vertex" => "Vertex AI".to_string(),
        "xai" => "xAI".to_string(),
        "openrouter" => "OpenRouter".to_string(),
        "groq" => "Groq".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => "Provider".to_string(),
            }
        }
    }
}

fn render_shell(
    title: String,
    eyebrow: String,
    summary: String,
    compatibility_title: String,
    compatibility_copy: String,
    chips: Vec<String>,
) -> String {
    view! {
        <ShellFrame
            title=title
            eyebrow=eyebrow
            summary=summary
            compatibility_title=compatibility_title
            compatibility_copy=compatibility_copy
            chips=chips
        />
    }
    .to_html()
}

#[tauri::command]
pub fn leptos_render_route(request: LeptosRenderRouteRequest) -> Result<Value, String> {
    let route_id = request.route_id.as_str();

    let (title, html) = match route_id {
        "apps-home" => (
            "Apps".to_string(),
            render_shell(
                "Apps".to_string(),
                "Leptos Workspace Shell".to_string(),
                "The top-level app workspace now has a Tauri-side Leptos route shell. Home creation, onboarding, and app-entry flows remain mounted below in the React compatibility layer while the core workspace cutover is staged.".to_string(),
                "React Compatibility Body".to_string(),
                "App creation, onboarding banners, prompt inspiration, and import flows still execute through the existing React implementation below this shell.".to_string(),
                vec![
                    "Workspace Entry".to_string(),
                    "Onboarding".to_string(),
                    "Import Flow".to_string(),
                ],
            ),
        ),
        "chat-workspace" => (
            "Chat Workspace".to_string(),
            render_shell(
                "Chat Workspace".to_string(),
                "Leptos Workspace Shell".to_string(),
                "The primary chat and preview workspace now enters through a Leptos-rendered route shell inside the Tauri runtime. The current React chat panel, preview panel, and tool surfaces remain mounted below for behavior parity during migration.".to_string(),
                "React Compatibility Body".to_string(),
                "Chat streaming, preview orchestration, version panes, and tool-specific interactions continue to run in the established React workspace while the shell cutover lands first.".to_string(),
                vec![
                    "Chat".to_string(),
                    "Preview".to_string(),
                    "Versions".to_string(),
                    "Tools".to_string(),
                ],
            ),
        ),
        "app-details" => (
            "App Details".to_string(),
            render_shell(
                "App Details".to_string(),
                "Leptos Workspace Shell".to_string(),
                "App metadata, integration status, and workspace-level management now open under a Leptos route shell within the Tauri desktop runtime. Existing React cards and dialogs remain mounted below while feature parity is preserved.".to_string(),
                "React Compatibility Body".to_string(),
                "Rename, copy, change-location, integration connectors, and workspace administration still execute in the React compatibility layer during this migration wave.".to_string(),
                vec![
                    "Metadata".to_string(),
                    "Integrations".to_string(),
                    "Workspace Actions".to_string(),
                ],
            ),
        ),
        "settings" => (
            "Settings".to_string(),
            render_shell(
                "Settings".to_string(),
                "Leptos Shell".to_string(),
                "Core preferences, runtime toggles, telemetry controls, and integration entry points are now framed by a Tauri-side Leptos shell. The React implementation remains mounted below as the compatibility body while migration is in progress.".to_string(),
                "React Compatibility Body".to_string(),
                "General settings, integrations, MCP, and advanced toggles still execute through the existing React feature surface below this shell.".to_string(),
                vec![
                    "General".to_string(),
                    "Integrations".to_string(),
                    "Telemetry".to_string(),
                    "Runtime".to_string(),
                ],
            ),
        ),
        "library" => (
            "Library".to_string(),
            render_shell(
                "Library".to_string(),
                "Leptos Shell".to_string(),
                "Prompt and theme management now enters through a Leptos-rendered route shell inside the Tauri runtime. Existing React cards and dialogs remain mounted below for full compatibility during the first cut-in.".to_string(),
                "React Compatibility Body".to_string(),
                "Prompt cards, theme editors, and deep-link handling still run in the legacy React layer while the route chrome is now served by Leptos.".to_string(),
                vec![
                    "Prompts".to_string(),
                    "Themes".to_string(),
                    "Deep Links".to_string(),
                ],
            ),
        ),
        "themes" => (
            "Themes".to_string(),
            render_shell(
                "Themes".to_string(),
                "Leptos Shell".to_string(),
                "Theme browsing and generation now enters through a Leptos-rendered route shell inside the Tauri runtime. The existing React editors and asset flows remain mounted below as the compatibility body while the cutover is in progress.".to_string(),
                "React Compatibility Body".to_string(),
                "Theme cards, generation forms, and custom asset management continue to run in the existing React layer below this shell.".to_string(),
                vec![
                    "Custom Themes".to_string(),
                    "Generation".to_string(),
                    "Assets".to_string(),
                ],
            ),
        ),
        "provider-settings" => {
            let provider_name = provider_display_name(request.provider_id.as_deref().unwrap_or("provider"));
            (
                format!("Provider Setup: {}", provider_name),
                render_shell(
                    format!("Provider Setup: {}", provider_name),
                    "Leptos Shell".to_string(),
                    format!("Provider-specific setup now lands in a Leptos-rendered shell for {}. The underlying API-key, model, and environment configuration flow remains mounted below as a compatibility layer.", provider_name),
                    "React Compatibility Body".to_string(),
                    "Provider forms, key persistence, and model editing continue to execute in the proven React implementation until the next migration wave.".to_string(),
                    vec![
                        provider_name,
                        "API Keys".to_string(),
                        "Model Selection".to_string(),
                    ],
                ),
            )
        }
        "help" => (
            "Help".to_string(),
            render_shell(
                "Help".to_string(),
                "Leptos Shell".to_string(),
                "Support and diagnostics now open through a Leptos route in the Tauri desktop shell. The advanced bug-reporting and debug-bundle workflow remains available below via the legacy React dialog.".to_string(),
                "React Compatibility Body".to_string(),
                "Use the compatibility section below to open the existing issue-reporting workflow and session bundle export tools.".to_string(),
                vec![
                    "Issues".to_string(),
                    "Debug Bundles".to_string(),
                    "Support".to_string(),
                ],
            ),
        ),
        other => {
            return Err(format!("unsupported Leptos shell route: {other}"));
        }
    };

    Ok(json!({
        "routeId": route_id,
        "title": title,
        "html": html,
    }))
}
