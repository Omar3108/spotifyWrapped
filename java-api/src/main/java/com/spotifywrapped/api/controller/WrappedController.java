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
    public WrappedSummary obtenerResumen(@RequestParam int perfil) {
        return wrappedService.obtenerResumen(perfil);
    }

    @GetMapping("/top-artists")
    public List<ArtistRanking> obtenerTopArtistas(
            @RequestParam int perfil,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopArtistas(perfil, limit);
    }

    @GetMapping("/top-artist-by-year")
    public List<YearlyTopArtist> obtenerTopArtistaPorAnio(@RequestParam int perfil) {
        return wrappedService.obtenerTopArtistaPorAnio(perfil);
    }

    @GetMapping("/longest-streaks")
    public List<ListeningStreak> obtenerRachasMasLargas(
            @RequestParam int perfil,
            @RequestParam(defaultValue = "5") int limit) {
        return wrappedService.obtenerRachasMasLargas(perfil, limit);
    }

    @GetMapping("/hourly-pattern")
    public List<HourlyPattern> obtenerPatronPorHora(@RequestParam int perfil) {
        return wrappedService.obtenerPatronPorHora(perfil);
    }

    @GetMapping("/weekday-pattern")
    public List<WeekdayPattern> obtenerPatronPorDiaSemana(@RequestParam int perfil) {
        return wrappedService.obtenerPatronPorDiaSemana(perfil);
    }

    @GetMapping("/skip-rate")
    public SkipRate obtenerTasaSkip(@RequestParam int perfil) {
        return wrappedService.obtenerTasaSkip(perfil);
    }

    @GetMapping("/longest-sessions")
    public List<LongestSession> obtenerSesionesMasLargas(
            @RequestParam int perfil,
            @RequestParam(defaultValue = "5") int limit) {
        return wrappedService.obtenerSesionesMasLargas(perfil, limit);
    }
    @GetMapping("/year/{anio}/top-tracks")
    public List<TopTrack> obtenerTopCancionesPorAnio(
            @RequestParam int perfil,
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopCancionesPorAnio(perfil, anio, limit);
    }

    @GetMapping("/year/{anio}/top-albums")
    public List<TopAlbum> obtenerTopAlbumesPorAnio(
            @RequestParam int perfil,
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopAlbumesPorAnio(perfil, anio, limit);
    }

    @GetMapping("/year/{anio}/top-artists")
    public List<ArtistRanking> obtenerTopArtistasPorAnio(
            @RequestParam int perfil,
            @PathVariable int anio,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopArtistasPorAnio(perfil, anio, limit);
    }
    @GetMapping("/top-tracks")
    public List<TopTrack> obtenerTopCancionesGeneral(
            @RequestParam int perfil,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopCancionesGeneral(perfil, limit);
    }

    @GetMapping("/top-albums")
    public List<TopAlbum> obtenerTopAlbumesGeneral(
            @RequestParam int perfil,
            @RequestParam(defaultValue = "10") int limit) {
        return wrappedService.obtenerTopAlbumesGeneral(perfil, limit);
    }
}