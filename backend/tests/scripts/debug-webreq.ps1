$req = [System.Net.WebRequest]::Create("http://localhost:3000/health")
$req.Method = "GET"
try {
    $resp = $req.GetResponse()
    Write-Host "Status: $([int]$resp.StatusCode)"
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host "Body: $($reader.ReadToEnd())"
    $reader.Close(); $resp.Close()
} catch [System.Net.WebException] {
    Write-Host "WebEx: $($_.Exception.Message)"
} catch {
    Write-Host "Ex: $($_.Exception.Message)"
}
