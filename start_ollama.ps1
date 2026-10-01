$ollamaExe = if (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
    "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
} else {
    "ollama"
}
$env:OLLAMA_HOST = "127.0.0.1:11434"
Write-Host "Starting Ollama server..."
& $ollamaExe serve
