import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DeudaDetalle from './pages/DeudaDetalle'
import NuevaDeuda from './pages/NuevaDeuda'
import EditarDeuda from './pages/EditarDeuda'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Cargando...
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen pb-20">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/deuda/nueva" element={<NuevaDeuda />} />
        <Route path="/deuda/:id" element={<DeudaDetalle />} />
        <Route path="/deuda/:id/editar" element={<EditarDeuda />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
