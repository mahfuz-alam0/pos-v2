use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// Toggle devtools for the calling window. Debug builds only — `open_devtools`
/// does not exist in release, and shipping an inspector to a POS terminal is worse.
#[cfg(debug_assertions)]
#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow) {
  if window.is_devtools_open() {
    window.close_devtools();
  } else {
    window.open_devtools();
  }
}

/// Ask the OS for a free port, then release it for the sidecar to bind.
/// Racy in theory; in practice nothing else grabs it in the microseconds between.
fn free_port() -> u16 {
  TcpListener::bind("127.0.0.1:0")
    .expect("no free port")
    .local_addr()
    .unwrap()
    .port()
}

/// Poll until the Next.js server accepts connections, so the webview never
/// loads before the server is up (which shows a connection-refused page).
fn wait_for_server(port: u16, timeout: Duration) -> bool {
  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    // Actually connect: a successful bind-failure could mean anything, but a
    // completed TCP handshake means the server is listening.
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default().plugin(tauri_plugin_shell::init());

  #[cfg(debug_assertions)]
  let builder = builder.invoke_handler(tauri::generate_handler![toggle_devtools]);

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // In dev, `next dev` is already serving on 3000 with hot reload — just point
      // the window at it instead of building and spawning the standalone sidecar.
      if cfg!(debug_assertions) {
        // Only read in debug, where devtools are opened below.
        #[cfg_attr(not(debug_assertions), allow(unused_variables))]
        let window = WebviewWindowBuilder::new(
          app,
          "main",
          WebviewUrl::External("http://localhost:3000".parse()?),
        )
        .title("POS")
        .inner_size(1440.0, 900.0)
        .resizable(true)
        // Cmd/Ctrl+Shift+I toggles devtools, matching the Electron/browser habit.
        // Injected here so it stays dev-only and out of the app source.
        .initialization_script(
          r#"
          window.addEventListener("keydown", (e) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
              e.preventDefault();
              window.__TAURI_INTERNALS__?.invoke("toggle_devtools");
            }
          });
          "#,
        )
        .build()?;

        // `cfg!` above is a runtime check, so this still compiles into release
        // builds where `open_devtools` does not exist — needs the real attribute.
        #[cfg(debug_assertions)]
        window.open_devtools();

        return Ok(());
      }

      let port = free_port();

      // The standalone server tree is bundled as a resource; server.js lives at its root.
      let server_dir = app
        .path()
        .resolve("server", tauri::path::BaseDirectory::Resource)?;

      let (mut rx, child) = app
        .shell()
        .sidecar("node")?
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

      // Drain the sidecar's output so its stdout pipe never fills and blocks the
      // server. Printed rather than logged so failures are visible from a terminal.
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

      WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(format!("http://127.0.0.1:{port}").parse()?),
      )
      .title("POS")
      .inner_size(1440.0, 900.0)
      .resizable(true)
      .build()?;

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // Exit fires for every graceful quit path (last window closed, Cmd-Q,
      // tray quit), unlike a per-window Destroyed handler.
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
