package com.spotifywrapped.api.service;

import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Datos públicos de Spotify: oEmbed y la página de cada canción. No necesita credenciales.
 *
 * La página de la canción no es una API oficial: si cambia, los ids de artista salen
 * vacíos y el front conserva la portada. El User-Agent identifica a la aplicación.
 */
@Component
public class OEmbedClient {

    /** Título e imagen de un artista según oEmbed. La imagen puede faltar. */
    public record ArtistaSpotify(String id, String titulo, String imagen) {
    }

    private static final Duration TIMEOUT = Duration.ofSeconds(3);
    private static final String AGENTE = "SpotifyWrapped-local/1.0";
    private static final String BASE = "https://open.spotify.com/";
    private static final Pattern MUSICO = Pattern.compile("music:musician\"[^>]*?/artist/([A-Za-z0-9]{22})");

    private final RestClient http;

    public OEmbedClient() {
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory();
        fabrica.setReadTimeout(TIMEOUT);
        this.http = RestClient.builder()
                .requestFactory(fabrica)
                .defaultHeader(HttpHeaders.USER_AGENT, AGENTE)
                .build();
    }

    /**
     * @return la imagen, o vacío si Spotify no la tiene. Los fallos de red y los límites de
     *         uso lanzan excepción, para no guardarlos como "sin portada".
     */
    public Optional<String> portada(String idPista) {
        return oembed("track/" + idPista).map(c -> c.get("thumbnail_url")).map(Object::toString);
    }

    /** Ids de los artistas de una canción, en el orden de la página. Mismas reglas de error. */
    public List<String> idsArtistas(String idPista) {
        try {
            String html = http.get().uri(URI.create(BASE + "track/" + idPista)).retrieve().body(String.class);
            return html == null ? List.of() : idsDeMusicos(html);
        } catch (HttpClientErrorException.NotFound e) {
            return List.of();
        }
    }

    /** @return el artista, o vacío si no existe. Mismas reglas de error que {@link #portada}. */
    public Optional<ArtistaSpotify> artista(String idArtista) {
        return oembed("artist/" + idArtista).map(c -> new ArtistaSpotify(idArtista, texto(c, "title"), texto(c, "thumbnail_url")));
    }

    static List<String> idsDeMusicos(String html) {
        Set<String> ids = new LinkedHashSet<>();
        Matcher m = MUSICO.matcher(html);
        while (m.find()) {
            ids.add(m.group(1));
        }
        return List.copyOf(ids);
    }

    private Optional<Map<?, ?>> oembed(String ruta) {
        URI url = URI.create(BASE + "oembed?url=" + BASE + ruta);
        try {
            return Optional.ofNullable(http.get().uri(url).retrieve().body(Map.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    private static String texto(Map<?, ?> cuerpo, String campo) {
        Object valor = cuerpo.get(campo);
        return valor == null ? null : valor.toString();
    }
}
