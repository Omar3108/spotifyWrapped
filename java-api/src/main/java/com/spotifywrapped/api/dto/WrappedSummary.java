package com.spotifywrapped.api.dto;

import java.time.LocalDateTime;

public interface WrappedSummary {
    Long getTotalReproducciones();
    Double getTotalMinutos();
    Double getTotalDias();
    Long getCancionesDistintas();
    LocalDateTime getPrimeraReproduccion();
    LocalDateTime getUltimaReproduccion();
}