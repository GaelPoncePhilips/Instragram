"""Una sección por historia de usuario de la consigna."""
from tests.conftest import sql


# ---------- HU1
def test_registro_y_perfil(client, usuarios):
    ana, beto, *_ = usuarios
    r = client.post("/api/usuarios", json={"username": "ana", "email": "otra@x.com", "password": "secreta123", "nombre": "A"})
    assert r.status_code == 409
    r = client.post("/api/usuarios", json={"username": "x", "email": "ANA@x.com", "password": "secreta123", "nombre": "A"})
    assert r.status_code == 409  # email único sin importar mayúsculas
    for malo in ("Ana", "con espacio", "ñandú", "a-b"):
        r = client.post("/api/usuarios", json={"username": malo, "email": f"{len(malo)}@y.com", "password": "secreta123", "nombre": "A"})
        assert r.status_code == 422, malo
    me = ana.get("/auth/me").json()
    assert me["es_privada"] is False and "password_hash" not in me
    ana.publicar()
    beto.seguir(ana)
    p = beto.get("/usuarios/ana").json()
    assert (p["cantidad_posts"], p["cantidad_seguidores"], p["cantidad_seguidos"], p["relacion"]) == (1, 1, 0, "siguiendo")
    assert client.get("/api/usuarios/ana").status_code == 401


# ---------- HU2
def test_publicar_post_y_hashtags(usuarios):
    ana = usuarios[0]
    assert ana.post("/posts", {"descripcion": "sin imagen"}).status_code == 422
    assert ana.post("/posts", {"url_imagen": "a", "descripcion": "x" * 2201}).status_code == 422
    r = ana.post("/posts", {"url_imagen": "a.jpg", "descripcion": "Hola #Sol #sol #café mail@a#no"})
    assert r.status_code == 201 and r.json()["fecha_publicacion"]
    ana.publicar("otro #sol")
    nombres = [f[0] for f in sql("SELECT nombre FROM hashtag ORDER BY nombre")]
    assert nombres == ["café", "sol"]
    assert sql("SELECT count(*) FROM hashtags_post").scalar() == 3


# ---------- HU3
def test_seguir(usuarios):
    ana, beto, caro, _ = usuarios
    assert ana.seguir(ana).status_code == 400
    assert beto.seguir(ana).json()["estado"] == "aceptado"
    assert beto.seguir(ana).status_code == 409
    caro.patch(f"/usuarios/{caro.id}", {"es_privada": True})
    assert ana.seguir(caro).json()["estado"] == "pendiente"
    beto.seguir(caro)
    assert ana.get(f"/usuarios/{caro.id}/solicitudes").status_code == 403
    assert len(caro.get(f"/usuarios/{caro.id}/solicitudes").json()) == 2
    assert caro.patch(f"/usuarios/{caro.id}/solicitudes/{ana.id}", {"accion": "aceptar"}).json()["estado"] == "aceptado"
    assert caro.patch(f"/usuarios/{caro.id}/solicitudes/{beto.id}", {"accion": "rechazar"}).status_code == 204
    assert caro.get(f"/usuarios/{caro.id}/solicitudes").json() == []
    assert beto.get("/usuarios/caro").json()["relacion"] == "ninguna"


# ---------- HU4
def test_privacidad(usuarios):
    ana, beto, caro, _ = usuarios
    ana.patch(f"/usuarios/{ana.id}", {"es_privada": True})
    pid = ana.publicar()
    assert beto.get(f"/usuarios/{ana.id}/posts").status_code == 403
    assert beto.get(f"/posts/{pid}").status_code == 403
    assert len(ana.get(f"/usuarios/{ana.id}/posts").json()) == 1
    beto.seguir(ana)
    assert beto.get(f"/usuarios/{ana.id}/posts").status_code == 403  # pendiente no alcanza
    caro.seguir(ana)
    ana.patch(f"/usuarios/{ana.id}/solicitudes/{beto.id}", {"accion": "aceptar"})
    assert len(beto.get(f"/usuarios/{ana.id}/posts").json()) == 1
    ana.patch(f"/usuarios/{ana.id}", {"es_privada": False})
    assert ana.get(f"/usuarios/{ana.id}/solicitudes").json() == []
    assert len(caro.get(f"/usuarios/{ana.id}/posts").json()) == 1


