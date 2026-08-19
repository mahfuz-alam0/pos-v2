#[derive(serde::Serialize, Clone)]
pub struct LocalPrinter {
  name: String,
  /// "idle" | "printing" | "disabled" | "unknown"
  status: String,
  is_default: bool,
}

/// Real printers connected to/installed on this machine, for the Local tab of
/// the printer setup drawer — there is no browser API for this, so it only
/// works from the Tauri desktop build (see isTauriDesktop() gate on the JS
/// side). Shells out to the OS's own printer-status tooling rather than
/// pulling in a native crate, since CUPS (`lpstat`) ships with macOS/most
/// Linux desktops and PowerShell ships with Windows.
#[tauri::command]
pub fn list_local_printers() -> Result<Vec<LocalPrinter>, String> {
  #[cfg(target_os = "windows")]
  {
    windows_list_printers()
  }
  #[cfg(not(target_os = "windows"))]
  {
    cups_list_printers()
  }
}

#[cfg(not(target_os = "windows"))]
fn cups_list_printers() -> Result<Vec<LocalPrinter>, String> {
  let output = std::process::Command::new("lpstat")
    .args(["-p", "-d"])
    .output()
    .map_err(|e| format!("lpstat unavailable: {e}"))?;

  let text = String::from_utf8_lossy(&output.stdout);
  let mut default_name = String::new();
  let mut printers = Vec::new();

  for line in text.lines() {
    if let Some(rest) = line.strip_prefix("system default destination: ") {
      default_name = rest.trim().to_string();
    } else if let Some(rest) = line.strip_prefix("printer ") {
      // "<name> is idle.  enabled since <date>"
      // "<name> is now printing <name>-<job>.  enabled since <date>"
      // "<name> disabled since <date> -"
      let Some((name, remainder)) = rest.split_once(' ') else {
        continue;
      };
      let status = if remainder.contains("is idle") {
        "idle"
      } else if remainder.contains("printing") {
        "printing"
      } else if remainder.contains("disabled") {
        "disabled"
      } else {
        "unknown"
      };
      printers.push(LocalPrinter {
        name: name.to_string(),
        status: status.to_string(),
        is_default: false,
      });
    }
  }

  for printer in printers.iter_mut() {
    printer.is_default = printer.name == default_name;
  }

  Ok(printers)
}

/// Silently prints an already-rendered PDF to a named local printer — the
/// Tauri-side counterpart to Electron's `webContents.print({ silent: true,
/// deviceName })` used by the sibling desktop-point-on-sell app's
/// ConfigureIPC.ts `print-receipt` handler. Tauri's webview has no such API
/// (no Chromium print pipeline to drive headlessly), so the JS side rasterizes
/// the off-screen print node into a PDF first (html2canvas + jsPDF, see
/// renderNodeToPdf.ts) and this command just spools those bytes straight to
/// the OS print system — CUPS `lp` on macOS/Linux, matching the shell-out
/// style already used by list_local_printers above.
#[tauri::command]
pub fn print_pdf_to_local_printer(
  printer_name: String,
  pdf_bytes: Vec<u8>,
  width_mm: f64,
  height_mm: f64,
  num_of_copies: u32,
) -> Result<(), String> {
  if pdf_bytes.is_empty() {
    return Err("No PDF content to print".to_string());
  }
  if printer_name.trim().is_empty() {
    return Err("No printer name provided".to_string());
  }
  let copies = num_of_copies.max(1);

  let mut path = std::env::temp_dir();
  let unique = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_nanos())
    .unwrap_or(0);
  path.push(format!("bleaum-print-{}-{unique}.pdf", std::process::id()));

  std::fs::write(&path, &pdf_bytes).map_err(|e| format!("Failed to write print file: {e}"))?;

  let result = send_to_printer(&path, &printer_name, width_mm, height_mm, copies);

  let _ = std::fs::remove_file(&path);

  result
}

