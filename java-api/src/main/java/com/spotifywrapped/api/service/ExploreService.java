package com.spotifywrapped.api.service;

import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.spotifywrapped.api.dto.Punto;
import com.spotifywrapped.api.dto.PuntoFila;
import com.spotifywrapped.api.dto.SongDetail;
import com.spotifywrapped.api.dto.SongHeader;
import com.spotifywrapped.api.dto.SongSearchResult;
import com.spotifywrapped.api.dto.SongTotals;
import com.spotifywrapped.api.dto.SongVersion;
import com.spotifywrapped.api.dto.SongYear;
import com.spotifywrapped.api.repository.TrackQueryRepository;
import com.spotifywrapped.api.support.SearchPattern;
import com.spotifywrapped.api.support.TimeBuckets;

@Service
public class ExploreService {

    public static final int LIMITE_BUSQUEDA = 30;

    private final TrackQueryRepository repo;

    public ExploreService(TrackQueryRepository repo) {
        this.repo = repo;
    }

    @Cacheable(cacheNames = "busquedas", key = "#q.toLowerCase() + '|' + #limit")
    public List<SongSearchResult> buscar(String q, int limit) {
        if (!SearchPattern.esValido(q)) {
            return List.of();
        }
        return repo.buscar(SearchPattern.contiene(q), SearchPattern.empiezaPor(q), limit);
    }

    public SongDetail detalle(int id, String scope) {
        int soloVersion = soloVersion(scope);
        SongHeader cabecera = repo.cabecera(id, soloVersion);
        if (cabecera == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La canción no existe");
        }
        SongTotals totales = repo.totales(id, soloVersion);
        SongYear mejor = repo.mejorAnio(id, soloVersion);
        List<SongVersion> versiones = repo.versiones(id);
        long msHistorial = repo.msTotalHistorial();
        double porcentaje = msHistorial == 0 ? 0 : totales.getMsTotal() * 100.0 / msHistorial;

        return new SongDetail(
                id, scope,
                cabecera.getTrackName(), cabecera.getArtistName(), cabecera.getAlbumName(), cabecera.getSpotifyUri(),
                totales.getReproducciones(), totales.getMsTotal(),
                totales.getPrimera(), totales.getUltima(),
                mejor == null ? null : mejor.getAnio(),
                mejor == null ? null : mejor.getReproducciones(),
                porcentaje, versiones);
    }

    public List<Punto> linea(int id, String scope, String granularity) {
        int soloVersion = soloVersion(scope);
        if (!"month".equals(granularity) && !"year".equals(granularity)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "granularity debe ser month o year");
        }
        if (repo.cabecera(id, soloVersion) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La canción no existe");
        }
        List<Punto> filas = repo.porMes(id, soloVersion).stream().map(PuntoFila::aPunto).toList();
        return "year".equals(granularity) ? agruparPorAnio(filas) : rellenarMeses(filas);
    }

    static List<Punto> rellenarMeses(List<Punto> filas) {
        if (filas.isEmpty()) {
            return List.of();
        }
        return TimeBuckets.meses(
                YearMonth.parse(filas.get(0).periodo()),
                YearMonth.parse(filas.get(filas.size() - 1).periodo()),
                filas);
    }

    static List<Punto> agruparPorAnio(List<Punto> meses) {
        if (meses.isEmpty()) {
            return List.of();
        }
        Map<String, Punto> anios = new LinkedHashMap<>();
        for (Punto m : meses) {
            String anio = m.periodo().substring(0, 4);
            anios.merge(anio, new Punto(anio, m.reproducciones(), m.minutos(), null),
                    (a, b) -> new Punto(anio, a.reproducciones() + b.reproducciones(), a.minutos() + b.minutos(), null));
        }
        List<Punto> filas = List.copyOf(anios.values());
        return TimeBuckets.anios(
                Integer.parseInt(filas.get(0).periodo()),
                Integer.parseInt(filas.get(filas.size() - 1).periodo()),
                filas);
    }

    private static int soloVersion(String scope) {
        return switch (scope) {
            case "song" -> 0;
            case "version" -> 1;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scope debe ser song o version");
        };
    }
}
