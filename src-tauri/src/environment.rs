use log::{debug, error, info};
use once_cell::sync::Lazy;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// Windows-specific constants
#[cfg(target_os = "windows")]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

static UV_INSTALLED: AtomicBool = AtomicBool::new(false);
static NVM_INSTALLED: AtomicBool = AtomicBool::new(false);
static NODE_INSTALLED: AtomicBool = AtomicBool::new(false);
static ENVIRONMENT_SETUP_STARTED: AtomicBool = AtomicBool::new(false);
static ENVIRONMENT_SETUP_COMPLETED: AtomicBool = AtomicBool::new(false);
static NODE_VERSION: &str = "v20.9.0";
static IS_TEST_MODE: AtomicBool = AtomicBool::new(false);

// Lock to prevent concurrent environment setup operations
static ENVIRONMENT_SETUP_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[cfg(feature = "test-utils")]
pub fn set_test_mode(enabled: bool) {
    IS_TEST_MODE.store(enabled, Ordering::SeqCst);
}

pub fn is_test_mode() -> bool {
    IS_TEST_MODE.load(Ordering::SeqCst)
}

pub fn get_npx_shim_path() -> std::path::PathBuf {
    if is_test_mode() {
        return std::path::PathBuf::from("/test/.local/share/staten/bin/npx-staten");
    }

    #[cfg(target_os = "macos")]
    {
        let path = dirs::home_dir()
            .unwrap_or_default()
            .join(".local/share/staten/bin/npx-staten");

        return path;
    }

    #[cfg(target_os = "windows")]
    {
        let local_path = dirs::data_local_dir()
            .unwrap_or_default()
            .join("staten")
            .join("bin")
            .join("npx-staten.cmd");

        if local_path.exists() {
            return local_path;
        }

        if let Ok(output) = Command::new("where")
            .arg("npx-staten.cmd")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let paths = String::from_utf8_lossy(&output.stdout);
                if let Some(path) = paths.lines().next() {
                    let path = path.trim();
                    if !path.is_empty() {
                        debug!("Found npx-staten in PATH at {}", path);
                        return std::path::PathBuf::from(path);
                    }
                }
            }
        }

        return local_path;
    }
}

fn find_existing_uvx() -> Option<String> {
    if is_test_mode() {
        return Some("/test/.local/bin/uvx".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let home_dir = match dirs::home_dir() {
            Some(dir) => dir,
            None => return None,
        };

        let possible_paths = [
            home_dir.join(".local/bin/uvx"),
            home_dir.join(".cargo/bin/uvx"),
            std::path::PathBuf::from("/usr/local/bin/uvx"),
            std::path::PathBuf::from("/opt/homebrew/bin/uvx"),
            std::path::PathBuf::from("/usr/bin/uvx"),
        ];

        for path in &possible_paths {
            if path.exists() {
                info!("Found existing uvx at {}", path.display());
                return Some(path.to_string_lossy().to_string());
            }
        }

        match Command::new("which").arg("uvx").output() {
            Ok(output) if output.status.success() => {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                info!("Found existing uvx using 'which' at {}", path);
                return Some(path);
            }
            _ => return None,
        }
    }

    #[cfg(target_os = "windows")]
    {
        let home_dir = match dirs::home_dir() {
            Some(dir) => dir,
            None => return None,
        };

        let possible_paths = [
            home_dir.join(".cargo\\bin\\uvx.exe"),
            std::path::PathBuf::from("C:\\Program Files\\uv\\uvx.exe"),
            std::path::PathBuf::from("C:\\uv\\uvx.exe"),
        ];

        for path in &possible_paths {
            if path.exists() {
                info!("Found existing uvx at {}", path.display());
                return Some(path.to_string_lossy().to_string());
            }
        }

        match Command::new("where")
            .arg("uvx.exe")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            Ok(output) if output.status.success() => {
                let paths = String::from_utf8_lossy(&output.stdout);
                if let Some(path) = paths.lines().next() {
                    let path = path.trim();
                    if !path.is_empty() {
                        info!("Found existing uvx using 'where' at {}", path);
                        return Some(path.to_string());
                    }
                }
            }
            _ => {
                match Command::new("uvx")
                    .arg("--version")
                    .creation_flags(CREATE_NO_WINDOW)
                    .output()
                {
                    Ok(output) if output.status.success() => {
                        info!("uvx command works but couldn't determine exact path");
                        return Some("uvx".to_string());
                    }
                    _ => {}
                }
            }
        }

        None
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    None
}

pub fn get_uvx_path() -> Result<String, String> {
    if is_test_mode() {
        return Ok("/test/.local/bin/uvx".to_string());
    }

    // First check if we already have uvx somewhere on the system
    if let Some(path) = find_existing_uvx() {
        info!("Using existing uvx at {}", path);
        return Ok(path);
    }

    info!("No existing uvx found, will need to install it");

    // If uv is not installed, install it
    if !check_uv_installed() {
        info!("uv not found, attempting to install it");
        install_uv()?;
    }

    // Check common locations again after installation
    if let Some(path) = find_existing_uvx() {
        return Ok(path);
    }

    // Final fallback - check if uv is installed without uvx
    #[cfg(target_os = "macos")]
    let uv_output = Command::new("which")
        .arg("uv")
        .output()
        .map_err(|e| format!("Failed to get uv path: {}", e))?;

    #[cfg(target_os = "windows")]
    let uv_output = Command::new("where")
        .arg("uv.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to get uv path: {}", e))?;

    if uv_output.status.success() {
        let uv_path = String::from_utf8_lossy(&uv_output.stdout)
            .trim()
            .to_string();
        let _uv_dir = std::path::Path::new(&uv_path)
            .parent()
            .ok_or("Failed to get parent directory of uv")?;

        error!(
            "uv installed at {} but uvx is not available. This is unexpected.",
            uv_path
        );
        return Err(
            "uvx not found after installing uv. Please install it manually or check your PATH."
                .to_string(),
        );
    }

    Err("uvx not found in PATH and installation failed. Please install it manually.".to_string())
}

