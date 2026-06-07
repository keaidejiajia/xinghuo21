# UTF-8 without BOM — prevents JSON.parse failure in browsers
$utf8 = [System.Text.UTF8Encoding]::new($false)

$port = 8421
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root "data.json"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.AbsolutePath
    if ($path -eq "/") { $path = "/index.html" }

    # POST /api/save — write data.json
    if ($path -eq "/api/save" -and $ctx.Request.HttpMethod -eq "POST") {
        try {
            $reader = [System.IO.StreamReader]::new($ctx.Request.InputStream)
            $body = $reader.ReadToEnd()
            $reader.Close()
            [System.IO.File]::WriteAllText($dataFile, $body, $utf8)
            $resp = $utf8.GetBytes('{"ok":true}')
            $ctx.Response.ContentType = "application/json"
            $ctx.Response.ContentLength64 = $resp.Length
            $ctx.Response.OutputStream.Write($resp, 0, $resp.Length)
        } catch {
            $ctx.Response.StatusCode = 500
        }
        $ctx.Response.Close()
        continue
    }

    # GET /api/load — read data.json
    if ($path -eq "/api/load" -and $ctx.Request.HttpMethod -eq "GET") {
        if (Test-Path $dataFile -PathType Leaf) {
            $buf = [System.IO.File]::ReadAllBytes($dataFile)
            $ctx.Response.ContentType = "application/json; charset=utf-8"
            $ctx.Response.ContentLength64 = $buf.Length
            $ctx.Response.Headers.Add("Cache-Control", "no-cache, no-store")
            $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
        $ctx.Response.Close()
        continue
    }

    # Static file serving
    $file = Join-Path $root $path.TrimStart("/")
    if (Test-Path $file -PathType Leaf) {
        $buf = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file)
        $mime = switch ($ext) {
            ".html"  { "text/html; charset=utf-8" }
            ".js"    { "application/javascript" }
            ".css"   { "text/css" }
            ".json"  { "application/json" }
            ".png"   { "image/png" }
            ".jpg"   { "image/jpeg" }
            ".svg"   { "image/svg+xml" }
            ".webp"  { "image/webp" }
            ".woff2" { "font/woff2" }
            ".woff"  { "font/woff" }
            default  { "application/octet-stream" }
        }
        $ctx.Response.ContentType = $mime
        $ctx.Response.ContentLength64 = $buf.Length
        $ctx.Response.Headers.Add("Cache-Control", "no-cache")
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
