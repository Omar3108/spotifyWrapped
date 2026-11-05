package com.spotifywrapped.api.dto;

public interface PuntoFila {
    String getPeriodo();
    Long getReproducciones();
    Double getMinutos();
    String getArtistaLider();

    default Punto aPunto() {
        return new Punto(getPeriodo(), getReproducciones(), getMinutos(), getArtistaLider());
    }
}
