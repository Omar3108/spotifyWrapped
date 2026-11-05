package com.spotifywrapped.api.dto;

/** Una versión concreta: una fila de tracks, que equivale a una URI de Spotify. */
public interface SongVersion {
    Integer getTrackId();
    String getAlbumName();
    String getSpotifyUri();
    Long getReproducciones();
    Double getMinutos();
}
