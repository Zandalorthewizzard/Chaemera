mod core_domains;
mod leptos_shell;
mod wave_b_domains;
mod wave_c_domains;
mod wave_d_domains;
mod wave_e_domains;
mod wave_f_domains;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_title("Chaemera")?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            core_domains::window_minimize,
            core_domains::window_maximize,
            core_domains::window_close,
            core_domains::get_system_platform,
            core_domains::get_app_version,
            core_domains::get_user_settings,
            core_domains::set_user_settings,
            wave_b_domains::select_app_folder,
            wave_b_domains::select_app_location,
            wave_b_domains::check_ai_rules,
            wave_b_domains::get_templates,
            wave_b_domains::read_app_file,
            wave_b_domains::search_app_files,
            wave_b_domains::list_versions,
            wave_b_domains::get_current_branch,
            wave_f_domains::run_app,
            wave_f_domains::stop_app,
            wave_f_domains::restart_app,
            wave_f_domains::respond_to_app_input,
            wave_f_domains::edit_app_file,
            wave_f_domains::check_problems,
            wave_f_domains::add_log,
            wave_f_domains::clear_logs,
            wave_f_domains::open_external_url,
            wave_c_domains::chat_stream,
            wave_c_domains::chat_cancel,
            wave_c_domains::agent_tool_get_tools,
            wave_c_domains::agent_tool_set_consent,
            wave_c_domains::agent_tool_consent_response,
            wave_c_domains::mcp_list_servers,
            wave_c_domains::mcp_create_server,
            wave_c_domains::mcp_update_server,
            wave_c_domains::mcp_delete_server,
            wave_c_domains::mcp_list_tools,
            wave_c_domains::mcp_get_tool_consents,
            wave_c_domains::mcp_set_tool_consent,
            wave_c_domains::mcp_tool_consent_response,
            wave_d_domains::vercel_save_token,
            wave_d_domains::vercel_list_projects,
            wave_d_domains::vercel_is_project_available,
            wave_d_domains::local_models_list_ollama,
            wave_d_domains::local_models_list_lmstudio,
            wave_e_domains::get_themes,
            wave_e_domains::generate_theme_prompt,
            wave_e_domains::generate_theme_from_url,
            wave_e_domains::save_theme_image,
            wave_e_domains::cleanup_theme_images,
            wave_e_domains::apply_visual_editing_changes,
            wave_e_domains::analyze_component,
            leptos_shell::leptos_render_route,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
