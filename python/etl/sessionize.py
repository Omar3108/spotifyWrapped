"""
sessionize.py
Agrupa reproducciones individuales en sesiones de escucha.
Una sesión termina si pasan más de UMBRAL_SESION_MIN minutos sin actividad.
"""

import pandas as pd

UMBRAL_SESION_MIN = 20  # minutos de inactividad para cortar una sesión


def asignar_sesiones(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Paso 1: diferencia de tiempo entre cada fila y la anterior
    df["gap"] = df["played_at"].diff()

    # Paso 2: True cuando el gap es mayor al umbral (ahí nace una sesión nueva)
    df["nueva_sesion"] = df["gap"] > pd.Timedelta(minutes=UMBRAL_SESION_MIN)

    # Paso 3: contador incremental de sesiones
    df["session_id"] = df["nueva_sesion"].cumsum()

    return df


def main():
    import sys
    sys.path.append("..")  # para poder importar desde etl/parser.py
    from parser import cargar_archivos_json, limpiar_datos, RAW_DATA_PATH

    df = cargar_archivos_json(RAW_DATA_PATH)
    df = limpiar_datos(df)
    df = asignar_sesiones(df)

    print(f"\nTotal de sesiones detectadas: {df['session_id'].nunique()}")
    print(f"\nTop 5 sesiones más largas (por cantidad de canciones):")
    print(df.groupby("session_id").size().sort_values(ascending=False).head())
    #pass


if __name__ == "__main__":
    main()