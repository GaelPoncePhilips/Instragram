from src.repositories.usuario_repository import UsuarioRepository
from src.mappers.usuario_mapper import UsuarioMapper
from src.dtos.usuario_dto import UsuarioDTO


class UsuarioService:

    def __init__(self, repository: UsuarioRepository):
        self.repository = repository

    def registrar_usuario(self, datos):

        if self.repository.buscar_por_username(datos.username):
            raise ValueError("El username ya está registrado")

        if self.repository.buscar_por_email(datos.email):
            raise ValueError("El email ya está registrado")

        # La contraseña debe almacenarse mediante un hash seguro.
        from pwdlib import PasswordHash
        password_hash = PasswordHash.recommended().hash(datos.password)

        dto = UsuarioDTO(
            id=None,
            username=datos.username,
            email=datos.email,
            password_hash=password_hash,
            nombre=datos.nombre,
            bio=datos.bio,
            es_privada=False,
            fecha_registro=None
        )

        usuario = UsuarioMapper.to_model(dto)

        usuario_creado = self.repository.crear(usuario)

        return UsuarioMapper.to_dto(usuario_creado)

    def obtener_perfil(self, username: str):

        usuario = self.repository.buscar_por_username(username)

        if not usuario:
            raise ValueError("Usuario no encontrado")

        estadisticas = self.repository.obtener_estadisticas(usuario.id)

        return {
            "username": usuario.username,
            "nombre": usuario.nombre,
            "bio": usuario.bio,
            "es_privada": usuario.es_privada,
            **estadisticas
        }

    # Cambiar la privacidad de la cuenta
    def cambiar_privacidad(self, usuario_id: int, es_privada: bool):

        usuario = self.repository.buscar_por_id(usuario_id)

        if not usuario:
            raise ValueError("Usuario no encontrado")

        usuario_actualizado = self.repository.actualizar_privacidad(
            usuario,
            es_privada
        )

        return UsuarioMapper.to_dto(usuario_actualizado)
