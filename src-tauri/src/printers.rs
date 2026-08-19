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
