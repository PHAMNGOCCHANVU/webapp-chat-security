. "$PSScriptRoot\test-helpers.ps1"
Write-Host "Testing Invoke-API..."
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email="apidbg@test.com"; username="apidbgtest"; password="Test@1234"; displayName="D"
}
Write-Host "Status: $($r.Status)"
Write-Host "Body: $($r.Raw)"
if ($r.Error) { Write-Host "Error: $($r.Error)" }
