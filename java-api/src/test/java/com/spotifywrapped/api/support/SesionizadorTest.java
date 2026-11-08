package com.spotifywrapped.api.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.spotifywrapped.api.support.Sesionizador.Sesion;

class SesionizadorTest {

    private static final LocalDateTime BASE = LocalDateTime.of(2024, 5, 1, 10, 0);

    private static Reproduccion en(int minuto, int ms) {
        return new Reproduccion(BASE.plusMinutes(minuto), ms, "c", "a", "al", "u", null, null, null, null);
    }

    @Test
    void cortaSoloCuandoElHuecoSuperaLos20Minutos() {
        // 0 -> 20 min (justo el umbral: sigue la sesión) -> 41 min (21 de hueco: sesión nueva)
        List<Reproduccion> filas = List.of(en(0, 1), en(20, 1), en(41, 1));
        assertThat(Sesionizador.asignar(filas)).containsExactly(0, 0, 1);
    }

    @Test
    void sinReproduccionesNoHaySesiones() {
        assertThat(Sesionizador.asignar(List.of())).isEmpty();
        assertThat(Sesionizador.resumir(List.of(), new int[0])).isEmpty();
    }

    @Test
    void resumeInicioFinTotalYPistasDeCadaSesion() {
        List<Reproduccion> filas = List.of(en(0, 40_000), en(5, 60_000), en(100, 30_000));
        int[] sesion = Sesionizador.asignar(filas);

        List<Sesion> r = Sesionizador.resumir(filas, sesion);

        assertThat(r).hasSize(2);
        assertThat(r.get(0)).isEqualTo(new Sesion(0, BASE, BASE.plusMinutes(5), 100_000, 2));
        assertThat(r.get(1)).isEqualTo(new Sesion(1, BASE.plusMinutes(100), BASE.plusMinutes(100), 30_000, 1));
    }
}
