# UTF-8 without BOM — prevents JSON.parse failure in browsers
$utf8 = [System.Text.UTF8Encoding]::new($false)

$port = 8421
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root "data.json"
$parentAccessFile = Join-Path $root "parent-access.json"
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

    # GET/POST /api/parent-access — read/write parent-access.json, separate from class data
    if ($path -eq "/api/parent-access") {
        try {
            if ($ctx.Request.HttpMethod -eq "GET") {
                if (Test-Path $parentAccessFile -PathType Leaf) {
                    $buf = [System.IO.File]::ReadAllBytes($parentAccessFile)
                } else {
                    $buf = $utf8.GetBytes('{"entries":[]}')
                }
                $ctx.Response.ContentType = "application/json; charset=utf-8"
                $ctx.Response.ContentLength64 = $buf.Length
                $ctx.Response.Headers.Add("Cache-Control", "no-cache, no-store")
                $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
            } elseif ($ctx.Request.HttpMethod -eq "POST") {
                $reader = [System.IO.StreamReader]::new($ctx.Request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                $event = $body | ConvertFrom-Json
                $data = if (Test-Path $parentAccessFile -PathType Leaf) {
                    (Get-Content -Raw -Encoding UTF8 $parentAccessFile | ConvertFrom-Json)
                } else {
                    [pscustomobject]@{ entries = @(); updatedAt = $event.occurredAt }
                }
                $entries = @($data.entries)
                $date = if ($event.date) { $event.date } else { ([DateTime]$event.occurredAt).ToString("yyyy-MM-dd") }
                $id = "$date-$($event.studentId)"
                $idx = -1
                for ($i = 0; $i -lt $entries.Count; $i++) {
                    if ($entries[$i].id -eq $id) { $idx = $i; break }
                }
                $device = if ($event.device -eq "mobile") { "mobile" } else { "desktop" }
                if ($idx -lt 0) {
                    $entries += [pscustomobject]@{
                        id = $id
                        date = $date
                        studentId = $event.studentId
                        parentName = $event.parentName
                        firstAccessAt = $event.occurredAt
                        lastAccessAt = $event.occurredAt
                        loginCount = $(if ($event.type -eq "login") { 1 } else { 0 })
                        viewCount = $(if ($event.type -eq "view") { 1 } else { 0 })
                        lastDevice = $device
                        lastCountedViewAt = $(if ($event.type -eq "view") { $event.occurredAt } else { $null })
                    }
                } else {
                    $entry = $entries[$idx]
                    $countView = $false
                    if ($event.type -eq "view") {
                        if (-not $entry.lastCountedViewAt) {
                            $countView = $true
                        } else {
                            $elapsed = ([DateTime]$event.occurredAt) - ([DateTime]$entry.lastCountedViewAt)
                            $countView = $elapsed.TotalMinutes -ge 10
                        }
                    }
                    $entry.parentName = $event.parentName
                    if ($entry.firstAccessAt -gt $event.occurredAt) { $entry.firstAccessAt = $event.occurredAt }
                    if ($entry.lastAccessAt -lt $event.occurredAt) { $entry.lastAccessAt = $event.occurredAt }
                    if ($event.type -eq "login") { $entry.loginCount = [int]$entry.loginCount + 1 }
                    if ($countView) {
                        $entry.viewCount = [int]$entry.viewCount + 1
                        $entry.lastCountedViewAt = $event.occurredAt
                    }
                    $entry.lastDevice = $device
                    $entries[$idx] = $entry
                }
                $data.entries = @($entries | Sort-Object @{ Expression = "date"; Descending = $true }, @{ Expression = "lastAccessAt"; Descending = $true })
                $data.updatedAt = $event.occurredAt
                [System.IO.File]::WriteAllText($parentAccessFile, ($data | ConvertTo-Json -Depth 12), $utf8)
                $resp = $utf8.GetBytes('{"ok":true}')
                $ctx.Response.ContentType = "application/json"
                $ctx.Response.ContentLength64 = $resp.Length
                $ctx.Response.OutputStream.Write($resp, 0, $resp.Length)
            } else {
                $ctx.Response.StatusCode = 405
            }
        } catch {
            $ctx.Response.StatusCode = 500
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
