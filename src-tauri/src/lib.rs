use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// `open_devtools` does not exist in release builds.
#[cfg(debug_assertions)]
#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow) {
  if window.is_devtools_open() {
    window.close_devtools();
  } else {
    window.open_devtools();
  }
}

#[tauri::command]
fn set_window_title(window: tauri::WebviewWindow, title: String) {
  let title = title.trim();
  if !title.is_empty() {
    let _ = window.set_title(title);
  }
}

/// Mirrors `document.title` into the native titlebar. Next.js can swap the whole
/// `<title>` element on navigation, hence the `<head>` observer re-attaching.
const TITLE_SYNC_SCRIPT: &str = r#"
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

const DEVTOOLS_SHORTCUT_SCRIPT: &str = r#"
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
    e.preventDefault();
    window.__TAURI_INTERNALS__?.invoke("toggle_devtools");
  }
});
"#;

/// Fixed, not allocated: the API only sends `Access-Control-Allow-Origin` for
/// allowlisted origins, and `http://localhost:3000` is the one that matches. Any
/// other port — or `127.0.0.1` — is a different origin, so every credentialed
/// request is blocked and login never gets its cookie.
const SERVER_PORT: u16 = 3000;

fn port_in_use(port: u16) -> bool {
  TcpListener::bind(("127.0.0.1", port)).is_err()
}

/// Poll until the server accepts connections, so the webview never loads early.
fn wait_for_server(port: u16, timeout: Duration) -> bool {
  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build());

  #[cfg(debug_assertions)]
  let builder = builder.invoke_handler(tauri::generate_handler![toggle_devtools, set_window_title]);
  #[cfg(not(debug_assertions))]
  let builder = builder.invoke_handler(tauri::generate_handler![set_window_title]);

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // In dev, `next dev` already serves on 3000 with hot reload — no sidecar.
      if cfg!(debug_assertions) {
        #[cfg_attr(not(debug_assertions), allow(unused_variables))]
        let window = WebviewWindowBuilder::new(
          app,
          "main",
          WebviewUrl::External("http://localhost:3000".parse()?),
        )
        .title("Bleaum POS")
        .inner_size(1440.0, 900.0)
        .resizable(true)
        .initialization_script(DEVTOOLS_SHORTCUT_SCRIPT)
        .initialization_script(TITLE_SYNC_SCRIPT)
        .build()?;

        // `cfg!` above is a runtime check, so this block still compiles into
        // release builds where `open_devtools` is absent — needs the attribute.
        #[cfg(debug_assertions)]
        window.open_devtools();

        return Ok(());
      }

      let port = SERVER_PORT;

      // Fail loudly rather than binding elsewhere: another port is a CORS-blocked
      // origin, which surfaces as an unexplained login failure.
      if port_in_use(port) {
        eprintln!("Port {port} is already in use — cannot start the POS server.");
        return Err(format!(
          "Port {port} is already in use. Close the other POS window or whatever is using it, then reopen."
        )
        .into());
      }

      let server_dir = app
        .path()
        .resolve("server", tauri::path::BaseDirectory::Resource)?;

      let (mut rx, child) = app
        .shell()
        .sidecar("bun")?
        .args([server_dir
          .join("sidecar-entry.mjs")
          .to_string_lossy()
          .to_string()])
        .current_dir(server_dir)
        .env("PORT", port.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("NODE_ENV", "production")
        // Lets the sidecar exit if this process is killed without cleanup.
        .env("TAURI_PARENT_PID", std::process::id().to_string())
        .spawn()?;

      // Drain the sidecar's output so its stdout pipe never fills and blocks it.
      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          match event {
            CommandEvent::Stderr(line) | CommandEvent::Stdout(line) => {
              eprintln!("[next] {}", String::from_utf8_lossy(&line).trim_end());
            }
            CommandEvent::Error(err) => eprintln!("[next] error: {err}"),
            CommandEvent::Terminated(payload) => {
              eprintln!("[next] exited: {:?}", payload.code)
            }
            _ => {}
          }
        }
      });

      // Kill the server when the app exits, otherwise it outlives the window.
      app.manage(std::sync::Mutex::new(Some(child)));

      if !wait_for_server(port, Duration::from_secs(30)) {
        eprintln!("Next.js sidecar did not listen on port {port} within 30s");
        return Err("Next.js server failed to start within 30s".into());
      }
      eprintln!("Next.js sidecar ready on port {port}");

      // `localhost`, not `127.0.0.1` — see SERVER_PORT.
      WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(format!("http://localhost:{port}").parse()?),
      )
      .title("Bleaum POS")
      .inner_size(1440.0, 900.0)
      .resizable(true)
      .initialization_script(TITLE_SYNC_SCRIPT)
      .build()?;

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // Exit covers every graceful quit path, unlike a per-window Destroyed handler.
      if let tauri::RunEvent::Exit = event {
        if let Some(child) =
          app.try_state::<std::sync::Mutex<Option<tauri_plugin_shell::process::CommandChild>>>()
        {
          if let Some(child) = child.lock().unwrap().take() {
            let _ = child.kill();
          }
        }
      }
    });
}
