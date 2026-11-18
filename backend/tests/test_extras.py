"""Features EXTRA: reels, recomendaciones, destacadas, álbumes y DMs."""


def test_reels(usuarios):
    ana, beto, *_ = usuarios
    assert ana.post("/posts", {"tipo": "reel", "url_imagen": "p.jpg"}).status_code == 422
    assert ana.post("/posts", {"url_imagen": "p.jpg", "url_video": "v.mp4"}).status_code == 422
    reel = ana.publicar("#baile", tipo="reel", url_video="v.mp4", duracion_seg=15)
    foto = ana.publicar("foto")
    assert [p["id"] for p in beto.get(f"/usuarios/{ana.id}/reels").json()] == [reel]
    beto.seguir(ana)
    assert {p["id"] for p in beto.get(f"/usuarios/{beto.id}/feed").json()} == {reel, foto}
    assert [p["id"] for p in beto.get(f"/usuarios/{beto.id}/reels/feed").json()] == [reel]
    beto.patch(f"/usuarios/{beto.id}", {"reels_desactivados": True})
    assert [p["id"] for p in beto.get(f"/usuarios/{beto.id}/feed").json()] == [foto]
    assert beto.get(f"/usuarios/{beto.id}/reels/feed").status_code == 403


def test_explorar_y_sugerencias(usuarios):
    ana, beto, caro, dani = usuarios
    ana.seguir(beto)
    caro.patch(f"/usuarios/{caro.id}", {"es_privada": True})
    del_privado = caro.publicar("#viajes")
    con_like_de_beto = dani.publicar("algo")
    beto.post(f"/posts/{con_like_de_beto}/like")
    propio = ana.publicar("#viajes")
    beto.publicar("ya lo sigo")
    explorar = ana.get(f"/usuarios/{ana.id}/explorar").json()
    ids = [p["id"] for p in explorar]
    assert con_like_de_beto in ids and del_privado not in ids and propio not in ids
    assert explorar[0]["motivo"] == "le gusta a cuentas que seguís"
    beto.seguir(dani)
    sugerencias = ana.get(f"/usuarios/{ana.id}/sugerencias").json()
    assert sugerencias[0]["username"] == "dani" and sugerencias[0]["en_comun"] == 1
    assert "beto" not in [s["username"] for s in sugerencias]


def test_destacadas(usuarios):
    ana, beto, caro, _ = usuarios
    beto.seguir(ana); caro.seguir(ana)
    ana.post(f"/usuarios/{ana.id}/mejores-amigos/{beto.id}")
    s = [ana.post("/stories", {"url_imagen": f"{n}.jpg"}).json()["id"] for n in range(3)]
    mba = ana.post("/stories", {"url_imagen": "mba.jpg", "solo_mejores_amigos": True}).json()["id"]
    otra = beto.post("/stories", {"url_imagen": "b.jpg"}).json()["id"]
    assert ana.post("/destacadas", {"titulo": "X", "story_ids": [otra]}).status_code == 400
    d1 = ana.post("/destacadas", {"titulo": "Viaje", "story_ids": [s[0], s[1]]}).json()
    d2 = ana.post("/destacadas", {"titulo": "Amigos", "story_ids": [mba]}).json()
    d3 = ana.post("/destacadas", {"titulo": "Otra", "story_ids": [s[2]]}).json()
    assert d1["portada_url"] == "0.jpg" and [d["orden"] for d in (d1, d2, d3)] == [0, 1, 2]
    # vencidas siguen en destacadas
    from tests.conftest import sql
    sql("UPDATE story SET fecha_vencimiento = LOCALTIMESTAMP - INTERVAL '1 hour', "
        "fecha_publicacion = LOCALTIMESTAMP - INTERVAL '25 hours'")
    assert [d["titulo"] for d in caro.get(f"/usuarios/{ana.id}/destacadas").json()] == ["Viaje", "Otra"]
    assert [d["titulo"] for d in beto.get(f"/usuarios/{ana.id}/destacadas").json()] == ["Viaje", "Amigos", "Otra"]
    assert caro.get(f"/destacadas/{d2['id']}").status_code == 404
    r = ana.put(f"/usuarios/{ana.id}/destacadas/orden", {"destacada_ids": [d3["id"], d1["id"], d2["id"]]})
    assert [d["titulo"] for d in r.json()] == ["Otra", "Viaje", "Amigos"]
    assert ana.put(f"/usuarios/{ana.id}/destacadas/orden", {"destacada_ids": [d3["id"]]}).status_code == 400
    r = ana.put(f"/destacadas/{d1['id']}/orden", {"story_ids": [s[1], s[0]]})
    assert [x["id"] for x in r.json()["stories"]] == [s[1], s[0]]
    assert ana.post(f"/destacadas/{d1['id']}/stories", {"story_id": s[2]}).json()["stories"][-1]["id"] == s[2]
    assert ana.post(f"/destacadas/{d1['id']}/stories", {"story_id": s[2]}).status_code == 409
    assert beto.patch(f"/destacadas/{d1['id']}", {"titulo": "hack"}).status_code == 403
    assert ana.patch(f"/destacadas/{d1['id']}", {"titulo": "Verano"}).json()["titulo"] == "Verano"
    assert ana.delete(f"/destacadas/{d1['id']}/stories/{s[0]}").status_code == 204
    assert ana.delete(f"/destacadas/{d2['id']}").status_code == 204


