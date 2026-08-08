use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;
use std::process::Command;

mod riot;

#[tauri::command]
fn launch_game(exe_path: String) -> Result<(), String> {
    Command::new(&exe_path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Impossible de lancer {exe_path}: {e}"))
}

#[tauri::command]
fn is_process_running(exe_name: String) -> bool {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {exe_name}")])
            .output();
        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                stdout.to_lowercase().contains(&exe_name.to_lowercase())
            }
            Err(_) => false,
        }
    }
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("pgrep").args(["-i", &exe_name]).output();
        matches!(output, Ok(out) if !out.stdout.is_empty())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = exe_name;
        false
    }
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("Impossible d'ecrire {path}: {e}"))
}

#[tauri::command]
fn read_image_as_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Impossible de lire {path}: {e}"))?;
    let mime = match path.rsplit('.').next().unwrap_or("").to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };
    let encoded = STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            launch_game,
            is_process_running,
            write_text_file,
            read_image_as_base64,
            riot::get_valorant_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
