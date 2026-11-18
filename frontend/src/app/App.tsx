import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, type Location } from 'react-router'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { CenteredLoader } from '../components/ui/Feedback'
import { AlbumPage } from '../features/albums/AlbumPage'
import { CreateAlbumPage } from '../features/albums/CreateAlbumPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { CreatePostPage } from '../features/create/CreatePostPage'
import { CreateReelPage } from '../features/create/CreateReelPage'
import { DirectPage } from '../features/dm/DirectPage'
import { ExplorePage } from '../features/explore/ExplorePage'
import { HomePage } from '../features/feed/HomePage'
import { HashtagPage } from '../features/hashtags/HashtagPage'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import { PostModal, PostPage } from '../features/post/PostPage'
import { EditProfilePage } from '../features/profile/EditProfilePage'
import { FollowListPage } from '../features/profile/FollowListPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { ReelsPage } from '../features/reels/ReelsPage'
import { SearchPage } from '../features/search/SearchPage'
import { BestFriendsPage, BlockedPage, NotFollowingPage, RequestsPage, SettingsPage, StatsPage } from '../features/settings/SettingsPages'
import { CreateStoryPage } from '../features/stories/CreateStoryPage'
import { StoryViewerPage } from '../features/stories/StoryViewer'
import { useSession } from '../stores/session'
import { AppLayout } from './layout/AppLayout'

function RequireAuth() {
  const estado = useSession((s) => s.estado)
  const location = useLocation()
  if (estado === 'iniciando') return <CenteredLoader className="min-h-dvh items-center" />
  if (estado === 'anonimo') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function OnlyAnon() {
  const estado = useSession((s) => s.estado)
  if (estado === 'iniciando') return <CenteredLoader className="min-h-dvh items-center" />
  if (estado === 'autenticado') return <Navigate to="/" replace />
  return <Outlet />
}

function ArchivoRedirect() {
  const u = useSession((s) => s.usuario)
  return <Navigate to={u ? `/${u.username}/archivo` : '/'} replace />
}

/**
 * Rutas. El detalle de post usa el patrón "background location": en escritorio, abrir /p/:id desde
 * una grilla o el feed lo muestra como modal de dos columnas sobre la pantalla anterior.
 */
function AppRoutes() {
  const location = useLocation()
  const state = location.state as { background?: Location } | null
  const background = state?.background
  const sesionId = useSession((s) => s.sesionId)

  return (
    <>
      <Routes location={background ?? location} key={sesionId}>
        <Route element={<OnlyAnon />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/explorar" element={<ExplorePage />} />
            <Route path="/hashtags/:nombre" element={<HashtagPage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/reels/:id" element={<ReelsPage />} />
            <Route path="/p/:id" element={<PostPage />} />
            <Route path="/stories/:usuarioId" element={<StoryViewerPage modo="usuario" />} />
            <Route path="/destacadas/:id" element={<StoryViewerPage modo="destacada" />} />
            <Route path="/direct" element={<DirectPage />} />
            <Route path="/direct/solicitudes" element={<DirectPage />} />
            <Route path="/direct/nuevo" element={<DirectPage />} />
            <Route path="/direct/:convId" element={<DirectPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
            <Route path="/crear/publicacion" element={<CreatePostPage />} />
            <Route path="/crear/reel" element={<CreateReelPage />} />
            <Route path="/crear/story" element={<CreateStoryPage />} />
            <Route path="/albumes/nuevo" element={<CreateAlbumPage />} />
            <Route path="/albumes/:id" element={<AlbumPage />} />
            <Route path="/cuenta/editar" element={<EditProfilePage />} />
            <Route path="/cuenta/ajustes" element={<SettingsPage />} />
            <Route path="/cuenta/estadisticas" element={<StatsPage />} />
            <Route path="/cuenta/no-me-siguen" element={<NotFollowingPage />} />
            <Route path="/cuenta/solicitudes" element={<RequestsPage />} />
            <Route path="/cuenta/mejores-amigos" element={<BestFriendsPage />} />
            <Route path="/cuenta/bloqueados" element={<BlockedPage />} />
            <Route path="/cuenta/archivo" element={<ArchivoRedirect />} />
            <Route path="/:username" element={<ProfilePage tab="publicaciones" />} />
            <Route path="/:username/reels" element={<ProfilePage tab="reels" />} />
            <Route path="/:username/albumes" element={<ProfilePage tab="albumes" />} />
            <Route path="/:username/archivo" element={<ProfilePage tab="archivo" />} />
            <Route path="/:username/seguidores" element={<FollowListPage tipo="seguidores" />} />
            <Route path="/:username/seguidos" element={<FollowListPage tipo="seguidos" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
      {background && (
        <Routes>
          <Route path="/p/:id" element={<PostModal />} />
        </Routes>
      )}
    </>
  )
}

export function App() {
  const iniciar = useSession((s) => s.iniciar)
  useEffect(() => {
    void iniciar()
  }, [iniciar])
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
