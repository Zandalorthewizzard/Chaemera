mod core_domains;
mod leptos_shell;
mod sqlite_support;
mod wave_b_domains;
mod wave_c_domains;
mod wave_d_domains;
mod wave_e_domains;
mod wave_f_domains;
mod wave_g_domains;
mod wave_h_domains;
mod wave_i_domains;
mod wave_j_domains;
mod wave_k_domains;
mod wave_l_domains;
mod wave_m_domains;
mod wave_n_domains;
mod wave_o_domains;
mod wave_p_domains;
mod wave_q_domains;

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
            wave_g_domains::get_system_debug_info,
            core_domains::get_app_version,
            wave_j_domains::get_app,
            wave_j_domains::list_apps,
            wave_n_domains::search_app,
            wave_p_domains::github_start_flow,
            wave_o_domains::github_list_repos,
            wave_o_domains::github_get_repo_branches,
            wave_o_domains::github_is_repo_available,
            wave_q_domains::github_create_repo,
            wave_q_domains::github_connect_existing_repo,
            wave_o_domains::github_list_collaborators,
            wave_o_domains::github_disconnect,
            wave_g_domains::nodejs_status,
            wave_g_domains::select_node_folder,
            wave_g_domains::get_node_path,
            core_domains::get_user_settings,
            core_domains::set_user_settings,
            wave_b_domains::select_app_folder,
            wave_b_domains::select_app_location,
            wave_b_domains::check_ai_rules,
            wave_j_domains::check_app_name,
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
            wave_g_domains::show_item_in_folder,
            wave_g_domains::clear_session_data,
            wave_h_domains::reset_all,
            wave_g_domains::reload_env_path,
            wave_g_domains::does_release_note_exist,
            wave_g_domains::get_user_budget,
            wave_g_domains::upload_to_signed_url,
            wave_g_domains::restart_dyad,
            wave_j_domains::add_to_favorite,
            wave_j_domains::update_app_commands,
            wave_l_domains::get_chat,
            wave_l_domains::get_chats,
            wave_l_domains::create_chat,
            wave_l_domains::update_chat,
            wave_l_domains::delete_chat,
            wave_l_domains::delete_messages,
            wave_l_domains::search_chats,
            wave_m_domains::create_app,
            wave_m_domains::delete_app,
            wave_m_domains::copy_app,
            wave_m_domains::rename_app,
            wave_m_domains::change_app_location,
            wave_m_domains::rename_branch,
            wave_k_domains::set_app_theme,
            wave_k_domains::get_app_theme,
            wave_k_domains::get_custom_themes,
            wave_k_domains::create_custom_theme,
            wave_k_domains::update_custom_theme,
            wave_k_domains::delete_custom_theme,
            wave_k_domains::prompts_list,
            wave_k_domains::prompts_create,
            wave_k_domains::prompts_update,
            wave_k_domains::prompts_delete,
            wave_i_domains::plan_create,
            wave_i_domains::plan_get,
            wave_i_domains::plan_get_for_chat,
            wave_i_domains::plan_update,
            wave_i_domains::plan_delete,
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
