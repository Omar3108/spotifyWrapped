package com.spotifywrapped.api.dto;

/**
 * Fila de ranking de un rango. coverUri es la canción más escuchada de ese artista o álbum.
 * artistId solo viene relleno en los rankings de artistas.
 */
public interface RangeRanked {
    Integer getTrackId();
    Integer getArtistId();
    String getNombre();
    String getArtistName();
    Long getReproducciones();
    Double getMinutos();
    String getCoverUri();
}
