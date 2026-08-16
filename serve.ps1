# Static file server for BFR — Big Fucking Rocket
param(
  [int]$Port = 8088
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "Could not bind $prefix - try another port or run as admin."
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host ""
Write-Host "  BFR — Big Fucking Rocket"
Write-Host "  Serving $root"
Write-Host "  Open: $prefix"
Write-Host "  Press Ctrl+C to stop"
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".mp3"  = "audio/mpeg"
  ".md"   = "text/plain; charset=utf-8"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  try {
    $path = [Uri]::UnescapeDataString($req.Url.LocalPath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

    $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $path))
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $res.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $res.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    if ($mime.ContainsKey($ext)) {
      $res.ContentType = $mime[$ext]
    } else {
      $res.ContentType = "application/octet-stream"
    }
    $res.Headers.Add("Cache-Control", "no-cache")
    $res.Headers.Add("Access-Control-Allow-Origin", "*")

    $bytes = [System.IO.File]::ReadAllBytes($full)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
    Write-Host "$($res.StatusCode) $path"
  } catch {
    $msg = $_.Exception.Message
    Write-Host "Error: $msg"
    try { $res.StatusCode = 500; $res.Close() } catch {}
  }
}
