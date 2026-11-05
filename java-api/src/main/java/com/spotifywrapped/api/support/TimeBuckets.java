package com.spotifywrapped.api.support;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.spotifywrapped.api.dto.Punto;

/**
 * Rellena con ceros los tramos sin escuchas, para que los gráficos reflejen el
 * tiempo real y no unan dos meses separados por un hueco.
 */
public final class TimeBuckets {

    private TimeBuckets() {
    }

    private static Map<String, Punto> porPeriodo(List<Punto> filas) {
        Map<String, Punto> mapa = new HashMap<>();
        filas.forEach(f -> mapa.put(f.periodo(), f));
        return mapa;
    }

    private static Punto o(Map<String, Punto> mapa, String periodo) {
        Punto p = mapa.get(periodo);
        return p != null ? p : new Punto(periodo, 0L, 0.0, null);
    }

    public static List<Punto> anios(int desde, int hasta, List<Punto> filas) {
        Map<String, Punto> mapa = porPeriodo(filas);
        List<Punto> salida = new ArrayList<>();
        for (int a = desde; a <= hasta; a++) {
            salida.add(o(mapa, String.valueOf(a)));
        }
        return salida;
    }

    public static List<Punto> meses(YearMonth desde, YearMonth hasta, List<Punto> filas) {
        Map<String, Punto> mapa = porPeriodo(filas);
        List<Punto> salida = new ArrayList<>();
        for (YearMonth m = desde; !m.isAfter(hasta); m = m.plusMonths(1)) {
            salida.add(o(mapa, m.toString()));
        }
        return salida;
    }

    public static List<Punto> dias(LocalDate desde, LocalDate hasta, List<Punto> filas) {
        Map<String, Punto> mapa = porPeriodo(filas);
        List<Punto> salida = new ArrayList<>();
        for (LocalDate d = desde; !d.isAfter(hasta); d = d.plusDays(1)) {
            salida.add(o(mapa, d.toString()));
        }
        return salida;
    }

    /** Siempre 24 filas, de 00 a 23. */
    public static List<Punto> horas(List<Punto> filas) {
        Map<String, Punto> mapa = porPeriodo(filas);
        List<Punto> salida = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            salida.add(o(mapa, "%02d".formatted(h)));
        }
        return salida;
    }
}