# ---------- HU5
def test_likes_y_comentarios(usuarios):
    ana, beto, caro, dani = usuarios
    ana.patch(f"/usuarios/{ana.id}", {"es_privada": True})
    pid = ana.publicar()
    assert beto.post(f"/posts/{pid}/like").status_code == 403
    assert beto.post(f"/posts/{pid}/comentarios", {"texto": "hola"}).status_code == 403
    beto.seguir(ana); ana.patch(f"/usuarios/{ana.id}/solicitudes/{beto.id}", {"accion": "aceptar"})
    assert beto.post(f"/posts/{pid}/like").json()["cantidad_likes"] == 1
    assert beto.post(f"/posts/{pid}/like").json()["cantidad_likes"] == 1  # uno por usuario
    assert beto.get(f"/posts/{pid}").json()["me_gusta"] is True
    assert beto.delete(f"/posts/{pid}/like").status_code == 204
    assert beto.get(f"/posts/{pid}").json()["cantidad_likes"] == 0
    for malo in ("", "   ", "x" * 301):
        assert beto.post(f"/posts/{pid}/comentarios", {"texto": malo}).status_code == 422
    c1 = beto.post(f"/posts/{pid}/comentarios", {"texto": " lindo "}).json()
    assert c1["texto"] == "lindo"
    c2 = beto.post(f"/posts/{pid}/comentarios", {"texto": "otro"}).json()
    caro.seguir(ana); ana.patch(f"/usuarios/{ana.id}/solicitudes/{caro.id}", {"accion": "aceptar"})
    assert caro.delete(f"/comentarios/{c1['id']}").status_code == 403
    assert beto.delete(f"/comentarios/{c1['id']}").status_code == 204  # autor
    assert ana.delete(f"/comentarios/{c2['id']}").status_code == 204   # dueño del post
    assert ana.get(f"/posts/{pid}/comentarios").json() == []


# ---------- HU6
def test_feed(usuarios):
    ana, beto, caro, dani = usuarios
    ana.seguir(beto); ana.seguir(caro)
    caro.patch(f"/usuarios/{caro.id}", {"es_privada": True})
    dani.seguir(caro)  # caro privada: dani pendiente
    ids = [beto.publicar("1"), caro.publicar("2"), beto.publicar("3"), dani.publicar("no sigo")]
    caro.post(f"/posts/{ids[2]}/like"); ana.post(f"/posts/{ids[2]}/like")
    ana.post(f"/posts/{ids[0]}/comentarios", {"texto": "hey"})
    feed = ana.get(f"/usuarios/{ana.id}/feed").json()
    assert [p["id"] for p in feed] == [ids[2], ids[1], ids[0]]
    assert feed[0]["autor_username"] == "beto" and feed[0]["cantidad_likes"] == 2 and feed[0]["me_gusta"] is True
    assert feed[2]["cantidad_comentarios"] == 1 and feed[2]["me_gusta"] is False
    assert [p["id"] for p in ana.get(f"/usuarios/{ana.id}/feed", params={"limit": 1, "offset": 1}).json()] == [ids[1]]
    assert dani.get(f"/usuarios/{dani.id}/feed").json() == []
    assert beto.get(f"/usuarios/{ana.id}/feed").status_code == 403


# ---------- HU7 + HU8 + HU9
def test_stories_mejores_amigos_y_vistas(usuarios):
    ana, beto, caro, dani = usuarios
    beto.seguir(ana); caro.seguir(ana)
    s1 = ana.post("/stories", {"url_imagen": "s1.jpg"}).json()
    from datetime import datetime, timedelta
    venc, pub = datetime.fromisoformat(s1["fecha_vencimiento"]), datetime.fromisoformat(s1["fecha_publicacion"])
    assert venc - pub == timedelta(hours=24)
    assert ana.post(f"/usuarios/{ana.id}/mejores-amigos/{dani.id}").status_code == 400  # no la sigue
    assert ana.post(f"/usuarios/{ana.id}/mejores-amigos/{beto.id}").status_code == 204
    s2 = ana.post("/stories", {"url_imagen": "s2.jpg", "solo_mejores_amigos": True}).json()
    vieja = ana.post("/stories", {"url_imagen": "vieja.jpg"}).json()
    sql("UPDATE story SET fecha_publicacion = LOCALTIMESTAMP - INTERVAL '30 hours', "
        "fecha_vencimiento = LOCALTIMESTAMP - INTERVAL '6 hours' WHERE id = :id", id=vieja["id"])

    grupo = beto.get(f"/usuarios/{beto.id}/stories").json()
    assert len(grupo) == 1 and grupo[0]["usuario"]["username"] == "ana"
    assert [s["id"] for s in grupo[0]["stories"]] == [s1["id"], s2["id"]]
    assert [s["id"] for s in caro.get(f"/usuarios/{caro.id}/stories").json()[0]["stories"]] == [s1["id"]]
    assert caro.post(f"/stories/{s2['id']}/vista").status_code == 404
    assert beto.post(f"/stories/{vieja['id']}/vista").status_code == 404
    assert len(ana.get(f"/usuarios/{ana.id}/stories/archivo").json()) == 3

    for _ in range(3):
        beto.post(f"/stories/{s1['id']}/vista")
    caro.post(f"/stories/{s1['id']}/vista")
    ana.post(f"/stories/{s1['id']}/vista")  # el dueño no cuenta
    vistas = ana.get(f"/stories/{s1['id']}/vistas").json()
    assert sorted(v["username"] for v in vistas) == ["beto", "caro"]
    assert beto.get(f"/stories/{s1['id']}/vistas").status_code == 403
    assert beto.get(f"/usuarios/{beto.id}/stories").json()[0]["stories"][0]["vista"] is True

    beto.delete(f"/usuarios/{ana.id}/seguir")  # deja de seguir → sale de mejores amigos
    assert ana.get(f"/usuarios/{ana.id}/mejores-amigos").json() == []


