import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, usePowerSync } from '@powersync/react'
import { supabase } from '../lib/supabaseConnector'
import { proximaFechaPago, formatFecha, textoPlazo, nombreDiaSemana } from '../lib/fechas'

export default function DeudaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const db = usePowerSync()

  const [monto, setMonto] = useState('')
  const [tipoPago, setTipoPago] = useState('no_especificado')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const { data: deudaRows } = useQuery(
    'select d.*, t.nombre as tipo_nombre, i.nombre as institucion_nombre ' +
    'from deudas d ' +
    'join tipos_deuda t on d.tipo_deuda_id = t.id ' +
    'left join instituciones i on d.institucion_id = i.id ' +
    'where d.id = ?',
    [id]
  )

  const { data: pagos } = useQuery(
    'select * from historico_pagos where deuda_id = ? order by fecha_pago desc',
    [id]
  )

  const deuda = deudaRows?.[0]

  if (!deuda) {
    return <div className="p-4 text-slate-400">Cargando...</div>
  }

  const proxima = proximaFechaPago(deuda)
  const plazo = textoPlazo(deuda)

  async function registrarPago(e) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)
    setError(null)

    try {
      const pagoId = crypto.randomUUID()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? deuda.user_id

      await db.execute(
        'insert into historico_pagos (id, user_id, deuda_id, monto, fecha_pago, tipo_pago) ' +
        "values (?, ?, ?, ?, datetime('now'), ?)",
        [pagoId, userId, deuda.id, Number(monto), tipoPago]
      )
      setMonto('')
    } catch (err) {
      console.error('Error registrando pago:', err)
      setError('Error al registrar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function marcarFinalizada() {
    await db.execute(
      "update deudas set estatus = 'finalizada', fecha_finalizacion = datetime('now') where id = ?",
      [deuda.id]
    )
    navigate('/')
  }

  const totalPagado = (pagos ?? []).reduce((sum, p) => sum + Number(p.monto), 0)

  return (
    <div className="p-4 space-y-6">
      {/* Header con volver y editar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-400">
          Volver
        </button>
        <Link
          to={'/deuda/' + id + '/editar'}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
        >
          Editar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{deuda.nombre}</h1>
        <p className="text-sm text-slate-400">
          {deuda.tipo_nombre.replace('_', ' ')}
          {deuda.institucion_nombre ? ' - ' + deuda.institucion_nombre : ''}
        </p>
      </div>

      {/* Info de la deuda */}
      <div className="rounded-xl bg-surface p-4 space-y-2">
        <Fila
          label="Total a pagar"
          value={'$' + Number(deuda.total_a_pagar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        />
        <Fila
          label="Total pagado"
          value={'$' + totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          valueClass="text-accent"
        />
        {proxima && <Fila label="Proximo pago" value={formatFecha(proxima)} />}
        {deuda.fecha_corte && <Fila label="Dia de corte" value={'Dia ' + deuda.fecha_corte} />}
        {deuda.dia_semana_pago !== null && deuda.dia_semana_pago !== undefined && (
          <Fila label="Dia de pago" value={nombreDiaSemana(Number(deuda.dia_semana_pago))} />
        )}
        {plazo && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Plazo</span>
            <span className="rounded bg-bg px-2 py-1 font-medium text-accent">{plazo}</span>
          </div>
        )}
        <Fila label="Estatus" value={deuda.estatus} />
        {deuda.notas && <Fila label="Notas" value={deuda.notas} />}
      </div>

      {/* Registrar pago */}
      {deuda.estatus === 'activa' && (
        <form onSubmit={registrarPago} className="rounded-xl bg-surface p-4 space-y-3">
          <p className="font-semibold">Registrar pago</p>
          <input
            type="number"
            step="0.01"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg bg-bg p-3 outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <select
            value={tipoPago}
            onChange={(e) => setTipoPago(e.target.value)}
            className="w-full rounded-lg bg-bg p-3 outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="no_especificado">No especificado</option>
            <option value="capital">A capital</option>
            <option value="interes">A interes</option>
            <option value="total">Pago total</option>
          </select>

          {error && (
            <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-accent p-3 font-semibold text-bg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar pago'}
          </button>
        </form>
      )}

      {/* Historico */}
      <div>
        <p className="mb-2 font-semibold">Historial de pagos</p>
        <div className="space-y-2">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex justify-between rounded-lg bg-surface p-3 text-sm">
              <div>
                <p>{formatFecha(new Date(p.fecha_pago))}</p>
                <p className="text-xs text-slate-400">{p.tipo_pago.replace('_', ' ')}</p>
              </div>
              <p className="font-semibold text-accent">
                {'$' + Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
          {(!pagos || pagos.length === 0) && (
            <p className="text-sm text-slate-500">Aun no hay pagos registrados.</p>
          )}
        </div>
      </div>

      {deuda.estatus === 'activa' && (
        <button
          onClick={marcarFinalizada}
          className="w-full rounded-lg border border-slate-600 p-3 text-sm text-slate-300"
        >
          Marcar como finalizada
        </button>
      )}
    </div>
  )
}

function Fila({ label, value, valueClass = '' }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={'font-medium ' + valueClass}>{value}</span>
    </div>
  )
}
