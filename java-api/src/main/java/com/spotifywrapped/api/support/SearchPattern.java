package com.spotifywrapped.api.support;

/** Convierte el texto del usuario en un patrón LIKE seguro. El carácter de escape es la barra vertical. */
public final class SearchPattern {

    public static final int LARGO_MINIMO = 2;

    private SearchPattern() {
    }

    public static String normalizar(String q) {
        return q == null ? "" : q.trim().replaceAll("\\s+", " ");
    }

    public static boolean esValido(String normalizado) {
        return normalizado.length() >= LARGO_MINIMO;
    }

    public static String escapar(String normalizado) {
        return normalizado.replaceAll("([|%_\\[])", "|$1");
    }

    public static String contiene(String normalizado) {
        return "%" + escapar(normalizado) + "%";
    }

    public static String empiezaPor(String normalizado) {
        return escapar(normalizado) + "%";
    }
}
