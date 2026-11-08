package com.spotifywrapped.api.support;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Agrupa reproducciones en sesiones de escucha, igual que python/etl/sessionize.py:
 * una sesión nueva empieza cuando pasa MÁS de UMBRAL desde la reproducción anterior.
 */
public final class Sesionizador {

    public static final Duration UMBRAL = Duration.ofMinutes(20);

    private Sesionizador() {
    }

    public record Sesion(int indice, LocalDateTime inicio, LocalDateTime fin, int totalMs, int pistas) {
    }

    /** `ordenadas` debe venir por fecha. Devuelve el índice de sesión (desde 0) de cada reproducción. */
    public static int[] asignar(List<Reproduccion> ordenadas) {
        int[] sesion = new int[ordenadas.size()];
        int actual = 0;
        for (int i = 1; i < sesion.length; i++) {
            Duration hueco = Duration.between(ordenadas.get(i - 1).playedAt(), ordenadas.get(i).playedAt());
            if (hueco.compareTo(UMBRAL) > 0) {
                actual++;
            }
            sesion[i] = actual;
        }
        return sesion;
    }

    /** Inicio y fin son la primera y la última hora de reproducción; el total, la suma de ms. */
    public static List<Sesion> resumir(List<Reproduccion> ordenadas, int[] sesion) {
        List<Sesion> resumen = new ArrayList<>();
        int i = 0;
        while (i < sesion.length) {
            int j = i;
            long ms = 0;
            while (j < sesion.length && sesion[j] == sesion[i]) {
                ms += ordenadas.get(j).msPlayed();
                j++;
            }
            resumen.add(new Sesion(sesion[i], ordenadas.get(i).playedAt(), ordenadas.get(j - 1).playedAt(),
                    (int) Math.min(ms, Integer.MAX_VALUE), j - i));
            i = j;
        }
        return resumen;
    }
}
