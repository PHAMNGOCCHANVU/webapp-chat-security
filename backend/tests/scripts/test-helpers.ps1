# ============================================================
# test-helpers.ps1 - Hàm tiện ích dùng chung cho tất cả test scripts
# ============================================================

$BASE_URL = "http://localhost:3000/api/v1"
$HEALTH_URL = "http://localhost:3000/health"
$script:PASS = 0
$script:FAIL = 0
$script:SKIP = 0
$script:SESSION_COOKIE = ""
$script:ADMIN_COOKIE = ""

function Write-Pass($msg) {
    $script:PASS++
    Write-Host "  ✅ PASS: $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    $script:FAIL++
    Write-Host "  ❌ FAIL: $msg" -ForegroundColor Red
}

function Write-Skip($msg) {
    $script:SKIP++
    Write-Host "  ⏭️  SKIP: $msg" -ForegroundColor Yellow
}

function Write-Section($title) {
    Write-Host ""
    Write-Host "━━━ $title ━━━" -ForegroundColor Cyan
}

function Invoke-API {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [hashtable]$Body = $null,
        [string]$Cookie = "",
        [hashtable]$Headers = @{}
    )
    $url = "$BASE_URL$Path"
    try {
        $req = [System.Net.WebRequest]::Create($url)
        $req.Method  = $Method
        $req.ContentType = "application/json"
        $hwReq = [System.Net.HttpWebRequest]$req
        $hwReq.Headers.Add("Origin", "http://localhost:5500")
        $hwReq.Referer = "http://localhost:5500/"
        if ($Cookie) { $hwReq.Headers.Add("Cookie", $Cookie) }
        foreach ($k in $Headers.Keys) { $hwReq.Headers.Add($k, $Headers[$k]) }

        if ($Body -and $Method -notin @("GET","DELETE")) {
            $json  = ($Body | ConvertTo-Json -Compress)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $hwReq.ContentLength = $bytes.Length
            $stream = $hwReq.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()
        }

        $resp    = $hwReq.GetResponse()
        $reader  = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $rawBody = $reader.ReadToEnd()
        $code    = [int]$resp.StatusCode
        $reader.Close(); $resp.Close()
        $parsed  = $null
        try { $parsed = $rawBody | ConvertFrom-Json } catch {}
        return @{ Status = $code; Body = $parsed; Raw = $rawBody }
    } catch [System.Net.WebException] {
        $code = [int]$_.Exception.Response.StatusCode
        $rawBody = ""
        try {
            $reader  = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $rawBody = $reader.ReadToEnd()
            $reader.Close()
        } catch {}
        $parsed = $null
        try { $parsed = $rawBody | ConvertFrom-Json } catch {}
        return @{ Status = $code; Body = $parsed; Raw = $rawBody }
    } catch {
        return @{ Status = 0; Body = $null; Error = $_.Exception.Message }
    }
}

function Get-SessionCookie {
    param([string]$Username, [string]$Password)
    try {
        $req = [System.Net.WebRequest]::Create("$BASE_URL/auth/login")
        $req.Method = "POST"
        $req.ContentType = "application/json"
        $hwReq = [System.Net.HttpWebRequest]$req
        $hwReq.Headers.Add("Origin",  "http://localhost:5500")
        $hwReq.Referer = "http://localhost:5500/"
        $json  = (@{ username = $Username; password = $Password } | ConvertTo-Json -Compress)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $hwReq.ContentLength = $bytes.Length
        $stream = $hwReq.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
        $resp   = $hwReq.GetResponse()
        $setCk  = $resp.Headers["Set-Cookie"]
        $resp.Close()
        if ($setCk) {
            $raw = ($setCk -split ";")[0]
            return [System.Uri]::UnescapeDataString($raw)
        }
    } catch {}
    return ""
}

function Print-Summary {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor White
    Write-Host "  PASS: $script:PASS  |  FAIL: $script:FAIL  |  SKIP: $script:SKIP" -ForegroundColor White
    Write-Host "═══════════════════════════════════════" -ForegroundColor White
    if ($script:FAIL -gt 0) { exit 1 } else { exit 0 }
}
