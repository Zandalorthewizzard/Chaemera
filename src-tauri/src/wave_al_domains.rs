use std::process::Command;

fn powershell_screenshot_script() -> &'static str {
    r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$hwnd = [Win32]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) { throw "No focused window to capture" }
$rect = New-Object Win32+RECT
[Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) { throw "Failed to resolve focused window bounds" }
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
$graphics.Dispose()
[System.Windows.Forms.Clipboard]::SetImage($bitmap)
$bitmap.Dispose()
"#
}

#[tauri::command]
pub fn take_screenshot() -> Result<(), String> {
    if cfg!(target_os = "windows") {
        let status = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-STA",
                "-Command",
                powershell_screenshot_script(),
            ])
            .status()
            .map_err(|error| format!("failed to run screenshot capture: {error}"))?;

        if status.success() {
            return Ok(());
        }

        return Err("Failed to capture screenshot to clipboard".to_string());
    }

    if cfg!(target_os = "macos") {
        let status = Command::new("screencapture")
            .args(["-c", "-w", "-x"])
            .status()
            .map_err(|error| format!("failed to run macOS screenshot capture: {error}"))?;

        if status.success() {
            return Ok(());
        }

        return Err("Failed to capture screenshot to clipboard".to_string());
    }

    Err("take-screenshot is not yet implemented in the Tauri path for this platform".to_string())
}
