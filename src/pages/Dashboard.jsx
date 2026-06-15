import { useQuery } from '@powersync/react'
import { Link } from 'react-router-dom'
import { proximaFechaPago, formatFecha, textoPlazo } from '../lib/fechas'

export default function Dashboard() {
  // Totales generales
  const { data: totalDeudaRows } = useQuery(
    `select coalesce(sum(total_a_pagar), 0) as total
     from deudas where estatus = 'activa'`
  )
  const { data: totalPagadoRows } = useQuery(
    `select coalesce(sum(monto), 0) as total from historico_pagos`
  )

  // Deudas activas con su tipo e institución
  const { data: deudas } = useQuery(`
    select d.*, t.nombre as tipo_nombre, i.nombre as institucion_nombre
    from deudas d
    join tipos_deuda t on d.tipo_deuda_id = t.id
    left join instituciones i on d.institucion_id = i.id
    where d.estatus = 'activa'
    order by t.nombre, d.nombre
  `)

  const totalDeuda = totalDeudaRows?.[0]?.total ?? 0
  const totalPagado = totalPagadoRows?.[0]?.total ?? 0

  // Agrupar por tipo de deuda
  const grupos = {}
  for (const d of deudas ?? []) {
    const key = d.tipo_nombre
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(d)
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Mis Deudas</h1>

      {/* Cards de totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs text-slate-400">Total a pagar</p>
          <p className="text-xl font-bold text-danger">${Number(totalDeuda).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs text-slate-400">Total gastado</p>
          <p className="text-xl font-bold text-accent">${Number(totalPagado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Si Coopel tiene varios productos, mostrar su total combinado */}
      <TotalesPorInstitucion deudas={deudas ?? []} />

      {/* Listado por tipo de deuda */}
      {Object.entries(grupos).map(([tipo, items]) => (
        <div key={tipo}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {tipo.replace('_', ' ')}
          </h2>
          <div className="space-y-2">
            {items.map((d) => (
              <DeudaCard key={d.id} deuda={d} />
            ))}
          </div>
        </div>
      ))}

      {(!deudas || deudas.length === 0) && (
        <p className="py-10 text-center text-slate-500">
          No tienes deudas registradas. Toca "Agregar" para crear la primera.
        </p>
      )}
    </div>
  )
}

function TotalesPorInstitucion({ deudas }) {
  const porInstitucion = {}
  for (const d of deudas) {
    if (!d.institucion_nombre) continue
    porInstitucion[d.institucion_nombre] = (porInstitucion[d.institucion_nombre] ?? 0) + Number(d.total_a_pagar)
  }

  const entries = Object.entries(porInstitucion).filter(([, total]) => total > 0)
  if (entries.length === 0) return null

  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="mb-2 text-xs text-slate-400">Total por institución</p>
      <div className="space-y-1">
        {entries.map(([nombre, total]) => (
          <div key={nombre} className="flex justify-between text-sm">
            <span>{nombre}</span>
            <span className="font-semibold">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeudaCard({ deuda }) {
  const proxima = proximaFechaPago(deuda)
  const plazo = textoPlazo(deuda)

  return (
    <Link
      to={`/deuda/${deuda.id}`}
      className="block rounded-xl bg-surface p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{deuda.nombre}</p>
          {deuda.institucion_nombre && (
            <p className="text-xs text-slate-400">{deuda.institucion_nombre}</p>
          )}
        </div>
        <p className="font-bold">
          ${Number(deuda.total_a_pagar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{proxima ? `Próximo pago: ${formatFecha(proxima)}` : 'Sin fecha definida'}</span>
        {plazo && <span className="rounded bg-bg px-2 py-1 font-medium text-accent">{plazo}</span>}
      </div>
    </Link>
  )
}
