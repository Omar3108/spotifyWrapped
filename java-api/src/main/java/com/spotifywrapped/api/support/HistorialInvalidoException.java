package com.spotifywrapped.api.support;

/** El archivo subido no sirve. El mensaje se muestra tal cual a la persona, así que va en español y accionable. */
public class HistorialInvalidoException extends RuntimeException {
    public HistorialInvalidoException(String mensaje) {
        super(mensaje);
    }
}
