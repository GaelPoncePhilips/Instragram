-- 003: señal colaborativa precalculada para el recomendador (ver docs/RECOMENDACIONES.md).
BEGIN;

CREATE TABLE afinidad_usuario (
    usuario_id   INT  NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    similar_id   INT  NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    score        REAL NOT NULL CHECK (score > 0),          -- similitud coseno de likes (0, 1]
    calculado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, similar_id),
    CHECK (usuario_id <> similar_id)
);
CREATE INDEX idx_afinidad_similar ON afinidad_usuario (similar_id);
CREATE INDEX idx_likes_usuario_fecha ON likes (usuario_id, fecha);

COMMIT;
