package com.spotifywrapped.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.spotifywrapped.api.dto.Punto;

class ExploreServiceTest {

    @Test
    void agrupaMesesPorAnioRellenandoHuecos() {
        List<Punto> r = ExploreService.agruparPorAnio(List.of(
                new Punto("2019-01", 2L, 4.0, null),
                new Punto("2019-07", 3L, 6.0, null),
                new Punto("2021-03", 1L, 2.0, null)));
        assertThat(r).extracting(Punto::periodo).containsExactly("2019", "2020", "2021");
        assertThat(r).extracting(Punto::reproducciones).containsExactly(5L, 0L, 1L);
        assertThat(r.get(0).minutos()).isEqualTo(10.0);
    }

    @Test
    void sinFilasNoInventaDatos() {
        assertThat(ExploreService.agruparPorAnio(List.of())).isEmpty();
        assertThat(ExploreService.rellenarMeses(List.of())).isEmpty();
    }
}
