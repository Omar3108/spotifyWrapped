package com.spotifywrapped.api.dto;

import java.time.LocalDate;

public interface ListeningStreak {
    LocalDate getInicioRacha();
    LocalDate getFinRacha();
    Integer getDiasConsecutivos();
}