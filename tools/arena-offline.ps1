<#
  FATH ARENA - offline preparation (run once before the event, with internet).

  Downloads into .\vendor :
    - MediaPipe Tasks Vision 0.10.14 (JS bundle + WASM runtime)
    - Pose Landmarker models (lite + full)
    - qrcode.js (for the "Try at home" QR code)
    - Orbitron + Cairo fonts
  Afterwards FATH ARENA runs with NO internet connection.

  Run:  double-click prepare-arena-offline.bat
   or:  powershell -ExecutionPolicy Bypass -File tools\arena-offline.ps1
  Re-download everything:  add  -Force
#>
param([switch]$Force)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # makes Invoke-WebRequest much faster on PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root   = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root 'vendor'
$tv     = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
$pose   = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker'
$fontsCss = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Cairo:wght@600;800;900&display=swap'

$files = @(
  @{ url = "$tv/vision_bundle.mjs";                     out = 'tasks-vision\vision_bundle.mjs';                     min = 100KB },
  @{ url = "$tv/wasm/vision_wasm_internal.js";          out = 'tasks-vision\wasm\vision_wasm_internal.js';          min = 100KB },
  @{ url = "$tv/wasm/vision_wasm_internal.wasm";        out = 'tasks-vision\wasm\vision_wasm_internal.wasm';        min = 5MB },
  @{ url = "$tv/wasm/vision_wasm_nosimd_internal.js";   out = 'tasks-vision\wasm\vision_wasm_nosimd_internal.js';   min = 100KB },
  @{ url = "$tv/wasm/vision_wasm_nosimd_internal.wasm"; out = 'tasks-vision\wasm\vision_wasm_nosimd_internal.wasm'; min = 5MB },
  @{ url = "$pose/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; out = 'models\pose_landmarker_lite.task'; min = 2MB },
  @{ url = "$pose/pose_landmarker_full/float16/1/pose_landmarker_full.task"; out = 'models\pose_landmarker_full.task'; min = 4MB },
  @{ url = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; out = 'qrcode.min.js'; min = 10KB }
)

function Save-Url([string]$url, [string]$dest, [long]$min) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  $tmp = "$dest.part"
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  $len = (Get-Item $tmp).Length
  if ($len -lt $min) { Remove-Item $tmp -Force; throw "file too small ($len bytes)" }
  Move-Item $tmp $dest -Force
  return $len
}

Write-Host ''
Write-Host '  FATH ARENA - preparing offline files' -ForegroundColor Cyan
Write-Host "  -> $vendor"
Write-Host ''

$failed = 0
foreach ($f in $files) {
  $dest = Join-Path $vendor $f.out
  if (-not $Force -and (Test-Path $dest) -and (Get-Item $dest).Length -ge $f.min) {
    Write-Host "  =  $($f.out)  (already there)" -ForegroundColor DarkGray
    continue
  }
  try {
    $len = Save-Url $f.url $dest $f.min
    Write-Host ('  +  {0}  ({1:N1} MB)' -f $f.out, ($len / 1MB)) -ForegroundColor Green
  } catch {
    $failed++
    Write-Host "  X  $($f.out): $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Fonts: Google Fonts CSS + font files, rewritten to local paths -> vendor\fonts\fonts.css
$fontsDir = Join-Path $vendor 'fonts'
$cssPath  = Join-Path $fontsDir 'fonts.css'
if ($Force -or -not (Test-Path $cssPath)) {
  try {
    New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null
    $ua   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    $css  = (Invoke-WebRequest -Uri $fontsCss -UserAgent $ua -UseBasicParsing).Content
    $urls = [regex]::Matches($css, 'https://fonts\.gstatic\.com/[^)''"\s]+') | ForEach-Object { $_.Value } | Select-Object -Unique
    $i = 0
    foreach ($u in $urls) {
      $i++
      $name = 'font{0}{1}' -f $i, [IO.Path]::GetExtension(([Uri]$u).AbsolutePath)
      [void](Save-Url $u (Join-Path $fontsDir $name) 1KB)
      $css = $css.Replace($u, $name)
    }
    if ($i -eq 0) { throw 'no font files found in the Google Fonts response' }
    [IO.File]::WriteAllText($cssPath, $css)
    Write-Host "  +  fonts\fonts.css  ($i font files)" -ForegroundColor Green
  } catch {
    $failed++
    Write-Host "  X  fonts: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host '  =  fonts\fonts.css  (already there)' -ForegroundColor DarkGray
}

Write-Host ''
if ($failed -eq 0) {
  Write-Host '  DONE - FATH ARENA can now run without internet.' -ForegroundColor Green
} else {
  Write-Host "  $failed item(s) failed - check the internet connection and run again." -ForegroundColor Yellow
}
Write-Host ''
if ($Host.Name -eq 'ConsoleHost') { [void](Read-Host '  Press Enter to close') }
