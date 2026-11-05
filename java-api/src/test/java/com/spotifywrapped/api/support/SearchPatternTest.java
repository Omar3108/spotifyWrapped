package com.spotifywrapped.api.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchPatternTest {

    @Test
    void normalizaEspacios() {
        assertThat(SearchPattern.normalizar("  linkin   park ")).isEqualTo("linkin park");
        assertThat(SearchPattern.normalizar(null)).isEmpty();
    }

    @Test
    void escapaLosComodinesDeLike() {
        assertThat(SearchPattern.contiene("100%")).isEqualTo("%100|%%");
        assertThat(SearchPattern.contiene("a_b")).isEqualTo("%a|_b%");
        assertThat(SearchPattern.contiene("[x]")).isEqualTo("%|[x]%");
        assertThat(SearchPattern.contiene("a|b")).isEqualTo("%a||b%");
        assertThat(SearchPattern.empiezaPor("no")).isEqualTo("no%");
    }

    @Test
    void exigeDosCaracteres() {
        assertThat(SearchPattern.esValido("a")).isFalse();
        assertThat(SearchPattern.esValido("ab")).isTrue();
    }
}
