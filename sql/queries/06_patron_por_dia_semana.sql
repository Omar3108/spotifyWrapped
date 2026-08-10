SELECT
    DATENAME(WEEKDAY, played_at)                    AS dia_semana,
    DATEPART(WEEKDAY, played_at)                     AS num_dia,  -- para ordenar bien
    COUNT(*)                                         AS reproducciones,
    SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60     AS minutos
FROM plays
GROUP BY DATENAME(WEEKDAY, played_at), DATEPART(WEEKDAY, played_at)
ORDER BY num_dia;
