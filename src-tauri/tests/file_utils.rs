mod common;

use staten_lib::file_utils::{ensure_config_file, ensure_mcp_servers};
use serde_json::{json, Value};
use std::path::PathBuf;
use tempfile::TempDir;

fn setup_empty_dir() -> (PathBuf, TempDir) {
    let temp_dir = tempfile::tempdir().unwrap();
    let config_path = temp_dir.path().join("config.json");
    (config_path, temp_dir)
}

#[test]
fn test_ensure_config_file() {
    let (config_path, _temp_dir) = setup_empty_dir();

    assert!(!config_path.exists());
    ensure_config_file(&config_path).unwrap();
    assert!(config_path.exists());

    let content = std::fs::read_to_string(&config_path).unwrap();
    let config: Value = serde_json::from_str(&content).unwrap();
    assert!(config["mcpServers"].is_object());
}

#[test]
fn test_ensure_mcp_servers() {
    // Test with empty object
    let mut config = json!({});
    ensure_mcp_servers(&mut config).unwrap();
    assert!(config["mcpServers"].is_object());

    // Test with existing mcpServers
    let mut config = json!({
        "mcpServers": {
            "existing": "value"
        }
    });
    ensure_mcp_servers(&mut config).unwrap();
    assert!(config["mcpServers"].is_object());
    assert_eq!(config["mcpServers"]["existing"], json!("value"));
}
