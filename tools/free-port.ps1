$conn = Get-NetTCPConnection -LocalPort 31415 -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Host "Killed PID:" $conn.OwningProcess
} else {
    Write-Host "No listener on 31415"
}
