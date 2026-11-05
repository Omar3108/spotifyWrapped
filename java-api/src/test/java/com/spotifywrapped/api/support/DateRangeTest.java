package com.spotifywrapped.api.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class DateRangeTest {

    @Test
    void elLimiteSuperiorEsLaMedianocheDelDiaSiguiente() {
        DateRange r = new DateRange(LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31));
        assertThat(r.desde()).isEqualTo(LocalDateTime.of(2023, 1, 1, 0, 0));
        assertThat(r.hastaExclusivo()).isEqualTo(LocalDateTime.of(2024, 1, 1, 0, 0));
    }

    @Test
    void unSoloDiaEsValidoYCubreLas24Horas() {
        LocalDate dia = LocalDate.of(2024, 2, 29);
        DateRange r = new DateRange(dia, dia);
        assertThat(r.dias()).isEqualTo(1);
        assertThat(r.hastaExclusivo()).isEqualTo(LocalDateTime.of(2024, 3, 1, 0, 0));
    }

    @Test
    void cuentaLosDiasIncluyendoAmbosExtremos() {
        assertThat(new DateRange(LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31)).dias()).isEqualTo(366);
    }

    @Test
    void rechazaRangosInvertidosOIncompletos() {
        LocalDate a = LocalDate.of(2024, 3, 2);
        LocalDate b = LocalDate.of(2024, 3, 1);
        assertThatThrownBy(() -> new DateRange(a, b)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> new DateRange(null, b)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> new DateRange(a, null)).isInstanceOf(ResponseStatusException.class);
    }
}
