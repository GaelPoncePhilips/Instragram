import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Controls'
import { mensajeDeError } from '../../services/client'
import * as storiesApi from '../../services/stories'
import { snackbar } from '../../stores/ui'
import { MediaPicker, type MediaElegida } from '../create/MediaPicker'

export function CreateStoryPage() {
  const navigate = useNavigate()
  const [media, setMedia] = useState<MediaElegida | null>(null)
  const [amigos, setAmigos] = useState(false)
  const [busy, setBusy] = useState(false)

  const compartir = async () => {
    if (!media) return
    setBusy(true)
    try {
      await storiesApi.crearStory({ url_imagen: media.url_imagen, solo_mejores_amigos: amigos })
      snackbar(amigos ? 'Story compartida con Mejores amigos' : 'Story compartida')
      navigate('/')
    } catch (e) {
      snackbar(mensajeDeError(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[420px] pb-8">
      <ScreenHeader
        title="Nueva story"
        onBack={() => navigate(-1)}
        action={
          <Button size="sm" disabled={!media || busy} onClick={() => void compartir()}>
            Compartir
          </Button>
        }
      />
      <div className="space-y-4 px-4 pt-2">
        <div className="overflow-hidden rounded-lg">
          <MediaPicker accept="foto" aspect="9 / 16" value={media} onChange={setMedia} />
        </div>
        <Switch
          checked={amigos}
          onChange={setAmigos}
          icon="crown"
          label="Solo mejores amigos"
          description="Solo la verán las personas de tu lista de mejores amigos"
        />
        <Button full disabled={!media || busy} onClick={() => void compartir()}>
          Compartir
        </Button>
      </div>
    </div>
  )
}
