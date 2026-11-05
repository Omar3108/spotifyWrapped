package com.spotifywrapped.api.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.spotifywrapped.api.dto.Punto;

class TimeBucketsTest {

    private static Punto punto(String periodo, long n) {
        return new Punto(periodo, n, n * 3.0, null);
    }

    @Test
    void rellenaMesesVaciosYCruzaElAnio() {
        List<Punto> r = TimeBuckets.meses(YearMonth.of(2022, 11), YearMonth.of(2023, 2),
                List.of(punto("2022-11", 5), punto("2023-02", 2)));
        assertThat(r).extracting(Punto::periodo).containsExactly("2022-11", "2022-12", "2023-01", "2023-02");
        assertThat(r).extracting(Punto::reproducciones).containsExactly(5L, 0L, 0L, 2L);
    }

    @Test
    void incluyeElDiaBisiesto() {
        List<Punto> r = TimeBuckets.dias(LocalDate.of(2024, 2, 28), LocalDate.of(2024, 3, 1), List.of());
        assertThat(r).extracting(Punto::periodo).containsExactly("2024-02-28", "2024-02-29", "2024-03-01");
    }

    @Test
    void siempreDevuelve24Horas() {
        List<Punto> r = TimeBuckets.horas(List.of(punto("07", 4)));
        assertThat(r).hasSize(24);
        assertThat(r.get(0).periodo()).isEqualTo("00");
        assertThat(r.get(7).reproducciones()).isEqualTo(4L);
        assertThat(r.get(23).reproducciones()).isZero();
    }

    @Test
    void rellenaAniosIntermedios() {
        List<Punto> r = TimeBuckets.anios(2019, 2021, List.of(punto("2019", 1), punto("2021", 1)));
        assertThat(r).extracting(Punto::reproducciones).containsExactly(1L, 0L, 1L);
    }
}
