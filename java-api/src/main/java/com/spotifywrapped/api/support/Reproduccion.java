package com.spotifywrapped.api.support;

import java.time.LocalDateTime;

/** Una reproducción de música del export de Spotify, ya filtrada y con la hora de Caracas. */
public record Reproduccion(
        LocalDateTime playedAt,
        int msPlayed,
        String cancion,
        String artista,
        String album,
        String uri,
        String razonInicio,
        String razonFin,
        Boolean shuffle,
        Boolean skipped) {
}
