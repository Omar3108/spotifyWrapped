package com.spotifywrapped.api.service;

import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/** Cliente de oEmbed de Spotify. No necesita credenciales y solo recibe el id público de la pista. */
@Component
public class OEmbedClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(3);

    private final RestClient http;

    public OEmbedClient() {
        JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory();
        fabrica.setReadTimeout(TIMEOUT);
        this.http = RestClient.builder().requestFactory(fabrica).build();
    }

    /**
     * @return la imagen, o vacío si Spotify no la tiene. Los fallos de red y los límites de
     *         uso lanzan excepción, para no guardarlos como "sin portada".
     */
    public Optional<String> portada(String idPista) {
        URI url = URI.create("https://open.spotify.com/oembed?url=https://open.spotify.com/track/" + idPista);
        try {
            Map<?, ?> cuerpo = http.get().uri(url).retrieve().body(Map.class);
            Object imagen = cuerpo == null ? null : cuerpo.get("thumbnail_url");
            return imagen == null ? Optional.empty() : Optional.of(imagen.toString());
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
}
