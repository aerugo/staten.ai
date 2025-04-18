pub mod app;
pub mod clients;
pub mod environment;
pub mod file_utils;
pub mod os;

use log::{error, info};
use simplelog::{ConfigBuilder, LevelFilter, WriteLogger};
use std::fs;
use tauri_plugin_updater::{Builder as UpdaterBuilder, UpdaterExt};
use time::macros::format_description;

fn setup_logger() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    let log_dir = {
        let home = dirs::home_dir().ok_or("Could not find home directory")?;
        home.join("Library/Logs/Staten")
    };

    #[cfg(target_os = "windows")]
    let log_dir = {
        let local_app_data =
            dirs::data_local_dir().ok_or("Could not find AppData\\Local directory")?;
        local_app_data.join("Staten").join("Logs")
    };

    fs::create_dir_all(&log_dir)?;
    let log_file = log_dir.join("staten.log");

    let config = ConfigBuilder::new()
        .set_time_format_custom(format_description!(
            "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond]Z"
        ))
        .build();

    #[cfg(debug_assertions)]
    let level = LevelFilter::Debug;

    #[cfg(not(debug_assertions))]
    let level = LevelFilter::Info;

    WriteLogger::init(level, config, fs::File::create(log_file)?)?;
    info!("Logger initialized with level: {:?}", level);
    Ok(())
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        info!("Update available: {}", update.version);
        let mut downloaded = 0;
        match update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    info!("Downloaded {downloaded} from {content_length:?}");
                },
                || {
                    info!("Download finished, preparing to install...");
                },
            )
            .await
        {
            Ok(_) => {
                info!("Update installed successfully, restarting...");
                app.restart();
            }
            Err(e) => {
                error!("Failed to install update: {}", e);
                if e.to_string().contains("InvalidSignature") {
                    error!("Update signature verification failed. This could mean the update package has been tampered with or the public key doesn't match.");
                }
            }
        }
    } else {
        info!("No update available");
    }
    Ok(())
}

#[tauri::command]
fn log_from_frontend(level: String, message: String) {
    match level.as_str() {
        "info" => info!("[Frontend] {}", message),
        "warn" => log::warn!("[Frontend] {}", message),
        "error" => error!("[Frontend] {}", message),
        "debug" => log::debug!("[Frontend] {}", message),
        _ => info!("[Frontend] {}", message),
    }
}

#[tauri::command]
fn open_system_url(url: String) -> Result<(), String> {
    info!("Opening URL with system command: {}", url);

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(url)
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(["/c", "start", &url])
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn open_logs_folder() -> Result<(), String> {
    info!("Opening logs folder with system command");

    let log_dir = {
        #[cfg(target_os = "macos")]
        {
            let home = dirs::home_dir().ok_or("Could not find home directory")?;
            home.join("Library/Logs/Staten")
        }

        #[cfg(target_os = "windows")]
        {
            let local_app_data =
                dirs::data_local_dir().ok_or("Could not find AppData\\Local directory")?;
            local_app_data.join("Staten").join("Logs")
        }
    };

    if !log_dir.exists() {
        return Err(format!("Logs directory does not exist: {:?}", log_dir));
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&log_dir)
            .output()
            .map_err(|e| format!("Failed to open logs folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .arg(&log_dir)
            .output()
            .map_err(|e| format!("Failed to open logs folder: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    if let Err(e) = setup_logger() {
        eprintln!("Failed to initialize logger: {}", e);
    }

    // Initialize client path configurations
    clients::init_client_path_configs();

    // Preload dependencies in background
    std::thread::spawn(|| {
        let _ = app::preload_dependencies();
    });

    tauri::Builder::default()
        .plugin(UpdaterBuilder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app::install,
            app::uninstall,
            app::is_installed,
            app::get_app_statuses,
            app::preload_dependencies,
            app::save_app_env,
            app::get_app_env,
            app::get_app_registry,
            app::restart_client_app,
            app::install_staten_mcp,
            app::uninstall_staten_mcp,
            app::check_onboarding_completed,
            app::reset_onboarding_completed,
            app::check_client_installed,
            app::get_supported_clients,
            app::get_default_client_command,
            app::set_client_config_path,
            app::get_client_config_path,
            app::refresh_app_registry,
            environment::ensure_environment,
            log_from_frontend,
            open_system_url,
            open_logs_folder,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            info!("Checking for updates...");
            tauri::async_runtime::spawn(async move {
                if let Err(e) = update(handle).await {
                    error!("Error checking for updates: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
