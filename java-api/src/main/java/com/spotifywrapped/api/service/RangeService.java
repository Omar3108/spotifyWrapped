package com.spotifywrapped.api.service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.spotifywrapped.api.dto.Punto;
import com.spotifywrapped.api.dto.PuntoFila;
import com.spotifywrapped.api.dto.RangeStats;
import com.spotifywrapped.api.dto.RangeTotals;
import com.spotifywrapped.api.repository.RangeQueryRepository;
import com.spotifywrapped.api.support.DateRange;
import com.spotifywrapped.api.support.TimeBuckets;

@Service
public class RangeService {

    /** Por encima de este tamaño la evolución se muestra por meses. */
    public static final int DIAS_MAXIMOS_POR_DIA = 92;

    private final RangeQueryRepository repo;

    public RangeService(RangeQueryRepository repo) {
        this.repo = repo;
    }

    @Cacheable(cacheNames = "rangos", key = "#rango.from() + '|' + #rango.to() + '|' + #limite")
    public RangeStats estadisticas(DateRange rango, int limite) {
        LocalDateTime desde = rango.desde();
        LocalDateTime hasta = rango.hastaExclusivo();
        RangeTotals t = repo.totales(desde, hasta);

        List<Punto> porDia = rango.dias() <= DIAS_MAXIMOS_POR_DIA
                ? TimeBuckets.dias(rango.from(), rango.to(), puntos(repo.porDia(desde, hasta)))
                : List.of();

        return new RangeStats(
                rango.from(), rango.to(),
                t.getReproducciones(), t.getMinutos(), t.getCancionesDistintas(), t.getArtistasDistintos(),
                repo.diaPico(desde, hasta),
                repo.topArtistas(desde, hasta, limite),
                repo.topCanciones(desde, hasta, limite),
                repo.topAlbumes(desde, hasta, limite),
                TimeBuckets.meses(YearMonth.from(rango.from()), YearMonth.from(rango.to()), puntos(repo.porMes(desde, hasta))),
                TimeBuckets.horas(puntos(repo.porHora(desde, hasta))),
                porDia);
    }

    private static List<Punto> puntos(List<PuntoFila> filas) {
        return filas.stream().map(PuntoFila::aPunto).toList();
    }
}
