WITH dias_con_actividad AS (
    -- Paso 1: un registro único por cada día que escuchaste algo
    SELECT DISTINCT CAST(played_at AS DATE) AS dia
    FROM plays
),
dias_numerados AS (
    -- Paso 2: le damos a cada día un número de fila consecutivo
    SELECT
        dia,
        ROW_NUMBER() OVER (ORDER BY dia) AS numero_fila
    FROM dias_con_actividad
),
dias_con_grupo AS (
    -- Paso 3: la magia — restamos el número de fila a la fecha
    SELECT
        dia,
        DATEADD(DAY, -numero_fila, dia) AS grupo_racha
    FROM dias_numerados
)
SELECT
    MIN(dia)                    AS inicio_racha,
    MAX(dia)                    AS fin_racha,
    COUNT(*)                    AS dias_consecutivos
FROM dias_con_grupo
GROUP BY grupo_racha
ORDER BY dias_consecutivos DESC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;
