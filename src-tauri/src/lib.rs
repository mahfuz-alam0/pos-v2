mod printers;
mod server;
mod window;

use std::time::Duration;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use printers::{get_local_printer_media, list_local_printers, print_pdf_to_local_printer};
use server::{port_in_use, wait_for_server, SERVER_PORT};
use window::{set_window_title, DEVTOOLS_SHORTCUT_SCRIPT, TITLE_SYNC_SCRIPT};
#[cfg(debug_assertions)]
use window::toggle_devtools;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build());

  #[cfg(debug_assertions)]
  let builder = builder.invoke_handler(tauri::generate_handler![
    toggle_devtools,
    set_window_title,
    list_local_printers,
    get_local_printer_media,
    print_pdf_to_local_printer
  ]);
  #[cfg(not(debug_assertions))]
  let builder = builder.invoke_handler(tauri::generate_handler![
    set_window_title,
    list_local_printers,
    get_local_printer_media,
    print_pdf_to_local_printer
  ]);

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
