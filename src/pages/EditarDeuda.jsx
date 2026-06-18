import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, usePowerSync } from '@powersync/react'

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' }
]

export default function EditarDeuda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const db = usePowerSync()

  const { data: deudaRows } = useQuery(
    'select d.*, t.nombre as tipo_nombre, i.nombre as institucion_nombre ' +
    'from deudas d ' +
    'join tipos_deuda t on d.tipo_deuda_id = t.id ' +
    'left join instituciones i on d.institucion_id = i.id ' +
    'where d.id = ?',
    [id]
  )

  const { data: tipos } = useQuery('select * from tipos_deuda order by id')
  const { data: instituciones } = useQuery('select * from instituciones order by nombre')

  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const deuda = deudaRows?.[0]

  // Cargar datos actuales en el form cuando llegan
  useEffect(() => {
    if (deuda && !form) {
      setForm({
        nombre: deuda.nombre ?? '',
        total_a_pagar: deuda.total_a_pagar ?? '',
        fecha_pago_fija: deuda.fecha_pago_fija ?? '',
        dia_semana_pago: deuda.dia_semana_pago ?? '',
        // dia_quincena_pago viene como string JSON "[5]" o "[15,30]"
        dia_quincena_pago: deuda.dia_quincena_pago
          ? JSON.parse(deuda.dia_quincena_pago).join(', ')
          : '',
        fecha_corte: deuda.fecha_corte ?? '',
        promesa_pago: deuda.promesa_pago ?? '',
        plazo_total: deuda.plazo_total ?? '',
        notas: deuda.notas ?? ''
      })
    }
  }, [deuda])

  if (!deuda || !form) {
    return <div className="p-4 text-slate-400">Cargando...</div>
  }

  const tipoNombre = deuda.tipo_nombre
  const institucionNombre = deuda.institucion_nombre

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    try {
      await db.execute(
        'update deudas set ' +
          'nombre = ?, ' +
          'total_a_pagar = ?, ' +
          'fecha_pago_fija = ?, ' +
          'dia_semana_pago = ?, ' +
          'dia_quincena_pago = ?, ' +
          'fecha_corte = ?, ' +
          'promesa_pago = ?, ' +
          'plazo_total = ?, ' +
          'notas = ? ' +
        'where id = ?',
        [
          form.nombre,
          Number(form.total_a_pagar) || 0,
          form.fecha_pago_fija ? Number(form.fecha_pago_fija) : null,
          form.dia_semana_pago !== '' ? Number(form.dia_semana_pago) : null,
          form.dia_quincena_pago
            ? JSON.stringify(form.dia_quincena_pago.split(',').map((d) => Number(d.trim())))
            : null,
          form.fecha_corte ? Number(form.fecha_corte) : null,
          form.promesa_pago || null,
          form.plazo_total ? Number(form.plazo_total) : null,
          form.notas || null,
          id
        ]
      )

      navigate('/deuda/' + id)
    } catch (err) {
      console.error('Error editando deuda:', err)
      setError('Error al guardar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-400">
        Volver
      </button>

      <h1 className="text-2xl font-bold">Editar deuda</h1>
      <p className="text-sm text-slate-400">
        {tipoNombre?.replace('_', ' ')}
        {institucionNombre ? ' - ' + institucionNombre : ''}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        <Campo label="Nombre / descripcion">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => update('nombre', e.target.value)}
            className="w-full rounded-lg bg-surface p-3"
            required
          />
        </Campo>

        <Campo label="Total a pagar (saldo pendiente actual)">
          <input
            type="number"
            step="0.01"
            value={form.total_a_pagar}
            onChange={(e) => update('total_a_pagar', e.target.value)}
            className="w-full rounded-lg bg-surface p-3"
            required
          />
        </Campo>

        {/* Dia fijo mensual: apps, ML, TDC */}
        {(tipoNombre === 'aplicacion' ||
          tipoNombre === 'tarjeta_credito' ||
          institucionNombre === 'Mercado Libre') && (
          <Campo label="Dia de pago (1-31)">
            <input
              type="number"
              min="1"
              max="31"
              value={form.fecha_pago_fija}
              onChange={(e) => update('fecha_pago_fija', e.target.value)}
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        {/* TDC: corte */}
        {tipoNombre === 'tarjeta_credito' && (
          <Campo label="Dia de corte (1-31)">
            <input
              type="number"
              min="1"
              max="31"
              value={form.fecha_corte}
              onChange={(e) => update('fecha_corte', e.target.value)}
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        {/* Elektra: dia semana + plazo */}
        {institucionNombre === 'Elektra' && (
          <>
            <Campo label="Dia de pago semanal">
              <select
                value={form.dia_semana_pago}
                onChange={(e) => update('dia_semana_pago', e.target.value)}
                className="w-full rounded-lg bg-surface p-3"
              >
                <option value="">Selecciona...</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Plazo total (semanas)">
              <input
                type="number"
                value={form.plazo_total}
                onChange={(e) => update('plazo_total', e.target.value)}
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
          </>
        )}

        {/* Coopel: dias del mes + plazo */}
        {institucionNombre === 'Coopel' && (
          <>
            <Campo label="Dia(s) de pago en el mes">
              <input
                type="text"
                value={form.dia_quincena_pago}
                onChange={(e) => update('dia_quincena_pago', e.target.value)}
                placeholder="Ej: 5  o  5, 20"
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
            <Campo label="Plazo total (meses)">
              <input
                type="number"
                value={form.plazo_total}
                onChange={(e) => update('plazo_total', e.target.value)}
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
          </>
        )}

        {/* Nomina */}
        {tipoNombre === 'nomina' && (
          <Campo label="Dias de pago (quincena)">
            <input
              type="text"
              value={form.dia_quincena_pago}
              onChange={(e) => update('dia_quincena_pago', e.target.value)}
              placeholder="Ej: 15, 30"
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        {/* Personas */}
        {tipoNombre === 'personas' && (
          <Campo label="Promesa de pago (fecha)">
            <input
              type="date"
              value={form.promesa_pago}
              onChange={(e) => update('promesa_pago', e.target.value)}
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        <Campo label="Notas (opcional)">
          <textarea
            value={form.notas}
            onChange={(e) => update('notas', e.target.value)}
            className="w-full rounded-lg bg-surface p-3"
            rows={2}
          />
        </Campo>

        {error && (
          <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-accent p-3 font-semibold text-bg disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-400">{label}</label>
      {children}
    </div>
  )
}
