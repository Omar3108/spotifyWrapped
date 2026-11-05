package com.spotifywrapped.api.dto;

import java.time.LocalDate;
import java.util.List;

/** porDia solo viene relleno en rangos de hasta RangeService.DIAS_MAXIMOS_POR_DIA días. */
public record RangeStats(
        LocalDate from,
        LocalDate to,
        long reproducciones,
        double minutos,
        long cancionesDistintas,
        long artistasDistintos,
        PeakDay diaPico,
        List<RangeRanked> topArtistas,
        List<RangeRanked> topCanciones,
        List<RangeRanked> topAlbumes,
        List<Punto> porMes,
        List<Punto> porHora,
        List<Punto> porDia) {
}
