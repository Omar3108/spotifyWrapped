package com.spotifywrapped.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.web.client.ResourceAccessException;

import com.spotifywrapped.api.service.OEmbedClient.ArtistaSpotify;

class ArtistArtServiceTest {

    private static final String PISTA = "2XMTqoHHSH0lvuXrvIEdco";
    private static final String CDN = "https://image-cdn-fa.spotifycdn.com/image/abc";

    private final NamedParameterJdbcTemplate db = mock(NamedParameterJdbcTemplate.class);
    private final OEmbedClient oembed = mock(OEmbedClient.class);
    private final ArtistArtService servicio = new ArtistArtService(db, oembed);

    @SuppressWarnings("unchecked")
    private void conCancion(String nombre) {
        when(db.query(anyString(), any(SqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.<String[]>of(new String[] { "spotify:track:" + PISTA, nombre }));
    }

    @Test
    void leeLosArtistasDeLaPagina() {
        String html = """
                <meta name="music:duration" content="214"/>
                <meta name="music:musician" content="https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt"/>
                <meta name="music:musician" content="https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d"/>
                <meta name="music:musician" content="https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt"/>
                """;
        assertThat(OEmbedClient.idsDeMusicos(html))
                .containsExactly("0gxyHStUsqpMadRV0Di1Qt", "1dfeR4HaWDbWqFHLkxsg1d");
        assertThat(OEmbedClient.idsDeMusicos("<html>otra página</html>")).isEmpty();
    }

    @Test
    void comparaNombresSinDistinguirMayusculasNiFormaUnicode() {
        assertThat(ArtistArtService.mismoNombre("BAD BUNNY", "Bad Bunny")).isTrue();
        assertThat(ArtistArtService.mismoNombre("Sebastián", "Sebastián")).isTrue();
        assertThat(ArtistArtService.mismoNombre("Far Out", "Farout")).isFalse();
        assertThat(ArtistArtService.mismoNombre(null, "Bad Bunny")).isFalse();
    }

    @Test
    void enUnaColaboracionEligeAlArtistaCorrecto() {
        when(oembed.idsArtistas(PISTA)).thenReturn(List.of("otro", "buscado"));
        when(oembed.artista("otro")).thenReturn(Optional.of(new ArtistaSpotify("otro", "Otra Persona", CDN)));
        when(oembed.artista("buscado")).thenReturn(Optional.of(new ArtistaSpotify("buscado", "Rick Astley", CDN)));

        assertThat(servicio.buscar("Rick Astley", List.of(PISTA))).map(ArtistaSpotify::id).contains("buscado");
    }

    @Test
    void noRepiteConsultasDelMismoArtistaEntreCanciones() {
        when(oembed.idsArtistas(any())).thenReturn(List.of("otro"));
        when(oembed.artista("otro")).thenReturn(Optional.of(new ArtistaSpotify("otro", "Otra Persona", CDN)));

        assertThat(servicio.buscar("Rick Astley", List.of("a", "b", "c"))).isEmpty();
        verify(oembed, times(1)).artista("otro");
    }

    @Test
    void sinCoincidenciaGuardaVacioParaNoReintentarEnCadaVisita() {
        conCancion("Rick Astley");
        when(oembed.idsArtistas(PISTA)).thenReturn(List.of("otro"));
        when(oembed.artista("otro")).thenReturn(Optional.of(new ArtistaSpotify("otro", "Otra Persona", CDN)));

        assertThat(servicio.resolver(7)).isEmpty();
        verify(db).update(anyString(), any(SqlParameterSource.class));
    }

    @Test
    void rechazaImagenesDeOtroHost() {
        conCancion("Rick Astley");
        when(oembed.idsArtistas(PISTA)).thenReturn(List.of("buscado"));
        when(oembed.artista("buscado"))
                .thenReturn(Optional.of(new ArtistaSpotify("buscado", "Rick Astley", "https://evil.com/foto.jpg")));

        assertThat(servicio.resolver(7)).isEmpty();
    }

    @Test
    void unErrorDeRedNoSeGuarda() {
        conCancion("Rick Astley");
        when(oembed.idsArtistas(PISTA)).thenThrow(new ResourceAccessException("sin red"));

        assertThat(servicio.resolver(7)).isEmpty();
        verify(db, never()).update(anyString(), any(SqlParameterSource.class));
    }

    @Test
    void ignoraIdsInvalidosSinConsultar() {
        assertThat(servicio.fotos(List.of(0, -3))).isEmpty();
        verify(oembed, never()).idsArtistas(any());
    }
}
