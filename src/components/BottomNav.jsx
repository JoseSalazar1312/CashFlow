import { Link, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const { pathname } = useLocation()

  const items = [
    { to: '/', label: 'Inicio', icon: '🏠' },
    { to: '/deuda/nueva', label: 'Agregar', icon: '➕' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-700 bg-surface">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
            pathname === item.to ? 'text-accent' : 'text-slate-400'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
