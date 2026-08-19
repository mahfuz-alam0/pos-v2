/// `open_devtools` does not exist in release builds.
#[cfg(debug_assertions)]
#[tauri::command]
pub fn toggle_devtools(window: tauri::WebviewWindow) {
  if window.is_devtools_open() {
    window.close_devtools();
  } else {
    window.open_devtools();
  }
}

#[tauri::command]
pub fn set_window_title(window: tauri::WebviewWindow, title: String) {
  let title = title.trim();
  if !title.is_empty() {
    let _ = window.set_title(title);
  }
}

/// Mirrors `document.title` into the native titlebar. Next.js can swap the whole
/// `<title>` element on navigation, hence the `<head>` observer re-attaching.
pub const TITLE_SYNC_SCRIPT: &str = r#"
window.addEventListener("DOMContentLoaded", () => {
  const push = () => window.__TAURI_INTERNALS__?.invoke("set_window_title", { title: document.title });
  push();
  const observe = () => {
    const el = document.querySelector("title");
    if (el) new MutationObserver(push).observe(el, { childList: true });
  };
  observe();
  new MutationObserver(() => { push(); observe(); }).observe(document.head, { childList: true });
});
"#;

pub const DEVTOOLS_SHORTCUT_SCRIPT: &str = r#"
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
    e.preventDefault();
    window.__TAURI_INTERNALS__?.invoke("toggle_devtools");
  }
});
"#;
