"""
load_db.py
Carga el historial procesado (artists, tracks, sessions, plays) a SQL Server,
respetando las relaciones de foreign key.
"""

import os
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy.types import NVARCHAR
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(str(Path(__file__).parent))
from parser import cargar_archivos_json, limpiar_datos, RAW_DATA_PATH
from sessionize import asignar_sesiones

load_dotenv()


def crear_engine():
    """Arma el engine de SQLAlchemy a partir de las variables del .env"""
    server = os.getenv("DB_SERVER")
    port = os.getenv("DB_PORT")
    database = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")

    conn_str = (
        f"mssql+pyodbc://{user}:{password}@{server}:{port}/{database}"
        f"?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
    )
    return create_engine(conn_str)


def cargar_artistas(engine, df: pd.DataFrame) -> pd.DataFrame:
    """Inserta artistas únicos y devuelve un mapa artist_name -> artist_id"""
    artistas_unicos = df["artist_name"].dropna().drop_duplicates()
    df_artistas = pd.DataFrame({"artist_name": artistas_unicos})

    df_artistas.to_sql(
        "artists", engine, if_exists="append", index=False,
        dtype={"artist_name": NVARCHAR(255)}
    )

    mapa = pd.read_sql("SELECT artist_id, artist_name FROM artists", engine)
    print(f"Artistas insertados: {len(mapa)}")
    return mapa


def cargar_tracks(engine, df: pd.DataFrame, mapa_artistas: pd.DataFrame) -> pd.DataFrame:
    """Inserta canciones únicas (con su artist_id) y devuelve un mapa spotify_uri -> track_id"""
    tracks_unicos = (
        df[["track_name", "album_name", "artist_name", "spotify_uri"]]
        .drop_duplicates(subset="spotify_uri")
        .merge(mapa_artistas, on="artist_name", how="left")
        .drop(columns="artist_name")
    )

    tracks_unicos.to_sql(
        "tracks", engine, if_exists="append", index=False,
        dtype={
            "track_name": NVARCHAR(255),
            "album_name": NVARCHAR(255),
            "spotify_uri": NVARCHAR(100),
        }
    )

    mapa = pd.read_sql("SELECT track_id, spotify_uri FROM tracks", engine)
    print(f"Canciones insertadas: {len(mapa)}")
    return mapa

def cargar_sesiones(engine, df: pd.DataFrame):
    """Agrega estadísticas por sesión y las inserta con su session_id explícito"""
    resumen_sesiones = df.groupby("session_id").agg(
        start_time=("played_at", "min"),
        end_time=("played_at", "max"),
        total_ms=("ms_played", "sum"),
        track_count=("track_name", "count"),
    ).reset_index()

    # session_id ya viene de sessionize.py; como sessions.session_id es IDENTITY,
    # necesitamos activar IDENTITY_INSERT para poder mandar nosotros el valor
    with engine.begin() as conn:
        conn.execute(text("SET IDENTITY_INSERT sessions ON"))
        resumen_sesiones.to_sql("sessions", conn, if_exists="append", index=False)
        conn.execute(text("SET IDENTITY_INSERT sessions OFF"))

    print(f"Sesiones insertadas: {len(resumen_sesiones)}")


def cargar_plays(engine, df: pd.DataFrame, mapa_tracks: pd.DataFrame):
    """Inserta cada reproducción individual, ya resuelta con track_id"""
    df_plays = df.merge(mapa_tracks, on="spotify_uri", how="left")

    columnas_finales = [
        "track_id", "played_at", "ms_played", "shuffle",
        "skipped", "reason_start", "reason_end", "session_id",
    ]
    df_plays = df_plays[columnas_finales]

    # Insertamos en bloques (chunks) para no saturar memoria/red con 197k filas de una vez
    df_plays.to_sql("plays", engine, if_exists="append", index=False, chunksize=5000)
    print(f"Plays insertados: {len(df_plays)}")


def main():
    print("Cargando y procesando datos...")
    df = cargar_archivos_json(RAW_DATA_PATH)
    df = limpiar_datos(df)
    df = asignar_sesiones(df)

    engine = crear_engine()

    print("\nInsertando artistas...")
    mapa_artistas = cargar_artistas(engine, df)

    print("\nInsertando canciones...")
    mapa_tracks = cargar_tracks(engine, df, mapa_artistas)

    print("\nInsertando sesiones...")
    cargar_sesiones(engine, df)

    print("\nInsertando reproducciones...")
    cargar_plays(engine, df, mapa_tracks)

    print("\n¡Carga completa!")


if __name__ == "__main__":
    main()