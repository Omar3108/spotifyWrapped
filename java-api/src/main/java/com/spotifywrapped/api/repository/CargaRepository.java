package com.spotifywrapped.api.repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.sql.DataSource;

import org.springframework.stereotype.Repository;

import com.microsoft.sqlserver.jdbc.ISQLServerBulkData;
import com.microsoft.sqlserver.jdbc.SQLServerBulkCopy;
import com.microsoft.sqlserver.jdbc.SQLServerBulkCopyOptions;
import com.microsoft.sqlserver.jdbc.SQLServerConnection;
import com.microsoft.sqlserver.jdbc.SQLServerException;
import com.spotifywrapped.api.support.Reproduccion;
import com.spotifywrapped.api.support.Sesionizador.Sesion;

/**
 * Reemplaza el historial de un perfil en UNA transacción: o queda todo el historial nuevo o queda
 * exactamente el anterior. Las filas llegan con SQLServerBulkCopy a tablas temporales y de ahí se
 * pasan a las definitivas con INSERT ... SELECT, de modo que el catálogo compartido (artists, tracks)
 * solo recibe lo que todavía no tiene y los track_id existentes no cambian.
 */
@Repository
public class CargaRepository {

    public record Resultado(int reproducciones, int sesiones, int artistasNuevos, int cancionesNuevas) {
    }

    private static final String TEXTO_CAT = "NVARCHAR(255) COLLATE Latin1_General_100_CS_AS_SC";

    private static final String[] TEMPORALES = {"#cat", "#plays", "#ses"};

    private final DataSource datos;

    public CargaRepository(DataSource datos) {
        this.datos = datos;
    }

    public Resultado reemplazar(int perfil, List<Reproduccion> filas, int[] sesionPorFila, List<Sesion> sesiones)
            throws SQLException {
        try (Connection c = datos.getConnection()) {
            c.setAutoCommit(false);
            try {
                Resultado r = enTransaccion(c, perfil, filas, sesionPorFila, sesiones);
                c.commit();
                return r;
            } catch (SQLException | RuntimeException e) {
                c.rollback();
                throw e;
            } finally {
                // La conexión vuelve al pool con su sesión: sus tablas temporales no deben sobrevivir.
                try {
                    c.setAutoCommit(true);
                    soltarTemporales(c);
                } catch (SQLException ignorado) {
                    // la conexión ya no sirve; el pool la descartará
                }
            }
        }
    }

