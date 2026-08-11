package com.spotifywrapped.api.controller;

import com.spotifywrapped.api.model.Artist;
import com.spotifywrapped.api.repository.ArtistRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ArtistController {

    private final ArtistRepository artistRepository;

    // Inyección de dependencias por constructor
    public ArtistController(ArtistRepository artistRepository) {
        this.artistRepository = artistRepository;
    }

    @GetMapping("/api/artists")
    public List<Artist> obtenerTodosLosArtistas() {
        return artistRepository.findAll();
    }
}