pub fn get_nvm_node_paths() -> Result<(String, String), String> {
    debug!("get_nvm_node_paths called, test_mode: {}", is_test_mode());

    if is_test_mode() {
        debug!("Using test mode paths for nvm/node");
        return Ok((
            "/test/.nvm/versions/node/v20.9.0/bin/node".to_string(),
            "/test/.nvm/versions/node/v20.9.0/bin/npx".to_string(),
        ));
    }

    #[cfg(target_os = "macos")]
    {
        let shell_command = format!(
            r#"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm use {} > /dev/null 2>&1
        which node
        which npx
    "#,
            NODE_VERSION
        );

        let output = Command::new("bash")
            .arg("-c")
            .arg(shell_command)
            .output()
            .map_err(|e| format!("Failed to get node paths: {}", e))?;

        if !output.status.success() {
            return Err("Failed to get node and npx paths".to_string());
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut lines = output_str.lines();

        let node_path = lines
            .next()
            .ok_or("Failed to get node path")?
            .trim()
            .to_string();

        let npx_path = lines
            .next()
            .ok_or("Failed to get npx path")?
            .trim()
            .to_string();

        // Only validate paths in non-test mode
        if !is_test_mode() && !node_path.contains(".nvm/versions/node") {
            debug!("Node path validation failed: {}", node_path);
            return Err("Node path is not from nvm installation".to_string());
        }

        Ok((node_path, npx_path))
    }

    #[cfg(target_os = "windows")]
    {
        if !check_nvm_installed() {
            return Err("NVM for Windows is not installed".to_string());
        }

        let nvm_root = std::env::var("NVM_HOME")
            .ok()
            .map(std::path::PathBuf::from)
            .or_else(|| dirs::home_dir().map(|p| p.join("AppData").join("Roaming").join("nvm")))
            .ok_or("Could not determine NVM_HOME")?;

        let version_no_v = NODE_VERSION.trim_start_matches('v');

        let _ = Command::new("nvm")
            .arg("use")
            .arg(version_no_v)
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let possible_node_paths = vec![
            nvm_root.join(version_no_v).join("node.exe"),
            nvm_root.join(format!("v{}", version_no_v)).join("node.exe"),
        ];

        let node_path = possible_node_paths
            .iter()
            .find(|path| path.exists())
            .ok_or_else(|| {
                format!(
                    "Node.js executable not found at any of the expected paths: {:?}",
                    possible_node_paths
                )
            })?;

        let parent_dir = node_path
            .parent()
            .ok_or("Could not determine parent directory of node.exe")?;

        let npx_path = parent_dir.join("npx.cmd");

        if !npx_path.exists() {
            return Err(format!(
                "NPX executable not found at expected path: {}",
                npx_path.display()
            ));
        }

        Ok((
            node_path.to_string_lossy().to_string(),
            npx_path.to_string_lossy().to_string(),
        ))
    }
}

pub fn ensure_npx_shim() -> Result<String, String> {
    if is_test_mode() {
        debug!("Using test mode path for npx shim");
        return Ok("/test/.local/share/staten/bin/npx-staten".to_string());
    }

    let shim_path = get_npx_shim_path();

    // Only create the shim if it doesn't exist
    if shim_path.exists() {
        debug!("NPX shim already exists at {}", shim_path.display());
        return Ok(shim_path.to_string_lossy().to_string());
    }

    info!("Creating NPX shim...");

    #[cfg(target_os = "macos")]
    {
        let (node_path, npx_path) = get_nvm_node_paths()?;

        if let Some(parent) = shim_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create shim directory: {}", e))?;
        }

        let shim_content = format!(
            r#"#!/bin/sh
# NPX shim for Staten

NODE="{}"
NPX="{}"

export PATH="$(dirname "$NODE"):$PATH"

exec "$NPX" "$@"
"#,
            node_path, npx_path
        );

        std::fs::write(&shim_path, shim_content)
            .map_err(|e| format!("Failed to write shim script: {}", e))?;

        Command::new("chmod")
            .arg("+x")
            .arg(&shim_path)
            .output()
            .map_err(|e| format!("Failed to make shim executable: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        match get_nvm_node_paths() {
            Ok((node_path, npx_path)) => {
                if let Some(parent) = shim_path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create shim directory: {}", e))?;
                }

                let node_dir = std::path::Path::new(&node_path)
                    .parent()
                    .ok_or("Could not determine parent directory of node.exe")?
                    .to_string_lossy();

                let shim_content = format!(
                    r#"@echo off
:: NPX shim for Staten on Windows

set NODE_PATH={}
set NODE={}
set NPX={}
set PATH=%NODE_PATH%;%PATH%

"%NPX%" %*
"#,
                    node_dir, node_path, npx_path
                );

                std::fs::write(&shim_path, shim_content)
                    .map_err(|e| format!("Failed to write shim script: {}", e))?;

                info!("NPX shim created at {}", shim_path.display());
            }
            Err(e) => {
                error!("Failed to get node paths for shim creation: {}", e);
                return Err(format!("Failed to create NPX shim: {}", e));
            }
        }
    }

    info!("NPX shim created at {}", shim_path.display());
    Ok(shim_path.to_string_lossy().to_string())
}