# ---------- HU10
def test_bloqueos(usuarios):
    ana, beto, caro, _ = usuarios
    ana.seguir(beto); beto.seguir(ana)
    pid = ana.publicar()
    caro.seguir(ana)
    ana.post(f"/usuarios/{ana.id}/mejores-amigos/{beto.id}")
    beto.post(f"/posts/{pid}/like"); beto.post(f"/posts/{pid}/comentarios", {"texto": "hola"})
    caro.post(f"/posts/{pid}/like")
    s = ana.post("/stories", {"url_imagen": "s.jpg"}).json()

    assert ana.post(f"/usuarios/{beto.id}/bloqueo").status_code == 204
    assert ana.post(f"/usuarios/{beto.id}/bloqueo").status_code == 409
    assert sql("SELECT count(*) FROM seguidores WHERE :a IN (seguidor_id, seguido_id) AND :b IN (seguidor_id, seguido_id)",
               a=ana.id, b=beto.id).scalar() == 0
    assert ana.get(f"/usuarios/{ana.id}/mejores-amigos").json() == []
    assert beto.get("/usuarios/ana").status_code == 404
    assert beto.get(f"/usuarios/{ana.id}/posts").status_code == 404
    assert beto.get(f"/posts/{pid}").status_code == 404
    assert beto.post(f"/stories/{s['id']}/vista").status_code == 404
    assert beto.seguir(ana).status_code == 404
    post = caro.get(f"/posts/{pid}").json()
    assert post["cantidad_likes"] == 1 and post["cantidad_comentarios"] == 0
    assert [u["username"] for u in ana.get(f"/posts/{pid}/likes").json()] == ["caro"]
    assert [u["username"] for u in ana.get("/bloqueos").json()] == ["beto"]
    assert ana.delete(f"/usuarios/{beto.id}/bloqueo").status_code == 204
    assert beto.get("/usuarios/ana").status_code == 200


# ---------- HU11
def test_hashtags(usuarios):
    ana, beto, caro, _ = usuarios
    caro.patch(f"/usuarios/{caro.id}", {"es_privada": True})
    a = ana.publicar("#playa #sol"); b = beto.publicar("#playa"); caro.publicar("#playa #privado #privado2")
    viejo = beto.publicar("#viejo")
    sql("UPDATE post SET fecha_publicacion = LOCALTIMESTAMP - INTERVAL '2 days' WHERE id = :id", id=viejo)
    for n in range(12):
        ana.publicar(f"#tag{n:02d}")
    tendencia = ana.get("/hashtags/tendencia").json()
    assert len(tendencia) == 10 and tendencia[0] == {"nombre": "playa", "cantidad_posts": 2}
    nombres = {t["nombre"] for t in tendencia}
    assert not nombres & {"privado", "viejo"}
    caro.seguir(beto); ana.post(f"/posts/{b}/like"); caro.post(f"/posts/{b}/like")
    assert [p["id"] for p in ana.get("/hashtags/playa/posts").json()] == [b, a]
    assert [p["id"] for p in ana.get("/hashtags/%23PLAYA/posts").json()] == [b, a]


# ---------- HU12
def test_estadisticas(usuarios):
    ana, beto, caro, dani = usuarios
    ana.seguir(beto); beto.seguir(ana); caro.seguir(ana); ana.seguir(dani)
    p1, p2 = ana.publicar(), ana.publicar()
    for u in (beto, caro):
        u.post(f"/posts/{p1}/like")
    beto.post(f"/posts/{p2}/like")
    assert [u["username"] for u in ana.get(f"/usuarios/{ana.id}/no-me-siguen").json()] == ["dani"]
    e = ana.get(f"/usuarios/{ana.id}/estadisticas").json()
    assert e["cantidad_posts"] == 2 and e["promedio_likes_por_post"] == 1.5
    assert e["post_con_mas_likes"]["id"] == p1 and e["post_con_mas_likes"]["likes"] == 2
    assert e["seguidor_que_mas_likes_dio"]["username"] == "beto"
    vacio = ana.get(f"/usuarios/{ana.id}/estadisticas", params={"desde": "2000-01-01", "hasta": "2000-02-01"}).json()
    assert vacio["cantidad_posts"] == 0 and vacio["post_con_mas_likes"] is None
    assert ana.get(f"/usuarios/{ana.id}/estadisticas", params={"desde": "2030-01-01", "hasta": "2020-01-01"}).status_code == 400
    assert beto.get(f"/usuarios/{ana.id}/estadisticas").status_code == 403
