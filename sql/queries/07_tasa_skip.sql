SELECT
    CAST(SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS FLOAT)
        / COUNT(*) * 100                              AS porcentaje_skip,
    SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END)      AS total_skips,
    COUNT(*)                                          AS total_reproducciones
FROM plays;