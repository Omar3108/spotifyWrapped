package com.spotifywrapped.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ArtServiceTest {

    @Test
    void soloAceptaUrisDePistaBienFormadas() {
        assertThat(ArtService.uriValida("spotify:track:2XMTqoHHSH0lvuXrvIEdco")).isTrue();
        assertThat(ArtService.uriValida("spotify:album:2XMTqoHHSH0lvuXrvIEdco")).isFalse();
        assertThat(ArtService.uriValida("spotify:track:../../etc/passwd")).isFalse();
        assertThat(ArtService.uriValida(null)).isFalse();
    }

    @Test
    void soloGuardaImagenesDelCdnDeSpotify() {
        assertThat(ArtService.imagenPermitida("https://image-cdn-fa.spotifycdn.com/image/abc")).isTrue();
        assertThat(ArtService.imagenPermitida("https://image-cdn-ak.spotifycdn.com/image/abc")).isTrue();
        assertThat(ArtService.imagenPermitida("https://i.scdn.co/image/abc")).isTrue();
        assertThat(ArtService.imagenPermitida("http://i.scdn.co/image/abc")).isFalse();
        assertThat(ArtService.imagenPermitida("https://evil.com/spotifycdn.com/x")).isFalse();
        assertThat(ArtService.imagenPermitida("https://spotifycdn.com.evil.com/x")).isFalse();
        assertThat(ArtService.imagenPermitida("no es una url")).isFalse();
    }
}
