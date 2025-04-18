#[cfg(test)]
mod common;

use staten_lib::environment;

#[test]
fn test_environment_setup() {
    environment::set_test_mode(true);
    let result = environment::ensure_environment_sync();
    assert!(result.is_ok());
    environment::set_test_mode(false);
}

#[test]
fn test_node_environment() {
    environment::set_test_mode(true);
    let result = environment::ensure_npx_shim();
    assert!(result.is_ok());
    assert!(result.unwrap().contains("npx-staten"));
    environment::set_test_mode(false);
}
