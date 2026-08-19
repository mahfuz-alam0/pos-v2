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

#[derive(serde::Serialize, Clone)]
pub struct PrinterMedia {
  /// The queue's own name for the size, e.g. "w4h6" — passed straight back to
  /// `lp -o media=` so the driver uses its own preset rather than a custom size.
  media_name: String,
  width_mm: f64,
  height_mm: f64,
}

/// The page size this queue will physically print on — i.e. the label stock
/// actually loaded, as configured on the queue.
///
/// This exists because a label printer is not a sheet printer: the page size
/// is not just a layout hint, it reprograms the hardware. The TSPL driver for
/// these Xprinter queues turns the job's media into a literal `SIZE w mm, h mm`
/// command, which is what the gap sensor uses to find the start of the next
/// label. Sizing a job to the artwork instead of the stock (a 76x41mm label on
/// 4x6in stock) emits `SIZE 76.2 mm, 40.9 mm` and the printer then advances by
/// 41mm on 152mm stock — it prints one short window and loses registration.
///
/// So the artwork must be placed on a page the size of the stock instead, which
/// is exactly what a browser does when it prints the same PDF at 100% scale
/// onto "4 x 6 in" paper. renderNodeToPdf.ts uses this to build that page.
#[tauri::command]
pub fn get_local_printer_media(printer_name: String) -> Result<Option<PrinterMedia>, String> {
  Ok(default_media(&printer_name))
}

#[cfg(not(target_os = "windows"))]
fn default_media(printer_name: &str) -> Option<PrinterMedia> {
  const PT_TO_MM: f64 = 25.4 / 72.0;

  // Queue names come from list_local_printers, but this still builds a path
  // from one, so keep anything that could climb out of the ppd directory out.
  if printer_name.is_empty() || printer_name.contains('/') || printer_name.contains("..") {
    return None;
  }
  let ppd = std::fs::read_to_string(format!("/etc/cups/ppd/{printer_name}.ppd")).ok()?;

  // "*DefaultPageSize: w4h6"
  let name = ppd
    .lines()
    .find_map(|line| line.strip_prefix("*DefaultPageSize:"))?
    .trim()
    .to_string();

  // "*PaperDimension w4h6/4 x 6 (4.00 in x 6.00 in): \"288 432\"" — points.
  let (width_pt, height_pt) = ppd.lines().find_map(|line| {
    let (key, value) = line.strip_prefix("*PaperDimension ")?.split_once(':')?;
    if key.split('/').next()?.trim() != name {
      return None;
    }
    let mut dims = value.trim().trim_matches('"').split_whitespace();
    let width = dims.next()?.parse::<f64>().ok()?;
    let height = dims.next()?.parse::<f64>().ok()?;
    Some((width, height))
  })?;

  Some(PrinterMedia {
    media_name: name,
    width_mm: width_pt * PT_TO_MM,
    height_mm: height_pt * PT_TO_MM,
  })
}

// Windows has no PPD to read and PrintTo takes no page size anyway (see
// send_to_printer below), so callers get None and fall back to sizing the page
// to the artwork.
#[cfg(target_os = "windows")]
fn default_media(_printer_name: &str) -> Option<PrinterMedia> {
  None
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
  // The PDF (see renderNodeToPdf.ts) is one page drawn at 0,0 with no margin,
  // so all CUPS has to do is print it 1:1 on media of the same size.
  //
  // Prefer the queue's own named media whenever the page already matches the
  // loaded stock, because on a label printer the media is not a layout hint —
  // the TSPL driver turns it into a literal `SIZE w mm, h mm` that reprograms
  // the gap sensor. A named preset emits the stock's real dimensions; a custom
  // size equal to the artwork emits the artwork's, and the printer then feeds
  // by the artwork height instead of the label pitch and loses registration
  // after the first short window. Custom is still the right answer when the
  // page genuinely isn't the stock size (roll/continuous media, or no PPD to
  // read), so it stays as the fallback.
  //
  // The `media=` prefix is load-bearing either way. `-o Custom.76x32mm` is not
  // a page-size request at all: cupsParseOptions() reads a bare `-o name` as
  // the boolean `name=true`, so jobs went out carrying a meaningless
  // `Custom.76x32mm=true` and no media attribute whatsoever, leaving whatever
  // the queue defaulted to in force. Millimetre fractions matter too — rounding
  // to whole mm shaves up to 0.5mm off an axis and clips the edge of artwork
  // rendered to fill its page. CUPS parses custom sizes with %f.
  let media = match default_media(printer_name) {
    Some(stock)
      if (stock.width_mm - width_mm).abs() < 1.0 && (stock.height_mm - height_mm).abs() < 1.0 =>
    {
      format!("media={}", stock.media_name)
    }
    _ => format!(
      "media=Custom.{:.2}x{:.2}mm",
      width_mm.max(1.0),
      height_mm.max(1.0)
    ),
  };
  let output = std::process::Command::new("lp")
    .args([
      "-d",
      printer_name,
      "-n",
      &copies.to_string(),
      "-o",
      &media,
      "-o",
      "print-scaling=none",
      "-o",
      "page-left=0",
      "-o",
      "page-right=0",
      "-o",
      "page-top=0",
      "-o",
      "page-bottom=0",
      // `position` is only read by the image filters (imagetopdf/imagetoraster),
      // never by the PDF chain, so there is no top-left pin to be had here —
      // matching the media size above is what actually places the page.
      "-o",
      "orientation-requested=3",
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
  //
  // KNOWN GAP: PrintTo takes no page-size argument, so width_mm/height_mm go
  // unused here and the handler falls back to the printer's default paper.
  // That is the same mismatch the CUPS branch above fixes with `media=`, and
  // it surfaces the same way — the label placed on an oversized sheet, with a
  // wide margin down the left and the right edge running off. Closing it needs
  // a path that can be driven with an explicit page size (a bundled PDF-print
  // helper, or a custom form set on the queue), not PrintTo.
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
