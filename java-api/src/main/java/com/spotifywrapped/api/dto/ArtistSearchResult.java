package com.spotifywrapped.api.dto;

/** Artista encontrado en el historial de un perfil. */
public interface ArtistSearchResult {
    Integer getArtistId();
    String getArtistName();
    Long getReproducciones();
}
