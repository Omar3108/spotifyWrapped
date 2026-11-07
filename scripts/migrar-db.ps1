# Copia spotify_wrapped del contenedor antiguo (sqlserver_spotify) al servicio db del compose.
# No modifica ni borra el contenedor antiguo. Requiere `docker compose up -d db` y .env creado.
# Los .sql se copian a los contenedores para evitar problemas de comillas entre PowerShell y sh.
$ErrorActionPreference = "Stop"
$old = "sqlserver_spotify"; $new = "spotify-wrapped-db-1"
$dir = Join-Path $env:TEMP "sw-migracion"; New-Item -ItemType Directory -Force $dir | Out-Null
Set-Content "$dir\b.sql" "BACKUP DATABASE spotify_wrapped TO DISK='/tmp/sw.bak' WITH INIT, COPY_ONLY"
Set-Content "$dir\r.sql" "RESTORE DATABASE spotify_wrapped FROM DISK='/tmp/sw.bak' WITH MOVE 'spotify_wrapped' TO '/var/opt/mssql/data/spotify_wrapped.mdf', MOVE 'spotify_wrapped_log' TO '/var/opt/mssql/data/spotify_wrapped_log.ldf', REPLACE"
function Sql($c, $f) { docker exec $c sh -c "/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P `$MSSQL_SA_PASSWORD -b -i /tmp/$f"; if ($LASTEXITCODE) { throw "sqlcmd falló en $c" } }
docker cp "$dir\b.sql" "${old}:/tmp/mig_b.sql"; docker cp "$dir\r.sql" "${new}:/tmp/mig_r.sql"
Sql $old mig_b.sql
docker cp "${old}:/tmp/sw.bak" "$dir\sw.bak"; docker cp "$dir\sw.bak" "${new}:/tmp/sw.bak"
docker exec -u 0 $new chown mssql:mssql /tmp/sw.bak
Sql $new mig_r.sql
Write-Host "Hecho. Compara conteos con ambos contenedores; los .bak temporales quedan en /tmp de los contenedores y en $dir (bórralos a mano)."
