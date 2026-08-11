package com.spotifywrapped.api.model;

import jakarta.persistence.*;

@Entity
@Table(name = "tracks")
public class Track {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "track_id")
    private Integer trackId;

    @Column(name = "track_name", nullable = false)
    private String trackName;

    @Column(name = "album_name")
    private String albumName;

    @Column(name = "spotify_uri", unique = true)
    private String spotifyUri;

    // Relación: muchas canciones pertenecen a UN artista
    @ManyToOne
    @JoinColumn(name = "artist_id")
    private Artist artist;

    public Track() {
    }

    // Getters y setters
    public Integer getTrackId() {
        return trackId;
    }

    public void setTrackId(Integer trackId) {
        this.trackId = trackId;
    }

    public String getTrackName() {
        return trackName;
    }

    public void setTrackName(String trackName) {
        this.trackName = trackName;
    }

    public String getAlbumName() {
        return albumName;
    }

    public void setAlbumName(String albumName) {
        this.albumName = albumName;
    }

    public String getSpotifyUri() {
        return spotifyUri;
    }

    public void setSpotifyUri(String spotifyUri) {
        this.spotifyUri = spotifyUri;
    }

    public Artist getArtist() {
        return artist;
    }

    public void setArtist(Artist artist) {
        this.artist = artist;
    }
}