package com.spotifywrapped.api.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Detalle de una canción. Con scope "song" agrega todas sus versiones, igual que
 * /top-tracks; con scope "version" cuenta solo la pista pedida.
 */
public record SongDetail(
        Integer trackId,
        String scope,
        String trackName,
        String artistName,
        String albumName,
        String spotifyUri,
        long reproducciones,
        long msTotal,
        LocalDateTime primera,
        LocalDateTime ultima,
        Integer mejorAnio,
        Long reproduccionesMejorAnio,
        double porcentajeTiempo,
        List<SongVersion> versiones) {
}
