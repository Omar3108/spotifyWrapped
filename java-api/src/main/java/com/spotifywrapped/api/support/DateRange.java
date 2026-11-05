package com.spotifywrapped.api.support;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Rango de fechas de calendario, ambos días incluidos.
 *
 * played_at guarda hora de Caracas sin zona (python/etl/parser.py), así que las
 * fechas se comparan tal cual, sin conversión. Las consultas usan el intervalo
 * semiabierto [desde, hastaExclusivo): cubre el último día completo, incluidas
 * las fracciones de segundo, y permite usar el índice de played_at.
 */
public record DateRange(LocalDate from, LocalDate to) {

    public DateRange {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes indicar from y to");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha inicial es posterior a la final");
        }
    }

    public LocalDateTime desde() {
        return from.atStartOfDay();
    }

    public LocalDateTime hastaExclusivo() {
        return to.plusDays(1).atStartOfDay();
    }

    public long dias() {
        return ChronoUnit.DAYS.between(from, to) + 1;
    }
}
