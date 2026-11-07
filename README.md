# Spotify Wrapped (histórico personal)

Análisis de tu historial de Spotify: ETL en Python → SQL Server → API Spring Boot → front React.
Este README cubre el entorno **Docker local con HTTPS**.

## Arquitectura

```
navegador ──https──► web (Nginx, 80/443) ──► api (Spring Boot, :8080 interno) ──► db (SQL Server, :1433 interno)
```

- Solo `web` publica puertos, y solo en `127.0.0.1` (80 redirige a 443).
- `api` y `db` no son accesibles desde el host. `db` vive en una red `internal`, sin salida a internet.
- Los tres contenedores corren sin root, con `cap_drop: ALL`, `no-new-privileges` y límites de CPU/RAM. `web` y `api` además con sistema de archivos de solo lectura.
- La API de Spotify **no** se usa con credenciales: los datos vienen de tu export JSON y las portadas del oEmbed público. El único secreto es la contraseña de SQL Server.

## Requisitos
Docker Desktop y [mkcert](https://github.com/FiloSottile/mkcert) (`winget install FiloSottile.mkcert`, luego abre una terminal nueva).

## Puesta en marcha

1. **Secretos**: copia `.env.example` a `.env` y cambia `MSSQL_SA_PASSWORD` (`.env` está en `.gitignore`; nunca lo subas).
2. **Certificados** (PowerShell, desde la raíz del repo):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\gen-certs.ps1
   ```
   Instala una CA local en tu usuario (`mkcert -install`) y crea `certs/wrapped.local.pem` y `certs/wrapped.local-key.pem` para `wrapped.local`, `localhost`, `127.0.0.1` y `::1`.
3. **Dominio** (opcional; `https://localhost` funciona sin esto). PowerShell **como administrador**:
   ```powershell
   Add-Content C:\Windows\System32\drivers\etc\hosts "127.0.0.1 wrapped.local"
   ```
4. **Arrancar**:
   ```powershell
   docker compose up -d --build
   docker compose ps
   ```
5. **Cargar los datos** (solo la primera vez):
   - Si ya tienes la base en otro SQL Server en Docker (`sqlserver_spotify`): `powershell -ExecutionPolicy Bypass -File scripts\migrar-db.ps1`. Hace un backup con `COPY_ONLY` y lo restaura en el volumen nuevo; no toca el contenedor antiguo.
   - Si partes de cero: crea la base y ejecuta `sql/schema/schema.sql` y `sql/schema/02_explore_range.sql`, y lanza el ETL de `python/etl` (necesita el puerto de la base, ver más abajo).
6. Abre <https://wrapped.local> (o <https://localhost>).

## Renovar o reinstalar certificados
Los certificados de mkcert duran ~2 años y 3 meses. Para renovarlos, repite el paso 2 y reinicia el proxy:
```powershell
docker compose restart web
```
Para quitar la CA local: `mkcert -uninstall`. Para saber dónde está: `mkcert -CAROOT`. Firefox usa su propio almacén; `mkcert -install` también lo cubre si está instalado.

## Operación
| Tarea | Comando |
|---|---|
| Logs | `docker compose logs -f api` |
| Parar | `docker compose down` (conserva la base) |
| Borrar también la base | `docker compose down -v` (**destruye el volumen `sqldata`**) |
| Reconstruir tras cambios | `docker compose up -d --build` |

## Usar la base desde el host (ETL, Streamlit)
La base no publica puerto a propósito. Si necesitas el ETL o Streamlit del host, crea un `docker-compose.override.yml` **local** (no lo subas) con:
```yaml
services:
  db:
    ports: ["127.0.0.1:1433:1433"]
```
Los scripts de `python/` leen `python/.env` (`DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

## Seguridad: qué hay y qué no
- Cabeceras en Nginx: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y CSP (`script-src 'self'`; las portadas se permiten desde `*.spotifycdn.com` y las fuentes desde Google Fonts). `style-src` lleva `'unsafe-inline'` porque Recharts y GSAP escriben estilos en línea.
- `trustServerCertificate=true` entre la API y la base: el tráfico va cifrado pero no valida identidad; es aceptable porque esa red es interna y local.
- Nginx limita las peticiones a `/api/` (30 req/s por IP).
- Esto es un entorno **local**: no está pensado para exponerse a internet.

## Desarrollo sin Docker
Ver `java-api/src/main/resources/application.properties.example` (cópialo a `application.properties`, que está ignorado) y, en `web/`, `npm install && npm run dev`. Pruebas: `npm test` / `npm run test:e2e` en `web/` y `./mvnw test` en `java-api/`.
