"""Recomendador: intercalado, ventanas de tiempo, señal colaborativa y sugerencias."""
from src.services.recomendacion_service import PATRON_FEED, intercalar
from tests.conftest import Usuario, sql


def envejecer(post_id: int, horas: float):
    sql("UPDATE post SET fecha_publicacion = LOCALTIMESTAMP - make_interval(secs => :s) WHERE id = :id",
        s=horas * 3600, id=post_id)


def test_intercalar_unitario():
    colas = {"amigo": [(1, 9, "a"), (2, 8, "a")], "interes": [(10, 5, "i"), (1, 4, "i")],
             "cercano": [], "popular": [(20, 1, "p")]}
    ids = [x[0] for x in intercalar(colas, PATRON_FEED, 10)]
    assert ids == [1, 10, 20, 2]  # cercano vacío se saltea; el 1 repetido en interés no se duplica
    assert [x[0] for x in intercalar(colas, PATRON_FEED, 2)] == [1, 10]


def test_feed_recomendado_intercala_y_respeta_tiempos(client, usuarios):
    yo, amigo, cercano, celebridad = usuarios
    extra = Usuario(client, "extra")      # cuenta pública que no sigo (descubrimiento)
    gemelo = Usuario(client, "gemelo")    # mismos gustos que yo (colaborativo)

    # amigo: nos seguimos. cercano: nos seguimos y está en mis mejores amigos. celebridad: la sigo, no me sigue.
    for u in (amigo, cercano):
        yo.seguir(u); u.seguir(yo)
    yo.seguir(celebridad)
    yo.post(f"/usuarios/{yo.id}/mejores-amigos/{cercano.id}")

    p_amigo = amigo.publicar("hola")
    p_amigo_viejo = amigo.publicar("de ayer y medio"); envejecer(p_amigo_viejo, 37)
    p_cercano = cercano.publicar("cerca")
    p_celebridad = celebridad.publicar("famosa")
    p_celeb_vieja = celebridad.publicar("vieja"); envejecer(p_celeb_vieja, 80)

    # colaborativo: gemelo y yo likeamos lo mismo; gemelo likea un post de extra que yo no vi
    base = [extra.publicar(f"base {i}") for i in range(2)]
    for pid in base:
        yo.post(f"/posts/{pid}/like"); gemelo.post(f"/posts/{pid}/like")
    p_interes = extra.publicar("te va a gustar")
    envejecer(p_interes, 72)  # 3 días: sigue dentro de la ventana de interés (7 días)
    gemelo.post(f"/posts/{p_interes}/like")
    p_interes_viejo = extra.publicar("muy viejo"); envejecer(p_interes_viejo, 200)
    gemelo.post(f"/posts/{p_interes_viejo}/like")

    from src.db.connection import SessionLocal
    from src.jobs.recalcular_afinidad import recalcular
    with SessionLocal() as db:
        assert recalcular(db) == 2  # yo↔gemelo en los dos sentidos
    # 2 likes en común; yo tengo 2 likes y gemelo 4: 2 / sqrt(2 * 4)
    assert float(sql("SELECT round(score::numeric, 2) FROM afinidad_usuario WHERE usuario_id = :id", id=yo.id).scalar()) == 0.71

    feed = yo.get(f"/usuarios/{yo.id}/feed", params={"modo": "recomendado"}).json()
    ids = [p["id"] for p in feed]
    assert ids[:4] == [p_amigo, p_interes, p_cercano, p_celebridad]
    assert [p["motivo"] for p in feed[:4]] == ["de un amigo", "le gustó a gente con tus gustos",
                                               "de tus mejores amigos", "de una cuenta que seguís"]
    assert p_amigo_viejo not in ids        # conocidos: máximo 36 h
    assert p_celeb_vieja not in ids        # celebridades: máximo 72 h
    assert p_interes_viejo not in ids      # interés: máximo 7 días
    assert not set(base) & set(ids)        # ya los likeé

    # paginación consistente
    pag = [p["id"] for p in yo.get(f"/usuarios/{yo.id}/feed", params={"modo": "recomendado", "limit": 2, "offset": 2}).json()]
    assert pag == ids[2:4]
    # el modo de la consigna (HU6) sigue siendo cronológico
    crono = [p["id"] for p in yo.get(f"/usuarios/{yo.id}/feed").json()]
    assert crono[0] == p_celebridad and p_amigo_viejo in crono


def test_conocidos_decaen_rapido(usuarios):
    yo, a, b, _ = usuarios
    for u in (a, b):
        yo.seguir(u); u.seguir(yo)
    reciente = a.publicar(); envejecer(reciente, 1)
    con_likes_pero_vieja = b.publicar(); envejecer(con_likes_pero_vieja, 30)
    yo.post(f"/posts/{con_likes_pero_vieja}/like")
    ids = [p["id"] for p in yo.get(f"/usuarios/{yo.id}/feed", params={"modo": "recomendado"}).json()]
    assert ids == [reciente, con_likes_pero_vieja]


def test_reels_y_explorar(client, usuarios):
    yo, amigo, desconocido, privado = usuarios
    yo.seguir(amigo); amigo.seguir(yo)
    privado.patch(f"/usuarios/{privado.id}", {"es_privada": True})
    reel_amigo = amigo.publicar(tipo="reel", url_video="v.mp4")
    amigo.publicar("foto")
    reel_popular = desconocido.publicar(tipo="reel", url_video="v.mp4")
    amigo.post(f"/posts/{reel_popular}/like")
    privado.publicar(tipo="reel", url_video="v.mp4")
    reels = [p["id"] for p in yo.get(f"/usuarios/{yo.id}/reels/feed").json()]
    assert reels == [reel_amigo, reel_popular]
    explorar = yo.get(f"/usuarios/{yo.id}/explorar").json()
    assert [p["id"] for p in explorar] == [reel_popular]  # solo cuentas que no sigo y públicas
    assert explorar[0]["motivo"] == "le gusta a cuentas que seguís"


def test_sugerencias_por_grafo_social(client, usuarios):
    yo, a, b, famoso = usuarios
    x = Usuario(client, "xx")
    yo.seguir(a); yo.seguir(b)
    a.seguir(x); b.seguir(x)          # x: 2 en común
    a.seguir(famoso)                  # famoso: 1 en común pero muchos seguidores
    for i in range(6):
        Usuario(client, f"fan{i}").seguir(famoso)
    sug = yo.get(f"/usuarios/{yo.id}/sugerencias").json()
    assert [s["username"] for s in sug[:2]] == ["xx", famoso.username]
    assert sug[0]["en_comun"] == 2
