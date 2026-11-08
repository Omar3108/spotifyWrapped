package com.spotifywrapped.api.service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.spotifywrapped.api.dto.PerfilResumen;

@Service
public class PerfilService {

    public static final int LARGO_MAXIMO = 60;

    private static final String SELECT = """
            SELECT u.user_id, u.nombre, u.datos_actualizados,
                   COUNT(p.play_id) AS reproducciones,
                   MIN(p.played_at) AS primera,
                   MAX(p.played_at) AS ultima
            FROM users u
            LEFT JOIN plays p ON p.user_id = u.user_id
            %s
            GROUP BY u.user_id, u.nombre, u.datos_actualizados
            ORDER BY u.user_id
            """;

    private final JdbcTemplate db;
    private final CacheManager caches;
    private final CargaEstado carga;

    public PerfilService(JdbcTemplate db, CacheManager caches, CargaEstado carga) {
        this.db = db;
        this.caches = caches;
        this.carga = carga;
    }

    public List<PerfilResumen> listar() {
        return db.query(SELECT.formatted(""), (rs, i) -> fila(rs));
    }

    public PerfilResumen obtener(int id) {
        return db.query(SELECT.formatted("WHERE u.user_id = ?"), (rs, i) -> fila(rs), id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El perfil no existe"));
    }

    public PerfilResumen crear(String nombre) {
        String limpio = validarNombre(nombre);
        try {
            Integer id = db.queryForObject(
                    "INSERT INTO users (nombre) OUTPUT INSERTED.user_id VALUES (?)", Integer.class, limpio);
            return obtener(id);
        } catch (DuplicateKeyException e) {
            throw repetido();
        }
    }

    public PerfilResumen renombrar(int id, String nombre) {
        String limpio = validarNombre(nombre);
        try {
            if (db.update("UPDATE users SET nombre = ? WHERE user_id = ?", limpio, id) == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El perfil no existe");
            }
        } catch (DuplicateKeyException e) {
            throw repetido();
        }
        vaciarCaches();
        return obtener(id);
    }

    @Transactional
    public void limpiarDatos(int id) {
        exigir(id);
        exigirLibre();
        borrarHistorial(id);
        db.update("UPDATE users SET datos_actualizados = SYSDATETIME() WHERE user_id = ?", id);
        vaciarCaches();
    }

    @Transactional
    public void borrar(int id) {
        exigir(id);
        exigirLibre();
        borrarHistorial(id);
        db.update("DELETE FROM users WHERE user_id = ?", id);
        vaciarCaches();
    }

    public void exigir(int id) {
        Integer n = db.queryForObject("SELECT COUNT(*) FROM users WHERE user_id = ?", Integer.class, id);
        if (n == null || n == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "El perfil no existe");
        }
    }

    /** Las cachés guardan estadísticas por perfil: tras cualquier cambio de datos hay que vaciarlas. */
    public void vaciarCaches() {
        for (String nombre : caches.getCacheNames()) {
            Cache c = caches.getCache(nombre);
            if (c != null) {
                c.clear();
            }
        }
    }

    private void borrarHistorial(int id) {
        db.update("DELETE FROM plays WHERE user_id = ?", id);
        db.update("DELETE FROM sessions WHERE user_id = ?", id);
    }

    private void exigirLibre() {
        if (carga.ocupado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Hay una carga en curso. Espera a que termine.");
        }
    }

    static String validarNombre(String nombre) {
        String limpio = nombre == null ? "" : nombre.trim().replaceAll("\s+", " ");
        if (limpio.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe un nombre para el perfil");
        }
        if (limpio.length() > LARGO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El nombre puede tener hasta " + LARGO_MAXIMO + " caracteres");
        }
        if (limpio.codePoints().anyMatch(Character::isISOControl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre tiene caracteres no válidos");
        }
        return limpio;
    }

    private static ResponseStatusException repetido() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un perfil con ese nombre");
    }

    private static PerfilResumen fila(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new PerfilResumen(rs.getInt("user_id"), rs.getString("nombre"), rs.getLong("reproducciones"),
                fecha(rs.getTimestamp("primera")), fecha(rs.getTimestamp("ultima")),
                fecha(rs.getTimestamp("datos_actualizados")));
    }

    private static LocalDateTime fecha(Timestamp t) {
        return t == null ? null : t.toLocalDateTime();
    }
}
