$ollamaExe = "C:\Users\Nikhil kumar\AppData\Local\Programs\Ollama\ollama.exe"
$env:OLLAMA_HOST = "127.0.0.1:11434"
Write-Host "Starting Ollama server..."
& $ollamaExe serve
