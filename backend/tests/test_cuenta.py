"""CORS, búsqueda, subida de archivos, ediciones, contraseña, borrado lógico, refresh tokens y notificaciones."""
from tests.conftest import sql

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 100


def test_cors(client):
    r = client.options("/api/auth/login", headers={"Origin": "http://localhost:3000",
                                                   "Access-Control-Request-Method": "POST"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    r = client.options("/api/auth/login", headers={"Origin": "http://malo.com", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


def test_buscar_usuarios(client, usuarios):
    ana, beto, caro, dani = usuarios
    client.post("/api/usuarios", json={"username": "anabel", "email": "anabel@x.com", "password": "secreta123",
                                       "nombre": "Maria Ana"})
    ana.seguir(caro)
    assert [u["username"] for u in beto.get("/usuarios", params={"q": "ana"}).json()] == ["ana", "anabel"]
    assert [u["username"] for u in beto.get("/usuarios", params={"q": "MARIA"}).json()] == ["anabel"]
    assert [u["username"] for u in beto.get("/usuarios", params={"q": "@car"}).json()] == ["caro"]
    assert beto.get("/usuarios", params={"q": "%"}).json() == []  # comodines escapados
    caro.post(f"/usuarios/{beto.id}/bloqueo")
    assert beto.get("/usuarios", params={"q": "caro"}).json() == []
    assert beto.get("/usuarios").status_code == 422


def test_subir_media(client, usuarios):
    ana = usuarios[0]
    r = client.post("/api/media", headers=ana.h, files={"archivo": ("foto.png", PNG, "image/png")})
    assert r.status_code == 201 and r.json()["tipo"] == "imagen" and r.json()["url"].endswith(".png")
    ruta = r.json()["url"].split("/media/", 1)[1]
    assert client.get(f"/media/{ruta}").content == PNG
    assert client.post("/api/media", headers=ana.h, files={"archivo": ("v.mp4", MP4)}).json()["tipo"] == "video"
    # el nombre/Content-Type no engañan: se mira el contenido
    malo = client.post("/api/media", headers=ana.h, files={"archivo": ("x.png", b"<?php echo 1;", "image/png")})
    assert malo.status_code == 400
    assert client.post("/api/media", files={"archivo": ("f.png", PNG)}).status_code == 401


def test_editar_post_y_comentario(usuarios):
    ana, beto, *_ = usuarios
    pid = ana.publicar("hola #viejo")
    assert beto.patch(f"/posts/{pid}", {"descripcion": "hack"}).status_code == 403
    p = ana.patch(f"/posts/{pid}", {"descripcion": "chau #nuevo"}).json()
    assert p["descripcion"] == "chau #nuevo" and p["fecha_edicion"] is not None
    assert [p["id"] for p in ana.get("/hashtags/nuevo/posts").json()] == [pid]
    assert ana.get("/hashtags/viejo/posts").json() == []
    c = beto.post(f"/posts/{pid}/comentarios", {"texto": "lindo"}).json()
    assert c["fecha_edicion"] is None
    assert ana.patch(f"/comentarios/{c['id']}", {"texto": "x"}).status_code == 403  # ni el dueño del post
    assert beto.patch(f"/comentarios/{c['id']}", {"texto": " "}).status_code == 422
    e = beto.patch(f"/comentarios/{c['id']}", {"texto": "muy lindo"}).json()
    assert e["texto"] == "muy lindo" and e["fecha_edicion"] is not None


def test_cambiar_password(client, usuarios):
    ana = usuarios[0]
    viejo_refresh = ana.tokens["refresh_token"]
    assert ana.patch(f"/usuarios/{ana.id}/password", {"actual": "mal", "nueva": "otra12345"}).status_code == 400
    r = ana.patch(f"/usuarios/{ana.id}/password", {"actual": "secreta123", "nueva": "otra12345"})
    assert r.status_code == 200 and r.json()["refresh_token"]
    assert client.post("/api/auth/refresh", json={"refresh_token": viejo_refresh}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "ana@x.com", "password": "secreta123"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "ana@x.com", "password": "otra12345"}).status_code == 200


def test_refresh_tokens(client, usuarios):
    ana = usuarios[0]
    r1 = ana.tokens["refresh_token"]
    t2 = client.post("/api/auth/refresh", json={"refresh_token": r1}).json()
    assert t2["access_token"] and t2["refresh_token"] != r1
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {t2['access_token']}"}).status_code == 200
    # el refresh token no sirve como access token
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {t2['refresh_token']}"}).status_code == 401
    # reusar uno ya rotado revoca toda la familia (también el nuevo)
    assert client.post("/api/auth/refresh", json={"refresh_token": r1}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": t2["refresh_token"]}).status_code == 401
    # logout
    t = client.post("/api/auth/login", json={"email": "ana@x.com", "password": "secreta123"}).json()
    assert client.post("/api/auth/logout", json={"refresh_token": t["refresh_token"]}).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401
    # vencido
    t = client.post("/api/auth/login", json={"email": "ana@x.com", "password": "secreta123"}).json()
    sql("UPDATE refresh_token SET expira_en = LOCALTIMESTAMP - INTERVAL '1 second'")
    assert client.post("/api/auth/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401


def test_borrado_logico(client, usuarios):
    ana, beto, caro, _ = usuarios
    beto.seguir(ana); ana.seguir(beto); caro.seguir(beto)
    pid = beto.publicar("#tema")
    ana.post(f"/posts/{pid}/like"); ana.post(f"/posts/{pid}/comentarios", {"texto": "hola"})
    caro.post(f"/posts/{pid}/like")
    beto_post_de_ana = ana.publicar()
    beto.post(f"/posts/{beto_post_de_ana}/like")

    assert ana.delete(f"/usuarios/{ana.id}", {"password": "mal"}).status_code == 400
    assert ana.delete(f"/usuarios/{ana.id}", {"password": "secreta123"}).status_code == 204

    assert sql("SELECT eliminado_en IS NOT NULL FROM usuario WHERE id = :id", id=ana.id).scalar()  # sigue en la base
    assert ana.get("/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email": "ana@x.com", "password": "secreta123"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": ana.tokens["refresh_token"]}).status_code == 401
    assert beto.get("/usuarios/ana").status_code == 404
    assert beto.get(f"/posts/{beto_post_de_ana}").status_code == 404
    assert beto.get("/usuarios", params={"q": "ana"}).json() == []
    assert beto.get("/usuarios/beto").json()["cantidad_seguidores"] == 1  # solo caro
    assert [u["username"] for u in beto.get(f"/usuarios/{beto.id}/seguidores").json()] == ["caro"]
    p = caro.get(f"/posts/{pid}").json()
    assert p["cantidad_likes"] == 1 and p["cantidad_comentarios"] == 0
    assert beto.get(f"/posts/{pid}/comentarios").json() == []
    assert beto.seguir(ana).status_code == 404
    assert client.post("/api/usuarios", json={"username": "ana", "email": "n@x.com", "password": "secreta123",
                                              "nombre": "A"}).status_code == 409  # el username queda reservado


def test_notificaciones(usuarios):
    ana, beto, caro, dani = usuarios
    ana.patch(f"/usuarios/{ana.id}", {"es_privada": True})
    beto.seguir(ana); caro.seguir(ana)
    tipos = lambda u: [(n["tipo"], n["actor"]["username"]) for n in u.get("/notificaciones").json()]  # noqa: E731
    assert tipos(ana) == [("solicitud", "caro"), ("solicitud", "beto")]
    ana.patch(f"/usuarios/{ana.id}/solicitudes/{beto.id}", {"accion": "aceptar"})
    ana.patch(f"/usuarios/{ana.id}/solicitudes/{caro.id}", {"accion": "rechazar"})
    assert tipos(ana) == [("seguidor_nuevo", "beto")]
    assert tipos(beto) == [("solicitud_aceptada", "ana")]

    pid = ana.publicar()
    beto.post(f"/posts/{pid}/like"); beto.post(f"/posts/{pid}/like")  # like repetido no duplica
    ana.post(f"/posts/{pid}/like")  # propio: no notifica
    c = beto.post(f"/posts/{pid}/comentarios", {"texto": "hola"}).json()
    notis = ana.get("/notificaciones").json()
    assert [n["tipo"] for n in notis] == ["comentario", "like", "seguidor_nuevo"]
    assert notis[0]["comentario_id"] == c["id"] and notis[1]["post_id"] == pid
    beto.delete(f"/posts/{pid}/like")
    assert [n["tipo"] for n in ana.get("/notificaciones").json()] == ["comentario", "seguidor_nuevo"]

    album = dani.post("/albums", {"titulo": "A"}).json()
    dani.post(f"/albums/{album['id']}/invitaciones", {"usuario_id": ana.id})
    assert ana.get("/notificaciones/no-leidas").json() == {"no_leidas": 3}
    primera = ana.get("/notificaciones").json()[0]
    assert primera["tipo"] == "invitacion_album" and primera["album_id"] == album["id"]
    assert ana.post(f"/notificaciones/{primera['id']}/leida").status_code == 204
    assert ana.post(f"/notificaciones/{primera['id']}/leida").status_code == 404
    assert len(ana.get("/notificaciones", params={"solo_no_leidas": True}).json()) == 2
    ana.post("/notificaciones/leidas")
    assert ana.get("/notificaciones/no-leidas").json() == {"no_leidas": 0}
    assert beto.post(f"/notificaciones/{primera['id']}/leida").status_code == 404  # ajena

    ana.post(f"/usuarios/{beto.id}/bloqueo")  # las de un bloqueado desaparecen
    assert all(n["actor"]["username"] != "beto" for n in ana.get("/notificaciones").json())

    # pasar a pública acepta pendientes y notifica
    caro.seguir(ana)
    ana.patch(f"/usuarios/{ana.id}", {"es_privada": False})
    assert ("solicitud_aceptada", "ana") in tipos(caro)
