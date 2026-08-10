"""diagnostico.py - detecta artistas 'duplicados' por espacios ocultos"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))
from parser import cargar_archivos_json, limpiar_datos, RAW_DATA_PATH

df = cargar_archivos_json(RAW_DATA_PATH)
df = limpiar_datos(df)

artistas = df["artist_name"].dropna().unique()
print(f"\nTotal artistas únicos (comparación exacta de Python): {len(artistas)}")

# ¿Cuántos quedan únicos si quitamos espacios al inicio/final?
artistas_stripped = set(a.strip() for a in artistas)
print(f"Total artistas únicos después de .strip(): {len(artistas_stripped)}")

if len(artistas_stripped) < len(artistas):
    print("\n¡Encontramos el problema! Hay artistas con espacios ocultos. Ejemplos:")
    vistos = {}
    for a in artistas:
        key = a.strip()
        if key in vistos and vistos[key] != a:
            print(f"  '{vistos[key]}' vs '{a}'")
        vistos[key] = a