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

    public WrappedSummary obtenerResumen(int perfil) {
        return playRepository.obtenerResumenGeneral(perfil);
    }

    public List<ArtistRanking> obtenerTopArtistas(int perfil, int limite) {
        return playRepository.obtenerTopArtistas(perfil, limite);
    }

    public List<YearlyTopArtist> obtenerTopArtistaPorAnio(int perfil) {
        return playRepository.obtenerTopArtistaPorAnio(perfil);
    }

    public List<ListeningStreak> obtenerRachasMasLargas(int perfil, int limite) {
        return playRepository.obtenerRachasMasLargas(perfil, limite);
    }
    
    public List<HourlyPattern> obtenerPatronPorHora(int perfil) {
        return playRepository.obtenerPatronPorHora(perfil);
    }

    public List<WeekdayPattern> obtenerPatronPorDiaSemana(int perfil) {
        return playRepository.obtenerPatronPorDiaSemana(perfil);
    }

    public SkipRate obtenerTasaSkip(int perfil) {
        return playRepository.obtenerTasaSkip(perfil);
    }

    public List<LongestSession> obtenerSesionesMasLargas(int perfil, int limite) {
        return sessionRepository.obtenerSesionesMasLargas(perfil, limite);
    }

    public List<TopTrack> obtenerTopCancionesPorAnio(int perfil, int anio, int limite) {
        return playRepository.obtenerTopCancionesPorAnio(perfil, anio, limite);
    }

    public List<TopAlbum> obtenerTopAlbumesPorAnio(int perfil, int anio, int limite) {
        return playRepository.obtenerTopAlbumesPorAnio(perfil, anio, limite);
    }

    public List<ArtistRanking> obtenerTopArtistasPorAnio(int perfil, int anio, int limite) {
        return playRepository.obtenerTopArtistasPorAnio(perfil, anio, limite);
    }
    public List<TopTrack> obtenerTopCancionesGeneral(int perfil, int limite) {
        return playRepository.obtenerTopCancionesGeneral(perfil, limite);
    }

    public List<TopAlbum> obtenerTopAlbumesGeneral(int perfil, int limite) {
        return playRepository.obtenerTopAlbumesGeneral(perfil, limite);
    }
}