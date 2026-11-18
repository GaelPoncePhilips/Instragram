"""Fragmentos SQL compartidos. Todos esperan el parámetro :yo (usuario que consulta)."""


def sin_bloqueo(u: str) -> str:
    """{u} es una cuenta activa y no hay Bloqueo en ningún sentido con :yo (HU10)."""
    return (
        f"{u}.eliminado_en IS NULL AND "
        f"NOT EXISTS (SELECT 1 FROM bloqueo b_x WHERE "
        f"(b_x.bloqueador_id = {u}.id AND b_x.bloqueado_id = :yo) OR "
        f"(b_x.bloqueador_id = :yo AND b_x.bloqueado_id = {u}.id))"
    )


def puede_ver(u: str) -> str:
    """:yo puede ver el contenido de {u}: es él, es pública o la sigue aceptado; y sin bloqueo (HU4, HU10)."""
    return (
        f"(({u}.id = :yo OR NOT {u}.es_privada OR EXISTS (SELECT 1 FROM seguidores s_x "
        f"WHERE s_x.seguidor_id = :yo AND s_x.seguido_id = {u}.id AND s_x.estado = 'aceptado'))"
        f" AND {sin_bloqueo(u)})"
    )


def _no_bloqueado_por_dueno(col: str) -> str:
    """Likes/comentarios de bloqueados por el dueño del post (HU10) o de cuentas borradas no cuentan."""
    return (f"NOT EXISTS (SELECT 1 FROM bloqueo b_d WHERE b_d.bloqueador_id = p.usuario_id AND b_d.bloqueado_id = {col})"
            f" AND {activo(col)}")


def activo(col: str) -> str:
    """El usuario {col} no borró su cuenta (borrado lógico)."""
    return f"EXISTS (SELECT 1 FROM usuario u_a WHERE u_a.id = {col} AND u_a.eliminado_en IS NULL)"


# Post con autor, contadores y me_gusta (HU6). Requiere alias p (post) y u (usuario autor).
POST_COLUMNAS = f"""
    p.id, p.usuario_id, u.username AS autor_username, u.nombre AS autor_nombre,
    p.tipo, p.url_imagen, p.url_video, p.duracion_seg, p.descripcion, p.fecha_publicacion, p.fecha_edicion,
    (SELECT count(*) FROM likes l_c WHERE l_c.post_id = p.id AND {_no_bloqueado_por_dueno('l_c.usuario_id')}) AS cantidad_likes,
    (SELECT count(*) FROM comentario c_c WHERE c_c.post_id = p.id AND {_no_bloqueado_por_dueno('c_c.usuario_id')}) AS cantidad_comentarios,
    EXISTS (SELECT 1 FROM likes l_m WHERE l_m.post_id = p.id AND l_m.usuario_id = :yo) AS me_gusta
"""
POST_FROM = "FROM post p JOIN usuario u ON u.id = p.usuario_id AND u.eliminado_en IS NULL"
NO_BLOQUEADO_POR_DUENO = _no_bloqueado_por_dueno
