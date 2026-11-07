# Genera (o renueva) el certificado local con mkcert. Ejecutar desde la raíz del repo.
$ErrorActionPreference = "Stop"
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    throw "mkcert no está instalado. Ejecuta: winget install FiloSottile.mkcert (y abre una terminal nueva)"
}
mkcert -install   # registra la CA local en Windows/Firefox; solo hace falta una vez
New-Item -ItemType Directory -Force certs | Out-Null
mkcert -cert-file certs/wrapped.local.pem -key-file certs/wrapped.local-key.pem wrapped.local localhost 127.0.0.1 ::1
Write-Host "Listo. Aplica el cambio con: docker compose restart web"
