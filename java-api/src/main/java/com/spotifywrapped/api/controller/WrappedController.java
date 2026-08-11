package com.spotifywrapped.api.controller;

import com.spotifywrapped.api.dto.*;
import com.spotifywrapped.api.service.WrappedService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}