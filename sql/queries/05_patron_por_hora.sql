SELECT
    DATEPART(HOUR, played_at)                      AS hora_del_dia,
    COUNT(*)                                        AS reproducciones,
    SUM(CAST(ms_played AS BIGINT)) / 1000.0 / 60    AS minutos
FROM plays
GROUP BY DATEPART(HOUR, played_at)
ORDER BY hora_del_dia;