#[cfg(not(target_os = "windows"))]
fn send_to_printer(
  path: &std::path::Path,
  printer_name: &str,
  width_mm: f64,
  height_mm: f64,
  copies: u32,
) -> Result<(), String> {
  // Custom media in mm pins CUPS to the PDF's own page size instead of
  // whatever the queue's default media happens to be (Letter/A4), which
  // would otherwise crop or rescale a small label/receipt page. Zeroing the
  // page-* margins is required too: most PPDs fall back to a generic
  // imageable-area inset (often asymmetric on label/thermal drivers) for a
  // custom size they don't have an exact preset for, which otherwise shoves
  // the whole label toward one edge of the physical stock instead of
  // printing it flush from the top-left corner the PDF itself was built at.
  let media = format!(
    "Custom.{}x{}mm",
    width_mm.max(1.0).round() as i64,
    height_mm.max(1.0).round() as i64
  );
  let output = std::process::Command::new("lp")
    .args([
      "-d",
      printer_name,
      "-n",
      &copies.to_string(),
      "-o",
      &media,
      "-o",
      "fit-to-page",
      "-o",
      "page-left=0",
      "-o",
      "page-right=0",
      "-o",
      "page-top=0",
      "-o",
      "page-bottom=0",
      "-o",
      "position=top-left",
    ])
    .arg(path)
    .output()
    .map_err(|e| format!("lp unavailable: {e}"))?;

  if output.status.success() {
    Ok(())
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!("lp failed: {}", stderr.trim()))
  }
}

#[cfg(target_os = "windows")]
fn send_to_printer(
  path: &std::path::Path,
  printer_name: &str,
  _width_mm: f64,
  _height_mm: f64,
  copies: u32,
) -> Result<(), String> {
  // No CUPS on Windows and no `webContents.print()` either. The "PrintTo"
  // shell verb hands the PDF to whatever's registered as the default PDF
  // handler (Edge, out of the box on Win10/11) and asks it to print silently
  // to a specific printer — no dialog. Looped per copy since PrintTo has no
  // copy-count argument of its own.
  let path_str = path.to_string_lossy().replace('"', "");
  let printer_escaped = printer_name.replace('"', "`\"");
  let script = format!(
    "for ($i = 0; $i -lt {copies}; $i++) {{ Start-Process -FilePath \"{path_str}\" -Verb PrintTo -ArgumentList \"`\"{printer_escaped}`\"\" -WindowStyle Hidden; Start-Sleep -Milliseconds 500 }}"
  );
  let output = std::process::Command::new("powershell")
    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
    .output()
    .map_err(|e| format!("powershell unavailable: {e}"))?;

  if output.status.success() {
    Ok(())
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!("Print failed: {}", stderr.trim()))
  }
}

#[cfg(target_os = "windows")]
fn windows_list_printers() -> Result<Vec<LocalPrinter>, String> {
  let output = std::process::Command::new("powershell")
    .args([
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-CimInstance -ClassName Win32_Printer | Select-Object Name,PrinterStatus,Default | ConvertTo-Json -Compress",
    ])
    .output()
    .map_err(|e| format!("powershell unavailable: {e}"))?;

  let text = String::from_utf8_lossy(&output.stdout);
  let trimmed = text.trim();
  if trimmed.is_empty() {
    return Ok(Vec::new());
  }

  let parsed: serde_json::Value =
    serde_json::from_str(trimmed).map_err(|e| format!("failed to parse printer list: {e}"))?;
  // ConvertTo-Json emits a single object (not an array) when there's exactly one result.
  let entries: Vec<serde_json::Value> = match parsed {
    serde_json::Value::Array(items) => items,
    other => vec![other],
  };

  let printers = entries
    .into_iter()
    .filter_map(|entry| {
      let name = entry.get("Name")?.as_str()?.to_string();
      // Win32_Printer.PrinterStatus: 3 = Idle, 4 = Printing, 7 = Offline.
      let status = match entry.get("PrinterStatus").and_then(|v| v.as_i64()) {
        Some(3) => "idle",
        Some(4) => "printing",
        Some(7) => "disabled",
        _ => "unknown",
      };
      let is_default = entry
        .get("Default")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
      Some(LocalPrinter {
        name,
        status: status.to_string(),
        is_default,
      })
    })
    .collect();

  Ok(printers)
}
