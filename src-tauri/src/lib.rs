mod core_domains;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
