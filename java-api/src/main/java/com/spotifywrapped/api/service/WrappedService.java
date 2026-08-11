package com.spotifywrapped.api.service;

import com.spotifywrapped.api.dto.*;
import com.spotifywrapped.api.repository.PlayRepository;
import com.spotifywrapped.api.repository.SessionRepository;
import org.springframework.stereotype.Service;
import java.util.List;

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

}