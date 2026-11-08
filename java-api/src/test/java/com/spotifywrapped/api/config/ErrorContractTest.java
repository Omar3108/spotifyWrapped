package com.spotifywrapped.api.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.spotifywrapped.api.controller.RangeController;
import com.spotifywrapped.api.service.RangeService;

/** Fija el formato público de errores: los mismos campos de Spring y ninguna traza. */
@WebMvcTest(RangeController.class)
@Import(GlobalErrorHandler.class)
class ErrorContractTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private RangeService rangos;

    @Test
    void un500NoExponeDetallesInternos() throws Exception {
        when(rangos.estadisticas(anyInt(), any(), anyInt()))
                .thenThrow(new IllegalStateException("password=secreto en jdbc:sqlserver://localhost"));

        mvc.perform(get("/api/wrapped/range").param("perfil", "1").param("from", "2024-01-01").param("to", "2024-01-31"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.path").value("/api/wrapped/range"))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.message").doesNotExist())
                .andExpect(content().string(not(containsString("secreto"))));
    }

    @Test
    void unRangoInvertidoDevuelve400ConMensajeClaro() throws Exception {
        mvc.perform(get("/api/wrapped/range").param("perfil", "1").param("from", "2024-02-01").param("to", "2024-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("La fecha inicial es posterior a la final"));
    }

    @Test
    void unaFechaMalFormadaDevuelve400() throws Exception {
        mvc.perform(get("/api/wrapped/range").param("perfil", "1").param("from", "ayer").param("to", "2024-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void faltarUnParametroDevuelve400() throws Exception {
        mvc.perform(get("/api/wrapped/range").param("perfil", "1").param("from", "2024-01-01"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void faltarElPerfilDevuelve400() throws Exception {
        mvc.perform(get("/api/wrapped/range").param("from", "2024-01-01").param("to", "2024-01-31"))
                .andExpect(status().isBadRequest());
    }
}
