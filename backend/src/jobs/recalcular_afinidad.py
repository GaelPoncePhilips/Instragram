"""Recalcula la señal colaborativa del recomendador.

    python -m src.jobs.recalcular_afinidad

Para cada usuario guarda sus 50 usuarios más parecidos según los likes de los últimos 30 días
(similitud coseno: likes en común / sqrt(likes_A * likes_B), con al menos 2 en común).
Correrlo periódicamente (cron cada 1 h, por ejemplo). Reemplaza la tabla en una transacción.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

VENTANA_DIAS = 30
VECINOS = 50
MIN_EN_COMUN = 2

SQL = """
WITH recientes AS (
    SELECT l.usuario_id, l.post_id FROM likes l JOIN usuario u ON u.id = l.usuario_id
    WHERE l.fecha > LOCALTIMESTAMP - make_interval(days => :dias) AND u.eliminado_en IS NULL
),
conteo AS (SELECT usuario_id, count(*) AS n FROM recientes GROUP BY usuario_id),
pares AS (
    SELECT a.usuario_id, b.usuario_id AS similar_id, count(*) AS comunes
    FROM recientes a JOIN recientes b ON a.post_id = b.post_id AND a.usuario_id <> b.usuario_id
    GROUP BY a.usuario_id, b.usuario_id
    HAVING count(*) >= :min_comun
),
puntuados AS (
    SELECT p.usuario_id, p.similar_id, p.comunes / sqrt(ca.n * cb.n) AS score,
           row_number() OVER (PARTITION BY p.usuario_id ORDER BY p.comunes / sqrt(ca.n * cb.n) DESC, p.similar_id) AS rk
    FROM pares p JOIN conteo ca ON ca.usuario_id = p.usuario_id JOIN conteo cb ON cb.usuario_id = p.similar_id
)
INSERT INTO afinidad_usuario (usuario_id, similar_id, score)
SELECT usuario_id, similar_id, score FROM puntuados WHERE rk <= :vecinos
"""


def recalcular(db: Session) -> int:
    db.execute(text("DELETE FROM afinidad_usuario"))
    n = db.execute(text(SQL), {"dias": VENTANA_DIAS, "min_comun": MIN_EN_COMUN, "vecinos": VECINOS}).rowcount
    db.commit()
    return n


if __name__ == "__main__":
    from src.db.connection import SessionLocal

    with SessionLocal() as db:
        print(f"afinidad_usuario: {recalcular(db)} pares")
