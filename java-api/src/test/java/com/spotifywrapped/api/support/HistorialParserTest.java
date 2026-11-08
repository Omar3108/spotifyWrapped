package com.spotifywrapped.api.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;

class HistorialParserTest {

    private static String registro(String ts, long ms, String cancion, String artista, String uri) {
        String c = cancion == null ? "null" : "\"" + cancion + "\"";
        return "{\"ts\":\"" + ts + "\",\"ip_addr\":\"1.2.3.4\",\"ms_played\":" + ms
                + ",\"master_metadata_track_name\":" + c
                + ",\"master_metadata_album_artist_name\":\"" + artista + "\""
                + ",\"master_metadata_album_album_name\":\"Álbum\""
                + ",\"spotify_track_uri\":\"" + uri + "\""
                + ",\"reason_start\":\"trackdone\",\"reason_end\":\"fwdbtn\",\"shuffle\":true,\"skipped\":null,"
                + "\"episode_name\":null}";
    }

    private static ByteArrayInputStream zip(Map<String, String> archivos) throws IOException {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(salida)) {
            for (var e : archivos.entrySet()) {
                z.putNextEntry(new ZipEntry(e.getKey()));
                z.write(e.getValue().getBytes(StandardCharsets.UTF_8));
                z.closeEntry();
            }
        }
        return new ByteArrayInputStream(salida.toByteArray());
    }

    @Test
    void juntaTodosLosArchivosDeAudioAunDentroDeUnaCarpeta() throws IOException {
        Map<String, String> z = new LinkedHashMap<>();
        z.put("Spotify Extended Streaming History/Streaming_History_Audio_2021.json",
                "[" + registro("2021-03-01T12:00:00Z", 60_000, "B", "Art", "spotify:track:b") + "]");
        z.put("Spotify Extended Streaming History/Streaming_History_Audio_2020.json",
                "[" + registro("2020-03-01T12:00:00Z", 60_000, "A", "Art", "spotify:track:a") + "]");
        z.put("Spotify Extended Streaming History/Streaming_History_Video_2020.json",
                "[" + registro("2020-04-01T12:00:00Z", 60_000, "V", "Art", "spotify:track:v") + "]");
        z.put("Spotify Extended Streaming History/ReadMeFirst_ExtendedStreamingHistory.pdf", "%PDF");

        HistorialParser.Resultado r = HistorialParser.leer(zip(z));

        assertThat(r.archivos()).isEqualTo(2);
        assertThat(r.filas()).extracting(Reproduccion::cancion).containsExactly("A", "B"); // ordenadas por fecha
    }

    @Test
    void conviertePorLaHoraDeCaracasYCopiaSoloLosCamposUtiles() throws IOException {
        HistorialParser.Resultado r = HistorialParser.leer(zip(Map.of("Streaming_History_Audio_2020.json",
                "[" + registro("2020-01-01T04:00:00Z", 60_000, "A", "Art", "spotify:track:a") + "]")));

        Reproduccion p = r.filas().get(0);
        assertThat(p.playedAt()).isEqualTo(LocalDateTime.of(2020, 1, 1, 0, 0)); // UTC-4, sin horario de verano
        assertThat(p.album()).isEqualTo("Álbum");
        assertThat(p.shuffle()).isTrue();
        assertThat(p.skipped()).isNull();
        assertThat(p.razonFin()).isEqualTo("fwdbtn");
    }

    @Test
    void descartaPodcastsYEscuchasDeMenosDe30Segundos() throws IOException {
        HistorialParser.Resultado r = HistorialParser.leer(zip(Map.of("Streaming_History_Audio_2020.json", "["
                + registro("2020-01-01T10:00:00Z", 29_999, "Corta", "Art", "spotify:track:c") + ","
                + registro("2020-01-01T11:00:00Z", 30_000, "Justa", "Art", "spotify:track:j") + ","
                + registro("2020-01-01T12:00:00Z", 90_000, null, "Art", "spotify:track:p") + "]")));

        assertThat(r.filas()).extracting(Reproduccion::cancion).containsExactly("Justa");
        assertThat(r.registros()).isEqualTo(3);
    }

    @Test
    void rechazaElHistorialBasicoConUnMensajeQueDiceQuePedir() {
        assertThatThrownBy(() -> HistorialParser.leer(zip(Map.of("StreamingHistory0.json",
                "[{\"endTime\":\"2020-01-01 00:00\",\"artistName\":\"A\",\"trackName\":\"T\",\"msPlayed\":40000}]"))))
                .isInstanceOf(HistorialInvalidoException.class)
                .hasMessageContaining("básico")
                .hasMessageContaining("ampliado");
    }

    @Test
    void rechazaLoQueNoEsUnZipNiUnJsonValido() {
        assertThatThrownBy(() -> HistorialParser.leer(new ByteArrayInputStream("no soy un zip".getBytes())))
                .isInstanceOf(HistorialInvalidoException.class).hasMessageContaining("zip");
        assertThatThrownBy(() -> HistorialParser.leer(zip(Map.of("Streaming_History_Audio_2020.json", "[{\"ts\":"))))
                .isInstanceOf(HistorialInvalidoException.class).hasMessageContaining("JSON");
        assertThatThrownBy(() -> HistorialParser.leer(zip(Map.of("notas.txt", "hola"))))
                .isInstanceOf(HistorialInvalidoException.class).hasMessageContaining("Streaming_History_Audio");
    }
}
