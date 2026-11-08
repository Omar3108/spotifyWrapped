package com.spotifywrapped.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.Comparacion;
import com.spotifywrapped.api.service.CompareService;

@RestController
@RequestMapping("/api/wrapped")
public class CompareController {

    private final CompareService comparaciones;

    public CompareController(CompareService comparaciones) {
        this.comparaciones = comparaciones;
    }

    /** Compara dos perfiles: coincidencias de artistas y canciones y quién descubrió antes a cada artista. */
    @GetMapping("/compare")
    public Comparacion comparar(@RequestParam int a, @RequestParam int b) {
        return comparaciones.comparar(a, b);
    }
}