    private Resultado enTransaccion(Connection c, int perfil, List<Reproduccion> filas, int[] sesionPorFila,
                                    List<Sesion> sesiones) throws SQLException {
        // Bloquea la fila del perfil: si alguien lo borra mientras tanto, esta carga espera o falla limpia.
        try (PreparedStatement ps = c.prepareStatement("SELECT 1 FROM users WITH (UPDLOCK) WHERE user_id = ?")) {
            ps.setInt(1, perfil);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalStateException("El perfil ya no existe");
                }
            }
        }

        soltarTemporales(c);
        try (Statement st = c.createStatement()) {
            st.execute("CREATE TABLE #cat (uri NVARCHAR(100) COLLATE DATABASE_DEFAULT NOT NULL, cancion " + TEXTO_CAT
                    + " NOT NULL, album " + TEXTO_CAT + " NULL, artista " + TEXTO_CAT + " NULL)");
            st.execute("CREATE TABLE #plays (ord INT NOT NULL, played_at DATETIME2 NOT NULL, ms INT NOT NULL, "
                    + "shuf BIT NULL, skp BIT NULL, rs NVARCHAR(50) NULL, re NVARCHAR(50) NULL, "
                    + "uri NVARCHAR(100) COLLATE DATABASE_DEFAULT NOT NULL, ses INT NOT NULL)");
            st.execute("CREATE TABLE #ses (idx INT NOT NULL, inicio DATETIME2 NOT NULL, fin DATETIME2 NOT NULL, "
                    + "total_ms INT NOT NULL, pistas INT NOT NULL)");
        }

        SQLServerConnection sql = c.unwrap(SQLServerConnection.class);
        copiar(sql, "#cat", columnasCat(), filasCat(filas));
        copiar(sql, "#plays", columnasPlays(), filasPlays(filas, sesionPorFila));
        copiar(sql, "#ses", columnasSes(), filasSes(sesiones));

        int artistasNuevos;
        int cancionesNuevas;
        int plays;
        try (Statement st = c.createStatement()) {
            // El UNIQUE de artists usa su propia collation: la deduplicación la hace SQL, no Java.
            artistasNuevos = st.executeUpdate("""
                    INSERT INTO artists (artist_name)
                    SELECT DISTINCT c.artista FROM #cat c
                    WHERE c.artista IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM artists a WHERE a.artist_name = c.artista)
                    """);
            cancionesNuevas = st.executeUpdate("""
                    INSERT INTO tracks (track_name, album_name, artist_id, spotify_uri)
                    SELECT c.cancion, c.album, a.artist_id, c.uri
                    FROM #cat c
                    LEFT JOIN artists a ON a.artist_name = c.artista
                    WHERE NOT EXISTS (SELECT 1 FROM tracks t WHERE t.spotify_uri = c.uri)
                    """);
        }

        borrarDatos(c, perfil);

        int base;
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(
                "SELECT COALESCE(MAX(session_id), -1) + 1 FROM sessions")) {
            rs.next();
            base = rs.getInt(1);
        }

        try (Statement st = c.createStatement()) {
            st.execute("SET IDENTITY_INSERT sessions ON");
            try (PreparedStatement ps = c.prepareStatement("""
                    INSERT INTO sessions (session_id, user_id, start_time, end_time, total_ms, track_count)
                    SELECT ? + idx, ?, inicio, fin, total_ms, pistas FROM #ses
                    """)) {
                ps.setInt(1, base);
                ps.setInt(2, perfil);
                ps.executeUpdate();
            } finally {
                // SET no se deshace con el rollback: hay que apagarlo siempre, o la conexión del pool queda así.
                st.execute("SET IDENTITY_INSERT sessions OFF");
            }
        }

        try (PreparedStatement ps = c.prepareStatement("""
                INSERT INTO plays (user_id, track_id, played_at, ms_played, shuffle, skipped,
                                   reason_start, reason_end, session_id)
                SELECT ?, t.track_id, p.played_at, p.ms, p.shuf, p.skp, p.rs, p.re, ? + p.ses
                FROM #plays p
                JOIN tracks t ON t.spotify_uri = p.uri
                ORDER BY p.ord
                """)) {
            ps.setInt(1, perfil);
            ps.setInt(2, base);
            plays = ps.executeUpdate();
        }
        if (plays != filas.size()) {
            throw new IllegalStateException("Se esperaban " + filas.size() + " reproducciones y se insertaron " + plays);
        }

        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE users SET datos_actualizados = SYSDATETIME() WHERE user_id = ?")) {
            ps.setInt(1, perfil);
            ps.executeUpdate();
        }
        return new Resultado(plays, sesiones.size(), artistasNuevos, cancionesNuevas);
    }

    /** Borra el historial del perfil, no su fila ni el catálogo compartido. Orden: plays referencia a sessions. */
    public static void borrarDatos(Connection c, int perfil) throws SQLException {
        for (String tabla : new String[] {"plays", "sessions"}) {
            try (PreparedStatement ps = c.prepareStatement("DELETE FROM " + tabla + " WHERE user_id = ?")) {
                ps.setInt(1, perfil);
                ps.executeUpdate();
            }
        }
    }

    private static void soltarTemporales(Connection c) throws SQLException {
        try (Statement st = c.createStatement()) {
            for (String t : TEMPORALES) {
                st.execute("IF OBJECT_ID('tempdb..%s') IS NOT NULL DROP TABLE %s".formatted(t, t));
            }
        }
    }

    // ---- SQLServerBulkCopy -------------------------------------------------------------------------------

    private record Col(String nombre, int tipo, int precision, int escala) {
    }

    private static void copiar(SQLServerConnection c, String destino, List<Col> columnas, Iterator<Object[]> filas)
            throws SQLException {
        SQLServerBulkCopyOptions opciones = new SQLServerBulkCopyOptions();
        opciones.setBatchSize(10_000);
        opciones.setBulkCopyTimeout(0);
        try (SQLServerBulkCopy bulk = new SQLServerBulkCopy(c)) {
            bulk.setBulkCopyOptions(opciones);
            bulk.setDestinationTableName(destino);
            bulk.writeToServer(new FilasBulk(columnas, filas));
        }
    }

    private static final class FilasBulk implements ISQLServerBulkData {
        private final List<Col> columnas;
        private final Iterator<Object[]> filas;
        private Object[] actual;

        FilasBulk(List<Col> columnas, Iterator<Object[]> filas) {
            this.columnas = columnas;
            this.filas = filas;
        }

        @Override
        public Set<Integer> getColumnOrdinals() {
            Set<Integer> ordinales = new LinkedHashSet<>();
            for (int i = 1; i <= columnas.size(); i++) {
                ordinales.add(i);
            }
            return ordinales;
        }

        @Override
        public String getColumnName(int columna) {
            return columnas.get(columna - 1).nombre();
        }

        @Override
        public int getColumnType(int columna) {
            return columnas.get(columna - 1).tipo();
        }

        @Override
        public int getPrecision(int columna) {
            return columnas.get(columna - 1).precision();
        }

        @Override
        public int getScale(int columna) {
            return columnas.get(columna - 1).escala();
        }

        @Override
        public Object[] getRowData() throws SQLServerException {
            return actual;
        }

        @Override
        public boolean next() throws SQLServerException {
            if (!filas.hasNext()) {
                return false;
            }
            actual = filas.next();
            return true;
        }
    }

    private static List<Col> columnasCat() {
        return List.of(new Col("uri", Types.NVARCHAR, 100, 0), new Col("cancion", Types.NVARCHAR, 255, 0),
                new Col("album", Types.NVARCHAR, 255, 0), new Col("artista", Types.NVARCHAR, 255, 0));
    }

    private static List<Col> columnasPlays() {
        return List.of(new Col("ord", Types.INTEGER, 10, 0), new Col("played_at", Types.TIMESTAMP, 27, 7),
                new Col("ms", Types.INTEGER, 10, 0), new Col("shuf", Types.BIT, 1, 0), new Col("skp", Types.BIT, 1, 0),
                new Col("rs", Types.NVARCHAR, 50, 0), new Col("re", Types.NVARCHAR, 50, 0),
                new Col("uri", Types.NVARCHAR, 100, 0), new Col("ses", Types.INTEGER, 10, 0));
    }

    private static List<Col> columnasSes() {
        return List.of(new Col("idx", Types.INTEGER, 10, 0), new Col("inicio", Types.TIMESTAMP, 27, 7),
                new Col("fin", Types.TIMESTAMP, 27, 7), new Col("total_ms", Types.INTEGER, 10, 0),
                new Col("pistas", Types.INTEGER, 10, 0));
    }

    /** Una fila por URI, la primera en el tiempo: define el título, álbum y artista de esa pista. */
    private static Iterator<Object[]> filasCat(List<Reproduccion> filas) {
        Map<String, Reproduccion> porUri = new LinkedHashMap<>();
        for (Reproduccion r : filas) {
            porUri.putIfAbsent(r.uri(), r);
        }
        List<Object[]> salida = new ArrayList<>(porUri.size());
        for (Reproduccion r : porUri.values()) {
            salida.add(new Object[] {r.uri(), r.cancion(), r.album(), r.artista()});
        }
        return salida.iterator();
    }

    private static Iterator<Object[]> filasPlays(List<Reproduccion> filas, int[] sesionPorFila) {
        return new Iterator<>() {
            private int i = 0;

            @Override
            public boolean hasNext() {
                return i < filas.size();
            }

            @Override
            public Object[] next() {
                Reproduccion r = filas.get(i);
                Object[] fila = {i, Timestamp.valueOf(r.playedAt()), r.msPlayed(), r.shuffle(), r.skipped(),
                        r.razonInicio(), r.razonFin(), r.uri(), sesionPorFila[i]};
                i++;
                return fila;
            }
        };
    }

    private static Iterator<Object[]> filasSes(List<Sesion> sesiones) {
        return sesiones.stream()
                .map(s -> new Object[] {s.indice(), Timestamp.valueOf(s.inicio()), Timestamp.valueOf(s.fin()),
                        s.totalMs(), s.pistas()})
                .iterator();
    }
}