fn check_node_version() -> Result<String, String> {
    if is_test_mode() {
        return Ok(NODE_VERSION.to_string());
    }

    // If we already confirmed node is installed with correct version, return early
    if NODE_INSTALLED.load(Ordering::SeqCst) {
        debug!("Node.js already confirmed as installed");
        return Ok(NODE_VERSION.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let shell_command = format!(
            r#"
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
          nvm list | grep -w "{}" || true
      "#,
            NODE_VERSION
        );

        let output = Command::new("bash")
            .arg("-c")
            .arg(shell_command)
            .output()
            .map_err(|e| format!("Failed to check nvm node version: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        if output_str.contains(NODE_VERSION) {
            info!("Node.js {} is already installed via nvm", NODE_VERSION);
            NODE_INSTALLED.store(true, Ordering::SeqCst);
            return Ok(NODE_VERSION.to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        if check_nvm_installed() {
            let nvm_cmd = Command::new("nvm")
                .arg("list")
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .map_err(|e| format!("Failed to check nvm node version: {}", e))?;

            let output_str = String::from_utf8_lossy(&nvm_cmd.stdout);
            let version_no_v = NODE_VERSION.trim_start_matches('v');

            if output_str.contains(NODE_VERSION) || output_str.contains(version_no_v) {
                info!("Node.js {} is already installed via nvm", NODE_VERSION);
                NODE_INSTALLED.store(true, Ordering::SeqCst);
                return Ok(NODE_VERSION.to_string());
            }

            let nvm_root = std::env::var("NVM_HOME")
                .ok()
                .map(std::path::PathBuf::from)
                .or_else(|| dirs::home_dir().map(|p| p.join("AppData").join("Roaming").join("nvm")))
                .ok_or("Could not determine NVM_HOME")?;

            let node_exists = nvm_root.join(version_no_v).join("node.exe").exists()
                || nvm_root
                    .join(format!("v{}", version_no_v))
                    .join("node.exe")
                    .exists();

            if node_exists {
                info!("Node.js {} binary found via nvm", NODE_VERSION);
                NODE_INSTALLED.store(true, Ordering::SeqCst);
                return Ok(NODE_VERSION.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    let version_command = Command::new("node")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to check node version: {}", e))?;

    #[cfg(target_os = "windows")]
    let version_command = Command::new("node")
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to check node version: {}", e))?;

    if version_command.status.success() {
        let version = String::from_utf8_lossy(&version_command.stdout)
            .trim()
            .to_string();

        if version == NODE_VERSION {
            info!("Node.js {} is already installed system-wide", NODE_VERSION);
            NODE_INSTALLED.store(true, Ordering::SeqCst);
            return Ok(version);
        }

        info!("Found Node.js {} but {} is required", version, NODE_VERSION);
        return Ok(version);
    }

    Err("Node.js not found".to_string())
}

fn check_nvm_version() -> Result<String, String> {
    if is_test_mode() {
        return Ok("0.40.1".to_string());
    }

    let shell_command = r#"
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm --version
    "#;

    let output = Command::new("bash")
        .arg("-c")
        .arg(shell_command)
        .output()
        .map_err(|e| format!("Failed to check nvm version: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get nvm version".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn install_node() -> Result<(), String> {
    if is_test_mode() {
        return Ok(());
    }

    match check_node_version() {
        Ok(version) if version == NODE_VERSION => {
            info!(
                "Node.js {} is already installed, skipping installation",
                NODE_VERSION
            );
            NODE_INSTALLED.store(true, Ordering::Relaxed);
            return Ok(());
        }
        _ => {}
    }

    info!("Installing Node.js {}", NODE_VERSION);

    if !check_nvm_installed() {
        return Err("nvm is required to install Node.js".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let shell_command = format!(
            r#"
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
          nvm install {} --no-progress
      "#,
            NODE_VERSION
        );

        let output = Command::new("bash")
            .arg("-c")
            .arg(shell_command)
            .output()
            .map_err(|e| format!("Failed to run node installation: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Node installation failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }

    #[cfg(target_os = "windows")]
    {
        let version_without_v = NODE_VERSION.trim_start_matches('v');

        let output = Command::new("nvm")
            .arg("install")
            .arg(version_without_v)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to run node installation: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Node installation failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let use_output = Command::new("nvm")
            .arg("use")
            .arg(version_without_v)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to set node version: {}", e))?;

        if !use_output.status.success() {
            return Err(format!(
                "Failed to set node version: {}",
                String::from_utf8_lossy(&use_output.stderr)
            ));
        }

        let nvm_root = std::env::var("NVM_HOME")
            .ok()
            .map(std::path::PathBuf::from)
            .or_else(|| dirs::home_dir().map(|p| p.join("AppData").join("Roaming").join("nvm")))
            .unwrap_or_default();

        let node_exists = nvm_root.join(version_without_v).join("node.exe").exists()
            || nvm_root
                .join(format!("v{}", version_without_v))
                .join("node.exe")
                .exists();

        if !node_exists {
            return Err(format!(
                "Node.js {} installation verification failed. Binary not found at expected locations.",
                NODE_VERSION
            ));
        }
    }

    NODE_INSTALLED.store(true, Ordering::Relaxed);
    info!("Node.js {} installed successfully", NODE_VERSION);
    Ok(())
}

fn check_nvm_installed() -> bool {
    if is_test_mode() {
        return true;
    }

    // If we've already confirmed nvm is installed, return early
    if NVM_INSTALLED.load(Ordering::Relaxed) {
        debug!("NVM already confirmed as installed");
        return true;
    }

    #[cfg(target_os = "macos")]
    {
        let nvm_dir = dirs::home_dir()
            .map(|path| path.join(".nvm"))
            .filter(|path| path.exists());

        if nvm_dir.is_none() {
            info!("NVM directory not found");
            return false;
        }

        match check_nvm_version() {
            Ok(version) => {
                info!("NVM version {} is installed", version);
                NVM_INSTALLED.store(true, Ordering::Relaxed);
                true
            }
            Err(_) => {
                info!("NVM directory exists but nvm command failed");
                false
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let nvm_home = std::env::var("NVM_HOME")
            .ok()
            .map(std::path::PathBuf::from)
            .or_else(|| dirs::home_dir().map(|p| p.join("AppData").join("Roaming").join("nvm")));

        if let Some(nvm_path) = nvm_home {
            if nvm_path.exists() {
                let nvm_exe = nvm_path.join("nvm.exe");
                if nvm_exe.exists() {
                    info!("NVM for Windows found at {}", nvm_path.display());
                    NVM_INSTALLED.store(true, Ordering::Relaxed);
                    return true;
                }
            }
        }

        info!("NVM for Windows not found");
        false
    }
}

fn install_nvm() -> Result<(), String> {
    if is_test_mode() {
        return Ok(());
    }

    if check_nvm_installed() {
        info!("nvm is already installed, skipping installation");
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        info!("Installing nvm...");

        let shell_command = r#"
          curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
      "#;

        let output = Command::new("bash")
            .arg("-c")
            .arg(shell_command)
            .output()
            .map_err(|e| format!("Failed to install nvm: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "nvm installation failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        NVM_INSTALLED.store(true, Ordering::Relaxed);
        info!("nvm installed successfully");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        info!("Installing nvm for Windows...");

        let temp_dir = std::env::temp_dir().join("staten_nvm_install");
        let _ = std::fs::create_dir_all(&temp_dir);
        let installer_path = temp_dir.join("nvm-setup.exe");

        let nvm_installer_url =
            "https://github.com/coreybutler/nvm-windows/releases/download/1.1.11/nvm-setup.exe";

        let download_cmd = format!(
            "Invoke-WebRequest -Uri '{}' -OutFile '{}'",
            nvm_installer_url,
            installer_path.to_string_lossy()
        );

        let dl_output = Command::new("powershell")
            .arg("-Command")
            .arg(&download_cmd)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to download nvm installer: {}", e))?;

        if !dl_output.status.success() {
            return Err(format!(
                "Failed to download nvm installer: {}",
                String::from_utf8_lossy(&dl_output.stderr)
            ));
        }

        info!("Starting NVM for Windows installer. Please follow the on-screen instructions.");
        let installer_output = Command::new(&installer_path)
            .arg("/SILENT")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to run nvm installer: {}", e))?;

        if !installer_output.status.success() {
            return Err(format!(
                "NVM installation failed: {}",
                String::from_utf8_lossy(&installer_output.stderr)
            ));
        }

        let _ = std::fs::remove_file(&installer_path);
        let _ = std::fs::remove_dir(&temp_dir);

        if check_nvm_installed() {
            NVM_INSTALLED.store(true, Ordering::Relaxed);
            info!("nvm for Windows installed successfully");
            Ok(())
        } else {
            Err("nvm for Windows installation completed but verification failed".to_string())
        }
    }
}

fn check_uv_installed() -> bool {
    if is_test_mode() {
        return true;
    }

    if UV_INSTALLED.load(Ordering::Relaxed) {
        debug!("uv already confirmed as installed");
        return true;
    }

    if find_existing_uvx().is_some() {
        info!("uvx found, assuming uv is already installed");
        UV_INSTALLED.store(true, Ordering::Relaxed);
        return true;
    }

    #[cfg(target_os = "macos")]
    let which_cmd_output = Command::new("which")
        .arg("uv")
        .output()
        .map_or(false, |output| output.status.success());

    #[cfg(target_os = "windows")]
    let which_cmd_output = {
        Command::new("where")
            .arg("uv.exe")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_or(false, |output| output.status.success())
    };

    if !which_cmd_output {
        info!("uv not found in PATH");
        return false;
    }

    #[cfg(target_os = "macos")]
    let version_command = Command::new("uv").arg("--version").output();

    #[cfg(target_os = "windows")]
    let version_command = Command::new("uv")
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match version_command {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            info!("uv version {} is installed", version);
            UV_INSTALLED.store(true, Ordering::Relaxed);
            true
        }
        _ => {
            info!("uv found in PATH but command failed");
            false
        }
    }
}

fn install_uv() -> Result<(), String> {
    if is_test_mode() {
        return Ok(());
    }

    if check_uv_installed() {
        info!("uv is already installed, skipping installation");
        return Ok(());
    }

    info!("Installing uv...");

    #[cfg(target_os = "macos")]
    {
        let shell_command = r#"
          curl -LsSf https://astral.sh/uv/install.sh | sh
      "#;

        let output = Command::new("bash")
            .arg("-c")
            .arg(shell_command)
            .output()
            .map_err(|e| format!("Failed to install uv: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "uv installation failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let source_cargo_env = r#"
          source "$HOME/.cargo/env"
      "#;

        let _ = Command::new("bash")
            .arg("-c")
            .arg(source_cargo_env)
            .output();
    }

    #[cfg(target_os = "windows")]
    {
        let ps_command = r#"
          irm -Uri "https://astral.sh/uv/install.ps1" | iex
      "#;

        let output = Command::new("powershell")
            .arg("-ExecutionPolicy")
            .arg("Bypass")
            .arg("-Command")
            .arg(ps_command)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to install uv: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "uv installation failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
    }

    let home_dir = dirs::home_dir().ok_or("Failed to get home directory")?;

    #[cfg(target_os = "macos")]
    let uv_path = home_dir.join(".cargo/bin/uv");

    #[cfg(target_os = "windows")]
    let uv_path = home_dir.join(".cargo").join("bin").join("uv.exe");

    #[cfg(target_os = "macos")]
    let uvx_path = home_dir.join(".cargo/bin/uvx");

    #[cfg(target_os = "windows")]
    let uvx_path = home_dir.join(".cargo").join("bin").join("uvx.exe");

    if uv_path.exists() {
        info!("uv found at {}", uv_path.display());
        if !uvx_path.exists() {
            info!(
                "uvx not found at {} after uv installation, this is unexpected",
                uvx_path.display()
            );
        } else {
            info!("uvx found at {}", uvx_path.display());
        }
    } else {
        #[cfg(target_os = "macos")]
        let which_command = "which";

        #[cfg(target_os = "windows")]
        let which_command = "where";

        #[cfg(target_os = "macos")]
        let which_output = Command::new(which_command).arg("uv").output();

        #[cfg(target_os = "windows")]
        let which_output = Command::new(which_command)
            .arg("uv.exe")
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        match which_output {
            Ok(output) if output.status.success() => {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    info!("uv installed at {} (not in the expected location)", path);
                } else {
                    info!("uv not found in PATH after installation");
                }
            }
            _ => {
                info!("uv not found in PATH after installation");
            }
        }
    }

    UV_INSTALLED.store(true, Ordering::Relaxed);
    info!("uv installation completed");
    Ok(())
}

fn ensure_node_environment() -> Result<String, String> {
    if is_test_mode() {
        return Ok("Node environment is ready".to_string());
    }

    if !check_nvm_installed() {
        install_nvm()?;
    }

    match check_node_version() {
        Ok(version) => {
            if version != NODE_VERSION {
                info!(
                    "Node.js {} found, but {} required. Installing...",
                    version, NODE_VERSION
                );
                install_node()?;
            } else {
                debug!("Node.js {} is already installed", NODE_VERSION);
                NODE_INSTALLED.store(true, Ordering::Relaxed);
            }
        }
        Err(_) => {
            info!("Node.js not found. Installing...");
            install_node()?;
        }
    }

    ensure_npx_shim()?;

    ENVIRONMENT_SETUP_COMPLETED.store(true, Ordering::SeqCst);

    Ok("Node environment is ready".to_string())
}

pub fn ensure_environment_sync() -> Result<String, String> {
    if is_test_mode() {
        return Ok("Environment setup completed".to_string());
    }

    if ENVIRONMENT_SETUP_COMPLETED.load(Ordering::SeqCst) {
        debug!("Environment setup already completed");
        return Ok("Environment setup already completed".to_string());
    }

    info!("Starting synchronous environment setup");

    let _lock = match ENVIRONMENT_SETUP_LOCK.try_lock() {
        Ok(guard) => guard,
        Err(_) => {
            info!("Another environment setup is already in progress, waiting...");
            ENVIRONMENT_SETUP_LOCK.lock().unwrap()
        }
    };

    if ENVIRONMENT_SETUP_COMPLETED.load(Ordering::SeqCst) {
        return Ok("Environment setup completed while waiting".to_string());
    }

    let mut has_critical_error = false;

    if find_existing_uvx().is_none() {
        if !check_uv_installed() {
            if let Err(e) = install_uv() {
                error!("Failed to install uv: {}", e);
                has_critical_error = true;
            }
        }
    } else {
        info!("uvx is already installed, skipping uv installation");
    }

    if !has_critical_error {
        if let Err(e) = ensure_node_environment() {
            error!("Failed to ensure node environment: {}", e);
            has_critical_error = true;
        }
    }

    if !has_critical_error {
        ENVIRONMENT_SETUP_COMPLETED.store(true, Ordering::SeqCst);
        info!("Synchronous environment setup completed successfully");
        Ok("Environment setup completed".to_string())
    } else {
        info!("Synchronous environment setup completed with errors");
        Err("Environment setup failed with errors".to_string())
    }
}

#[tauri::command]
pub async fn ensure_environment() -> Result<String, String> {
    if is_test_mode() {
        return Ok("Environment setup started".to_string());
    }

    if ENVIRONMENT_SETUP_STARTED.swap(true, Ordering::SeqCst) {
        info!("Environment setup already in progress, skipping");
        return Ok("Environment setup already in progress".to_string());
    }

    match tauri::async_runtime::spawn_blocking(|| {
        let _lock = match ENVIRONMENT_SETUP_LOCK.try_lock() {
            Ok(guard) => guard,
            Err(_) => {
                info!("Another environment setup is already in progress");
                ENVIRONMENT_SETUP_STARTED.store(false, Ordering::SeqCst);
                return Err("Another environment setup is already in progress".to_string());
            }
        };

        info!("Starting environment setup");
        let mut setup_failed = false;

        if find_existing_uvx().is_none() {
            if !check_uv_installed() {
                if let Err(e) = install_uv() {
                    error!("Failed to install uv: {}", e);
                    setup_failed = true;
                }
            }
        } else {
            info!("uvx is already installed, skipping uv installation");
        }

        if !setup_failed {
            if let Err(e) = ensure_node_environment() {
                error!("Failed to ensure node environment: {}", e);
                setup_failed = true;
            }
        }

        ENVIRONMENT_SETUP_STARTED.store(false, Ordering::SeqCst);

        if setup_failed {
            ENVIRONMENT_SETUP_COMPLETED.store(false, Ordering::SeqCst);
            Err("Environment setup failed. Please check the logs for details.".to_string())
        } else {
            ENVIRONMENT_SETUP_COMPLETED.store(true, Ordering::SeqCst);
            info!("Environment setup completed successfully");
            Ok("Environment setup completed".to_string())
        }
    })
    .await
    {
        Ok(result) => result,
        Err(e) => {
            error!("Environment setup task panicked: {}", e);
            ENVIRONMENT_SETUP_STARTED.store(false, Ordering::SeqCst);
            ENVIRONMENT_SETUP_COMPLETED.store(false, Ordering::SeqCst);
            Err("Environment setup failed unexpectedly".to_string())
        }
    }
}

#[cfg(target_os = "windows")]
pub fn create_windowless_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
pub fn create_windowless_command(program: &str) -> Command {
    Command::new(program)
}
