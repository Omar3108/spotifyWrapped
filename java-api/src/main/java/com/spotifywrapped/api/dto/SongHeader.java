package com.spotifywrapped.api.dto;

public interface SongHeader {
    Integer getTrackId();
    String getTrackName();
    String getArtistName();
    String getAlbumName();
    String getSpotifyUri();
}