def test_albums(usuarios):
    ana, beto, caro, dani = usuarios
    album = ana.post("/albums", {"titulo": "Viaje"}).json()
    aid = album["id"]
    assert album["miembros"][0]["rol"] == "admin"
    assert beto.get(f"/albums/{aid}").status_code == 404
    assert beto.post(f"/albums/{aid}/invitaciones", {"usuario_id": caro.id}).status_code == 404
    ana.post(f"/albums/{aid}/invitaciones", {"usuario_id": beto.id})
    assert ana.post(f"/albums/{aid}/invitaciones", {"usuario_id": beto.id}).status_code == 409
    assert beto.post(f"/albums/{aid}/items", {"url_imagen": "x"}).status_code == 403  # pendiente
    assert [a["id"] for a in beto.get(f"/usuarios/{beto.id}/invitaciones-album").json()] == [aid]
    beto.post(f"/albums/{aid}/invitaciones/aceptar")
    item = beto.post(f"/albums/{aid}/items", {"url_imagen": "b.jpg"}).json()
    ana.post(f"/albums/{aid}/items", {"url_imagen": "a.jpg"})
    # visible para seguidores de miembros, que no pueden subir
    caro.seguir(beto)
    assert len(caro.get(f"/albums/{aid}/items").json()) == 2
    assert caro.post(f"/albums/{aid}/items", {"url_imagen": "c"}).status_code == 403
    assert [a["id"] for a in caro.get(f"/usuarios/{beto.id}/albums").json()] == [aid]
    assert dani.get(f"/albums/{aid}").status_code == 404
    assert caro.get(f"/albums/{aid}").json()["portada_url"] == "b.jpg"
    # bloqueos
    ana.post(f"/usuarios/{caro.id}/bloqueo")
    assert caro.get(f"/albums/{aid}").status_code == 404
    assert ana.post(f"/albums/{aid}/invitaciones", {"usuario_id": caro.id}).status_code == 400
    # permisos de borrado y traspaso de admin
    assert beto.delete(f"/albums/{aid}/items/{item['id']}").status_code == 204
    assert beto.patch(f"/albums/{aid}", {"titulo": "x"}).status_code == 403
    assert ana.delete(f"/albums/{aid}/miembros/{ana.id}").status_code == 204
    miembros = beto.get(f"/albums/{aid}").json()["miembros"]
    assert [(m["username"], m["rol"]) for m in miembros] == [("beto", "admin")]
    assert beto.delete(f"/albums/{aid}/miembros/{beto.id}").status_code == 204
    assert beto.get(f"/albums/{aid}").status_code == 404  # sin miembros se borra


def test_dms(usuarios):
    ana, beto, caro, dani = usuarios
    beto.seguir(ana)
    c = ana.post("/conversaciones", {"participantes": [beto.id]}).json()
    assert ana.post("/conversaciones", {"participantes": [beto.id]}).json()["id"] == c["id"]  # única por par
    assert beto.get("/conversaciones").json()[0]["id"] == c["id"]  # beto sigue a ana: aceptada
    c2 = ana.post("/conversaciones", {"participantes": [caro.id]}).json()
    assert caro.get("/conversaciones").json() == []
    assert [x["id"] for x in caro.get("/conversaciones/solicitudes").json()] == [c2["id"]]
    m1 = ana.post(f"/conversaciones/{c['id']}/mensajes", {"texto": "hola"}).json()
    ana.post(f"/conversaciones/{c['id']}/mensajes", {"texto": "¿todo bien?"})
    assert beto.get("/conversaciones").json()[0]["no_leidos"] == 2
    assert ana.get("/conversaciones").json()[0]["no_leidos"] == 0
    beto.post(f"/conversaciones/{c['id']}/leido")
    assert beto.get("/conversaciones").json()[0]["no_leidos"] == 0
    assert ana.post(f"/conversaciones/{c['id']}/mensajes", {}).status_code == 422
    msgs = beto.get(f"/conversaciones/{c['id']}/mensajes", params={"limit": 1}).json()
    assert msgs[0]["texto"] == "¿todo bien?"
    assert beto.get(f"/conversaciones/{c['id']}/mensajes", params={"antes_de": msgs[0]["id"]}).json()[0]["id"] == m1["id"]
    assert dani.get(f"/conversaciones/{c['id']}/mensajes").status_code == 404
    assert beto.delete(f"/mensajes/{m1['id']}").status_code == 403
    assert ana.delete(f"/mensajes/{m1['id']}").status_code == 204
    # compartir post respeta la privacidad
    dani.patch(f"/usuarios/{dani.id}", {"es_privada": True})
    privado = dani.publicar()
    assert ana.post(f"/conversaciones/{c['id']}/mensajes", {"post_id": privado}).status_code == 403
    # responder acepta la solicitud
    caro.post(f"/conversaciones/{c2['id']}/mensajes", {"texto": "hola"})
    assert [x["id"] for x in caro.get("/conversaciones").json()] == [c2["id"]]
    grupo = ana.post("/conversaciones", {"participantes": [beto.id, caro.id], "nombre": "Grupo"}).json()
    assert grupo["es_grupal"] and len(grupo["participantes"]) == 3
    # bloqueo corta los DMs
    beto.post(f"/usuarios/{ana.id}/bloqueo")
    assert ana.post(f"/conversaciones/{c['id']}/mensajes", {"texto": "?"}).status_code == 403
    assert ana.post("/conversaciones", {"participantes": [beto.id]}).status_code == 404
    assert ana.delete(f"/conversaciones/{c['id']}").status_code == 204
