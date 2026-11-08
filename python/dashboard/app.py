"""
app.py
Dashboard de Spotify Wrapped - consume la API Java
"""

import os

import streamlit as st
import requests
import plotly.express as px
import pandas as pd

# Se puede sobrescribir con la variable de entorno API_BASE_URL
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080/api/wrapped").rstrip("/")
# Perfil que muestra este dashboard (id de la tabla users). Por defecto, el primero.
PERFIL_ID = os.getenv("PERFIL_ID", "1")

st.set_page_config(
    page_title="Mi Spotify Wrapped",
    page_icon="🎧",
    layout="wide"
)


@st.cache_data(ttl=300, show_spinner=False)
def _pedir_json(url, params_items):
    """Hace la petición HTTP. Cacheada 5 min; las excepciones no se cachean."""
    response = requests.get(url, params=dict(params_items) or None, timeout=10)
    response.raise_for_status()
    return response.json()


def obtener_datos(endpoint, params=None):
    """Llama a un endpoint de la API y devuelve el JSON, con manejo de errores"""
    url = f"{API_BASE_URL}/{endpoint}"
    params_items = tuple(sorted({**(params or {}), "perfil": PERFIL_ID}.items()))
    try:
        return _pedir_json(url, params_items)
    except requests.exceptions.ConnectionError:
        st.error(f"No se pudo conectar con la API en {API_BASE_URL}. ¿Está corriendo?")
        st.stop()
    except requests.exceptions.Timeout:
        st.error(f"La API tardó demasiado en responder a {endpoint}.")
        st.stop()
    except requests.exceptions.RequestException as e:
        st.error(f"Error al consultar {endpoint}: {e}")
        st.stop()


# ---- Título ----
st.title("🎧 Mi Spotify Wrapped")
st.caption("Casi 10 años de historial, analizados de punta a punta")

# ---- Resumen general ----
resumen = obtener_datos("summary")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Minutos totales", f"{resumen['totalMinutos']:,.0f}")
col2.metric("Días totales", f"{resumen['totalDias']:,.1f}")
col3.metric("Reproducciones", f"{resumen['totalReproducciones']:,}")
col4.metric("Canciones distintas", f"{resumen['cancionesDistintas']:,}")

# ---- Top artistas ----
st.header("🎤 Tus artistas más escuchados")

top_n = st.slider("¿Cuántos artistas mostrar?", min_value=5, max_value=20, value=10, key="slider_artistas")
top_artistas = obtener_datos("top-artists", params={"limit": top_n})

df_artistas = pd.DataFrame(top_artistas)
df_artistas["minutosTotales"] = df_artistas["minutosTotales"].round(0).astype(int)

fig = px.bar(
    df_artistas,
    x="reproducciones",
    y="artistName",
    orientation="h",
    labels={"reproducciones": "Reproducciones", "artistName": "Artista"},
    color="reproducciones",
    color_continuous_scale="Greens",
    hover_data={"minutosTotales": True},
)
fig.update_layout(yaxis={'categoryorder': 'total ascending'})
st.plotly_chart(fig, use_container_width=True)

# ---- Top canciones de todos los tiempos ----
st.header("🎵 Tus canciones más escuchadas")

top_n_canciones = st.slider("¿Cuántas canciones mostrar?", min_value=5, max_value=20, value=10, key="slider_canciones")
top_canciones = obtener_datos("top-tracks", params={"limit": top_n_canciones})

df_canciones = pd.DataFrame(top_canciones)
df_canciones["minutos"] = df_canciones["minutos"].round(0).astype(int)
df_canciones["etiqueta"] = df_canciones["trackName"] + " — " + df_canciones["artistName"]

fig_canciones = px.bar(
    df_canciones,
    x="reproducciones",
    y="etiqueta",
    orientation="h",
    labels={"reproducciones": "Reproducciones", "etiqueta": "Canción"},
    color="reproducciones",
    color_continuous_scale="Greens",
    hover_data={"minutos": True},
)
fig_canciones.update_layout(yaxis={'categoryorder': 'total ascending'})
st.plotly_chart(fig_canciones, use_container_width=True)


# ---- Top álbumes de todos los tiempos ----
st.header("💿 Tus álbumes más escuchados")

top_n_albumes = st.slider("¿Cuántos álbumes mostrar?", min_value=5, max_value=20, value=10, key="slider_albumes")
top_albumes = obtener_datos("top-albums", params={"limit": top_n_albumes})

df_albumes_general = pd.DataFrame(top_albumes)
df_albumes_general["minutos"] = df_albumes_general["minutos"].round(0).astype(int)
df_albumes_general["etiqueta"] = df_albumes_general["albumName"] + " — " + df_albumes_general["artistName"]

fig_albumes_general = px.bar(
    df_albumes_general,
    x="reproducciones",
    y="etiqueta",
    orientation="h",
    labels={"reproducciones": "Reproducciones", "etiqueta": "Álbum"},
    color="reproducciones",
    color_continuous_scale="Greens",
    hover_data={"minutos": True},
)
fig_albumes_general.update_layout(yaxis={'categoryorder': 'total ascending'})
st.plotly_chart(fig_albumes_general, use_container_width=True)

# ---- Evolución musical por año ----
st.header("📅 Tu evolución musical")

top_por_anio = obtener_datos("top-artist-by-year")
df_anios = pd.DataFrame(top_por_anio)
df_anios["minutos"] = df_anios["minutos"].round(0).astype(int)
df_anios["etiqueta"] = df_anios["artistName"] + " (" + df_anios["reproducciones"].astype(str) + " reprod.)"

