package com.spotifywrapped.api.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spotifywrapped.api.dto.ArtistRanking;
import com.spotifywrapped.api.dto.HourlyPattern;
import com.spotifywrapped.api.dto.ListeningStreak;
import com.spotifywrapped.api.dto.LongestSession;
import com.spotifywrapped.api.dto.SkipRate;
import com.spotifywrapped.api.dto.TopAlbum;
import com.spotifywrapped.api.dto.TopTrack;
import com.spotifywrapped.api.dto.WeekdayPattern;
import com.spotifywrapped.api.dto.WrappedSummary;
import com.spotifywrapped.api.dto.YearlyTopArtist;
import com.spotifywrapped.api.service.WrappedService;

@RestController
@RequestMapping("/api/wrapped")
public class WrappedController {

    private final WrappedService wrappedService;

    public WrappedController(WrappedService wrappedService) {
        this.wrappedService = wrappedService;
    }

    @GetMapping("/summary")
    public WrappedSummary obtenerResumen() {
        return wrappedService.obtenerResumen();
    }

    @GetMapping("/top-artists")
    public List<ArtistRanking> obtenerTopArtistas(
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopArtistas(limit);
    }

    @GetMapping("/top-artist-by-year")
    public List<YearlyTopArtist> obtenerTopArtistaPorAnio() {
        return wrappedService.obtenerTopArtistaPorAnio();
    }

    @GetMapping("/longest-streaks")
    public List<ListeningStreak> obtenerRachasMasLargas(
            @RequestParam(defaultValue = "5") int limit) {
        return wrappedService.obtenerRachasMasLargas(limit);
    }

    @GetMapping("/hourly-pattern")
    public List<HourlyPattern> obtenerPatronPorHora() {
        return wrappedService.obtenerPatronPorHora();
    }

    @GetMapping("/weekday-pattern")
    public List<WeekdayPattern> obtenerPatronPorDiaSemana() {
        return wrappedService.obtenerPatronPorDiaSemana();
    }

    @GetMapping("/skip-rate")
    public SkipRate obtenerTasaSkip() {
        return wrappedService.obtenerTasaSkip();
    }

    @GetMapping("/longest-sessions")
    public List<LongestSession> obtenerSesionesMasLargas(
            @RequestParam(defaultValue = "5") int limit) {
        return wrappedService.obtenerSesionesMasLargas(limit);
    }
    @GetMapping("/year/{anio}/top-tracks")
    public List<TopTrack> obtenerTopCancionesPorAnio(
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopCancionesPorAnio(anio, limit);
    }

    @GetMapping("/year/{anio}/top-albums")
    public List<TopAlbum> obtenerTopAlbumesPorAnio(
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopAlbumesPorAnio(anio, limit);
    }

    @GetMapping("/year/{anio}/top-artists")
    public List<ArtistRanking> obtenerTopArtistasPorAnio(
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopArtistasPorAnio(anio, limit);
    }
    @GetMapping("/top-tracks")
    public List<TopTrack> obtenerTopCancionesGeneral(
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopCancionesGeneral(limit);
    }

    @GetMapping("/top-albums")
    public List<TopAlbum> obtenerTopAlbumesGeneral(
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopAlbumesGeneral(limit);
    }
}