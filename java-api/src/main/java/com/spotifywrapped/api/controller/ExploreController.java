package com.spotifywrapped.api.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.Punto;
import com.spotifywrapped.api.dto.SongDetail;
import com.spotifywrapped.api.dto.SongSearchResult;
import com.spotifywrapped.api.service.ArtService;
import com.spotifywrapped.api.service.ExploreService;
import com.spotifywrapped.api.support.SearchPattern;

@RestController
@RequestMapping("/api/wrapped")
public class ExploreController {

    private final ExploreService explore;
    private final ArtService art;

    public ExploreController(ExploreService explore, ArtService art) {
        this.explore = explore;
        this.art = art;
    }

    @GetMapping("/tracks/search")
    public List<SongSearchResult> buscar(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "12") int limit) {
        int limite = Math.clamp(limit, 1, ExploreService.LIMITE_BUSQUEDA);
        return explore.buscar(SearchPattern.normalizar(q), limite);
    }

    @GetMapping("/tracks/{id}")
    public SongDetail detalle(
            @PathVariable int id,
            @RequestParam(defaultValue = "song") String scope) {
        return explore.detalle(id, scope);
    }

    @GetMapping("/tracks/{id}/timeline")
    public List<Punto> linea(
            @PathVariable int id,
            @RequestParam(defaultValue = "song") String scope,
            @RequestParam(defaultValue = "month") String granularity) {
        return explore.linea(id, scope, granularity);
    }

    @GetMapping("/art")
    public Map<String, String> portadas(@RequestParam List<String> uris) {
        return art.portadas(uris);
    }
}
