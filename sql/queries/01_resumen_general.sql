SELECT
    COUNT(*)                                                  AS total_reproducciones,
    SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60              AS total_minutos,
    SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60 / 60 / 24    AS total_dias,
    COUNT(DISTINCT track_id)                                  AS canciones_distintas,
    MIN(played_at)                                            AS primera_reproduccion,
    MAX(played_at)                                            AS ultima_reproduccion
FROM plays;