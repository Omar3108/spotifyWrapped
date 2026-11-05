package com.spotifywrapped.api.service;

import java.util.List;

import org.springframework.stereotype.Service;

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
import com.spotifywrapped.api.repository.PlayRepository;
import com.spotifywrapped.api.repository.SessionRepository;

@Service
public class WrappedService {

    private final PlayRepository playRepository;
    private final SessionRepository sessionRepository;

    public WrappedService(PlayRepository playRepository, SessionRepository sessionRepository) {
        this.playRepository = playRepository;
        this.sessionRepository = sessionRepository;
    }

    public WrappedSummary obtenerResumen() {
        return playRepository.obtenerResumenGeneral();
    }

    public List<ArtistRanking> obtenerTopArtistas(int limite) {
        return playRepository.obtenerTopArtistas(limite);
    }

    public List<YearlyTopArtist> obtenerTopArtistaPorAnio() {
        return playRepository.obtenerTopArtistaPorAnio();
    }

    public List<ListeningStreak> obtenerRachasMasLargas(int limite) {
        return playRepository.obtenerRachasMasLargas(limite);
    }
    
    public List<HourlyPattern> obtenerPatronPorHora() {
        return playRepository.obtenerPatronPorHora();
    }

    public List<WeekdayPattern> obtenerPatronPorDiaSemana() {
        return playRepository.obtenerPatronPorDiaSemana();
    }

    public SkipRate obtenerTasaSkip() {
        return playRepository.obtenerTasaSkip();
    }

    public List<LongestSession> obtenerSesionesMasLargas(int limite) {
        return sessionRepository.obtenerSesionesMasLargas(limite);
    }

    public List<TopTrack> obtenerTopCancionesPorAnio(int anio, int limite) {
        return playRepository.obtenerTopCancionesPorAnio(anio, limite);
    }

    public List<TopAlbum> obtenerTopAlbumesPorAnio(int anio, int limite) {
        return playRepository.obtenerTopAlbumesPorAnio(anio, limite);
    }

    public List<ArtistRanking> obtenerTopArtistasPorAnio(int anio, int limite) {
        return playRepository.obtenerTopArtistasPorAnio(anio, limite);
    }
    public List<TopTrack> obtenerTopCancionesGeneral(int limite) {
        return playRepository.obtenerTopCancionesGeneral(limite);
    }

    public List<TopAlbum> obtenerTopAlbumesGeneral(int limite) {
        return playRepository.obtenerTopAlbumesGeneral(limite);
    }
}