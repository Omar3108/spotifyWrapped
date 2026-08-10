"""
parser.py
Lee todos los JSON del historial extendido de Spotify en data/raw/,
los une y limpia, dejando un DataFrame listo para insertar en SQL Server.
"""

import json
import glob
from pathlib import Path
import pandas as pd

RAW_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "raw"
UMBRAL_MS_MINIMO = 30_000  # 30 segundos: por debajo de esto, no cuenta como "escucha real"


def cargar_archivos_json(carpeta: Path) -> pd.DataFrame:
    """Lee todos los .json de la carpeta y los junta en un solo DataFrame."""
    archivos = sorted(glob.glob(str(carpeta / "*.json")))

    if not archivos:
        raise FileNotFoundError(f"No se encontraron archivos .json en {carpeta}")

    print(f"Encontrados {len(archivos)} archivos:")
    for a in archivos:
        print(f"  - {Path(a).name}")

    dataframes = []
    for archivo in archivos:
        with open(archivo, encoding="utf-8") as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        dataframes.append(df)

    df_completo = pd.concat(dataframes, ignore_index=True)
    print(f"\nTotal de registros crudos: {len(df_completo)}")
    return df_completo


def limpiar_datos(df: pd.DataFrame) -> pd.DataFrame:
    """Filtra solo reproducciones de música (no podcasts/audiobooks) y con duración válida."""

    total_original = len(df)  # <-- guardamos el número ANTES de tocar nada

    # Solo nos quedamos con música: track_name no nulo
    df = df[df["master_metadata_track_name"].notna()].copy()

    # Descartamos reproducciones muy cortas (menos de 30 seg = no cuenta)
    df = df[df["ms_played"] >= UMBRAL_MS_MINIMO].copy()

    # Convertimos el timestamp de texto a tipo datetime real
    df["ts"] = pd.to_datetime(df["ts"]).dt.tz_convert("America/Caracas").dt.tz_localize(None)
    
    # Nos quedamos solo con las columnas que nos importan para el proyecto
    columnas_utiles = [
        "ts",
        "ms_played",
        "master_metadata_track_name",
        "master_metadata_album_artist_name",
        "master_metadata_album_album_name",
        "spotify_track_uri",
        "reason_start",
        "reason_end",
        "shuffle",
        "skipped",
    ]
    df = df[columnas_utiles].rename(columns={
        "ts": "played_at",
        "master_metadata_track_name": "track_name",
        "master_metadata_album_artist_name": "artist_name",
        "master_metadata_album_album_name": "album_name",
        "spotify_track_uri": "spotify_uri",
    })

    df = df.sort_values("played_at").reset_index(drop=True)

    descartados = total_original - len(df)  # <-- ahora sí compara contra el total real

    print(f"Registros después de limpiar: {len(df)}")
    print(f"Registros descartados: {descartados}")  # se calcula bien abajo, ver nota

    return df


def main():
    df_crudo = cargar_archivos_json(RAW_DATA_PATH)
    df_limpio = limpiar_datos(df_crudo)

    print("\nPrimeras filas del resultado:")
    print(df_limpio.head())

    print(f"\nRango de fechas: {df_limpio['played_at'].min()} → {df_limpio['played_at'].max()}")
    print(f"Artistas únicos: {df_limpio['artist_name'].nunique()}")
    print(f"Canciones únicas: {df_limpio['track_name'].nunique()}")

    return df_limpio


if __name__ == "__main__":
    main()