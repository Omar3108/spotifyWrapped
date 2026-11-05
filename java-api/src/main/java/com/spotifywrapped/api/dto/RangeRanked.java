package com.spotifywrapped.api.dto;

/** Fila de ranking de un rango. coverUri es la canción más escuchada de ese artista o álbum. */
public interface RangeRanked {
    Integer getTrackId();
    String getNombre();
    String getArtistName();
    Long getReproducciones();
    Double getMinutos();
    String getCoverUri();
}
