$port = 8421
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root "data.json"
$utf8 = New-Object System.Text.UTF8Encoding $false
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

function Send-Json($ctx, $obj) {
    try {
        $buf = [System.Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 100 -Compress))
        $ctx.Response.ContentType = "application/json; charset=utf-8"
        $ctx.Response.ContentLength64 = $buf.Length
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    } catch {
        Write-Host "Warning: Failed to send JSON response - $($_.Exception.Message)"
    }
}

function Send-Status($ctx, $code, $msg) {
    try {
        $buf = [System.Text.Encoding]::UTF8.GetBytes($msg)
        $ctx.Response.StatusCode = $code
        $ctx.Response.ContentType = "text/plain; charset=utf-8"
        $ctx.Response.ContentLength64 = $buf.Length
        $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
    } catch {
        Write-Host "Warning: Failed to send status response - $($_.Exception.Message)"
    }
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
        $path = $ctx.Request.Url.AbsolutePath
        $method = $ctx.Request.HttpMethod

        # --- API: load data ---
        if ($path -eq "/api/load" -and $method -eq "GET") {
            if (Test-Path $dataFile -PathType Leaf) {
                try {
                    $buf = $utf8.GetBytes([System.IO.File]::ReadAllText($dataFile, $utf8))
                    $ctx.Response.ContentType = "application/json; charset=utf-8"
                    $ctx.Response.ContentLength64 = $buf.Length
                    $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
                } catch {
                    Send-Status $ctx 500 "Failed to read data file"
                }
            } else {
                Send-Json $ctx @{}
            }
            try { $ctx.Response.Close() } catch {}
            continue
        }

        # --- API: save data ---
        if ($path -eq "/api/save" -and ($method -eq "POST" -or $method -eq "PUT")) {
            try {
                $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()
                [System.IO.File]::WriteAllText($dataFile, $body, $utf8)
                Send-Status $ctx 200 "OK"
            } catch {
                Send-Status $ctx 500 $_.Exception.Message
            }
            try { $ctx.Response.Close() } catch {}
            continue
        }

        # --- Static files ---
        if ($path -eq "/") { $path = "/index.html" }
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
            try {
                $ctx.Response.ContentType = $mime
                $ctx.Response.ContentLength64 = $buf.Length
                $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
            } catch {
                Write-Host "Warning: Failed to send file $path - $($_.Exception.Message)"
            }
        } else {
            $ctx.Response.StatusCode = 404
        }
        try { $ctx.Response.Close() } catch {}
    } catch {
        Write-Host "Warning: Request processing error - $($_.Exception.Message)"
        try { $ctx.Response.Close() } catch {}
    }
}
