$port = 3001
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}
Remove-Item "$PSScriptRoot\.next" -Recurse -Force -ErrorAction SilentlyContinue
