package com.spotifywrapped.api.model;

import jakarta.persistence.*;

@Entity
@Table(name = "artists")
public class Artist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "artist_id")
    private Integer artistId;

    @Column(name = "artist_name", nullable = false, unique = true)
    private String artistName;

    // Constructor vacío (obligatorio para JPA/Hibernate)
    public Artist() {
    }

    // Getters y setters
    public Integer getArtistId() {
        return artistId;
    }

    public void setArtistId(Integer artistId) {
        this.artistId = artistId;
    }

    public String getArtistName() {
        return artistName;
    }

    public void setArtistName(String artistName) {
        this.artistName = artistName;
    }
}