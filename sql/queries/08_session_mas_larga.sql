SELECT TOP 10
    session_id,
    start_time,
    end_time,
    track_count,
    total_ms / 1000.0 / 60 AS minutos_totales
FROM sessions
ORDER BY total_ms DESC;