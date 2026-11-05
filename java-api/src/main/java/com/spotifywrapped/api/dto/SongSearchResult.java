package com.spotifywrapped.api.dto;

/** Canción (título + artista). Los datos de álbum y URI son los de su versión más escuchada. */
public interface SongSearchResult {
    Integer getTrackId();
    String getTrackName();
    String getArtistName();
    String getAlbumName();
    String getSpotifyUri();
    Integer getVersiones();
    Long getReproducciones();
}
