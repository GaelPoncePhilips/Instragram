/** Editar perfil (HU1). */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Switch, TextField } from '../../components/ui/Controls'
import { mensajeDeError } from '../../services/client'
import * as usuariosApi from '../../services/usuarios'
import { useSession, useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'

export function EditProfilePage() {
  const yo = useYo()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(yo.nombre)
  const [bio, setBio] = useState(yo.bio ?? '')
  const [privada, setPrivada] = useState(yo.es_privada)
  const [busy, setBusy] = useState(false)
  const cambios = nombre !== yo.nombre || bio !== (yo.bio ?? '') || privada !== yo.es_privada

  const guardar = async () => {
    if (!nombre.trim()) return
    setBusy(true)
    try {
      const u = await usuariosApi.actualizarUsuario(yo.id, { nombre: nombre.trim(), bio: bio.trim() || null, es_privada: privada })
      useSession.getState().setUsuario(u)
      snackbar('Perfil actualizado')
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[600px] pb-10">
      <ScreenHeader title="Editar perfil" onBack={() => navigate(`/${yo.username}`)} />
      <div className="flex flex-col gap-6 px-4 pt-6">
        <div className="flex items-center gap-4 rounded-lg bg-surface-container p-4">
          <Avatar username={yo.username} size={56} />
          <div className="min-w-0">
            <p className="type-label-l emphasized truncate">{yo.username}</p>
            {/* TEMPORAL: el contrato no tiene foto de perfil. */}
            <p className="type-body-s text-on-surface-variant">La foto de perfil todavía no se puede cambiar (TEMPORAL)</p>
          </div>
        </div>
        <TextField label="Nombre" value={nombre} onChange={setNombre} maxLength={100} error={nombre.trim() ? null : 'El nombre es obligatorio'} />
        <TextField label="Presentación" value={bio} onChange={setBio} multiline maxLength={150} hint={`${bio.length}/150`} />
        <Switch
          checked={privada}
          onChange={setPrivada}
          label="Cuenta privada"
          description="Si tu cuenta es privada, solo las personas que apruebes podrán ver tus fotos, videos y stories. Tus seguidores actuales no se verán afectados."
        />
        <div className="flex justify-end">
          <Button disabled={busy || !cambios || !nombre.trim()} onClick={() => void guardar()}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