fig2 = px.bar(
    df_anios,
    x="anio",
    y="minutos",
    text="etiqueta",
    labels={"anio": "Año", "minutos": "Minutos"},
    color="minutos",
    color_continuous_scale="Greens",
    hover_data={"reproducciones": True},
)
fig2.update_traces(textposition="outside")
fig2.update_layout(xaxis=dict(dtick=1))
st.plotly_chart(fig2, use_container_width=True)

# ---- Patrón por hora del día ----
st.header("🕐 ¿A qué hora escuchas más música?")

patron_hora = obtener_datos("hourly-pattern")
df_horas = pd.DataFrame(patron_hora).round(0)

fig3 = px.area(
    df_horas,
    x="horaDelDia",
    y="minutos",
    labels={"horaDelDia": "Hora del día", "minutos": "Minutos"},
)
fig3.update_layout(xaxis=dict(dtick=1))
fig3.update_traces(line_color="#1DB954", fillcolor="rgba(29, 185, 84, 0.3)")
st.plotly_chart(fig3, use_container_width=True)

# ---- Patrón por día de la semana ----
st.header("📆 Tu semana musical")

patron_semana = obtener_datos("weekday-pattern")
df_semana = pd.DataFrame(patron_semana).round(0)

# Orden correcto de días (la API los da ordenados, pero por si acaso)
orden_dias = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
nombres_es = {
    "Sunday": "Domingo", "Monday": "Lunes", "Tuesday": "Martes",
    "Wednesday": "Miércoles", "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado"
}
df_semana["diaSemana"] = df_semana["diaSemana"].map(nombres_es)

fig4 = px.bar(
    df_semana,
    x="diaSemana",
    y="minutos",
    labels={"diaSemana": "Día", "minutos": "Minutos"},
    color="minutos",
    color_continuous_scale="Greens",
    category_orders={"diaSemana": [nombres_es[d] for d in orden_dias]},
)
st.plotly_chart(fig4, use_container_width=True)

# ---- Datos destacados ----
st.header("✨ Datos destacados")

col1, col2, col3 = st.columns(3)

# Racha más larga
rachas = obtener_datos("longest-streaks", params={"limit": 1})
with col1:
    st.subheader("🔥 Tu racha más larga")
    if rachas:
        racha = rachas[0]
        st.metric("Días consecutivos", racha["diasConsecutivos"])
        st.caption(f"Del {racha['inicioRacha']} al {racha['finRacha']}")
    else:
        st.info("No hay datos de rachas.")

# Sesión más larga
sesiones = obtener_datos("longest-sessions", params={"limit": 1})
with col2:
    st.subheader("🎧 Tu sesión más larga")
    if sesiones:
        sesion = sesiones[0]
        st.metric("Minutos seguidos", f"{sesion['minutosTotales']:,.0f}")
        st.caption(f"{sesion['trackCount']} canciones sin parar")
    else:
        st.info("No hay datos de sesiones.")

# Tasa de skip
skip = obtener_datos("skip-rate")
with col3:
    st.subheader("⏭️ Tu tasa de skip")
    st.metric("Porcentaje", f"{skip['porcentajeSkip']:.1f}%")
    st.caption(f"{skip['totalSkips']:,} canciones saltadas")

    # ---- Wrapped por año ----
st.header("📊 Tu Wrapped año por año")

anio_actual = pd.Timestamp.now().year
anio_min = int(pd.to_datetime(resumen["primeraReproduccion"]).year)

anio_seleccionado = st.selectbox(
    "Elige un año",
    options=list(range(anio_actual, anio_min - 1, -1)),  # del más reciente al más viejo
)

col_izq, col_der = st.columns(2)

# Top artistas del año
top_artistas_anio = obtener_datos(f"year/{anio_seleccionado}/top-artists", params={"limit": 5})
with col_izq:
    st.subheader(f"🎤 Top artistas {anio_seleccionado}")
    if top_artistas_anio:
        df_ta = pd.DataFrame(top_artistas_anio)
        for i, row in df_ta.iterrows():
            st.write(f"**{i + 1}. {row['artistName']}** — {row['reproducciones']:,} reproducciones ({row['minutosTotales']:,.0f} min)")
    else:
        st.info("No hay datos para este año.")

# Top canciones del año
top_canciones_anio = obtener_datos(f"year/{anio_seleccionado}/top-tracks", params={"limit": 5})
with col_der:
    st.subheader(f"🎵 Top canciones {anio_seleccionado}")
    if top_canciones_anio:
        df_tc = pd.DataFrame(top_canciones_anio)
        for i, row in df_tc.iterrows():
            st.write(f"**{i + 1}. {row['trackName']}** — {row['artistName']} ({row['reproducciones']:,} reproducciones, {row['minutos']:,.0f} min)")
    else:
        st.info("No hay datos para este año.")

# Top álbumes del año (ancho completo, debajo de las 2 columnas)
st.subheader(f"💿 Top álbumes {anio_seleccionado}")
top_albumes_anio = obtener_datos(f"year/{anio_seleccionado}/top-albums", params={"limit": 5})
if top_albumes_anio:
    df_alb = pd.DataFrame(top_albumes_anio)
    df_alb["minutos"] = df_alb["minutos"].round(0).astype(int)
    df_alb["etiqueta"] = df_alb["albumName"] + " — " + df_alb["artistName"]

    fig_albumes = px.bar(
        df_alb,
        x="reproducciones",
        y="etiqueta",
        orientation="h",
        labels={"reproducciones": "Reproducciones", "etiqueta": "Álbum"},
        color="reproducciones",
        color_continuous_scale="Greens",
        hover_data={"minutos": True},
    )
    fig_albumes.update_layout(yaxis={'categoryorder': 'total ascending'})
    st.plotly_chart(fig_albumes, use_container_width=True)
else:
    st.info("No hay datos de álbumes para este año.")