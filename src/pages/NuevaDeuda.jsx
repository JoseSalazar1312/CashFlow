import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, usePowerSync } from '@powersync/react'
import { supabase } from '../lib/supabaseConnector'

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' }
]

export default function NuevaDeuda() {
  const navigate = useNavigate()
  const db = usePowerSync()

  const { data: tipos } = useQuery('select * from tipos_deuda order by id')
  const { data: instituciones } = useQuery('select * from instituciones order by nombre')

  const [form, setForm] = useState({
    tipo_deuda_id: '',
    institucion_id: '',
    nombre: '',
    total_a_pagar: '',
    fecha_pago_fija: '',
    dia_semana_pago: '',
    dia_quincena_pago: '',
    fecha_corte: '',
    promesa_pago: '',
    plazo_total: '',
    notas: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const tipoSeleccionado = tipos?.find((t) => String(t.id) === String(form.tipo_deuda_id))?.nombre
  const institucionSeleccionada = instituciones?.find(
    (i) => String(i.id) === String(form.institucion_id)
  )?.nombre

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    try {
      // UUID generado en JS — SQLite no tiene uuid()
      const id = crypto.randomUUID()

      // user_id desde la sesion de Supabase — no usar auth.uid() en SQLite
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? ''

      await db.execute(
        'insert into deudas (' +
          'id, user_id, tipo_deuda_id, institucion_id, nombre, total_a_pagar, ' +
          'estatus, fecha_pago_fija, dia_semana_pago, dia_quincena_pago, ' +
          'fecha_corte, promesa_pago, plazo_total, plazo_pagado, ' +
          'fecha_creacion, notas' +
        ') values (?, ?, ?, ?, ?, ?, ' +
          "'activa', ?, ?, ?, " +
          '?, ?, ?, 0, ' +
          "datetime('now'), ?)",
        [
          id,
          userId,
          form.tipo_deuda_id || null,
          form.institucion_id || null,
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
          form.notas || null
        ]
      )

      navigate('/')
    } catch (err) {
      console.error('Error guardando deuda:', err)
      setError('Error al guardar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Nueva deuda</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Campo label="Tipo de deuda">
          <select
            value={form.tipo_deuda_id}
            onChange={(e) => update('tipo_deuda_id', e.target.value)}
            className="w-full rounded-lg bg-surface p-3"
            required
          >
            <option value="">Selecciona...</option>
            {(tipos ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Campo>

        {tipoSeleccionado === 'institucion' && (
          <Campo label="Institucion">
            <select
              value={form.institucion_id}
              onChange={(e) => update('institucion_id', e.target.value)}
              className="w-full rounded-lg bg-surface p-3"
              required
            >
              <option value="">Selecciona...</option>
              {(instituciones ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo label="Nombre / descripcion">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => update('nombre', e.target.value)}
            placeholder="Ej: Tala, TDC Banorte, Refrigerador Coopel"
            className="w-full rounded-lg bg-surface p-3"
            required
          />
        </Campo>

        <Campo label="Total a pagar">
          <input
            type="number"
            step="0.01"
            value={form.total_a_pagar}
            onChange={(e) => update('total_a_pagar', e.target.value)}
            className="w-full rounded-lg bg-surface p-3"
            required
          />
        </Campo>

        {/* Aplicacion, Mercado Libre, TDC: dia fijo del mes */}
        {(tipoSeleccionado === 'aplicacion' ||
          tipoSeleccionado === 'tarjeta_credito' ||
          institucionSeleccionada === 'Mercado Libre') && (
          <Campo label="Dia de pago (1-31)">
            <input
              type="number"
              min="1"
              max="31"
              value={form.fecha_pago_fija}
              onChange={(e) => update('fecha_pago_fija', e.target.value)}
              placeholder="Ej: 15"
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        {/* TDC: fecha de corte adicional */}
        {tipoSeleccionado === 'tarjeta_credito' && (
          <Campo label="Dia de corte (1-31)">
            <input
              type="number"
              min="1"
              max="31"
              value={form.fecha_corte}
              onChange={(e) => update('fecha_corte', e.target.value)}
              placeholder="Ej: 28"
              className="w-full rounded-lg bg-surface p-3"
            />
          </Campo>
        )}

        {/* Elektra: dia de semana + plazo en semanas */}
        {institucionSeleccionada === 'Elektra' && (
          <>
            <Campo label="Dia de pago semanal">
              <select
                value={form.dia_semana_pago}
                onChange={(e) => update('dia_semana_pago', e.target.value)}
                className="w-full rounded-lg bg-surface p-3"
              >
                <option value="">Selecciona...</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Plazo total (semanas)">
              <input
                type="number"
                value={form.plazo_total}
                onChange={(e) => update('plazo_total', e.target.value)}
                placeholder="Ej: 100"
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
          </>
        )}

        {/* Coopel: dia(s) del mes + plazo en meses */}
        {institucionSeleccionada === 'Coopel' && (
          <>
            <Campo label="Dia(s) de pago en el mes">
              <input
                type="text"
                value={form.dia_quincena_pago}
                onChange={(e) => update('dia_quincena_pago', e.target.value)}
                placeholder="Ej: 5  o  5, 20 (separados por coma)"
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
            <Campo label="Plazo total (meses)">
              <input
                type="number"
                value={form.plazo_total}
                onChange={(e) => update('plazo_total', e.target.value)}
                placeholder="Ej: 12"
                className="w-full rounded-lg bg-surface p-3"
              />
            </Campo>
          </>
        )}

        {/* Nomina: quincenas */}
        {tipoSeleccionado === 'nomina' && (
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

        {/* Personas: promesa de pago */}
        {tipoSeleccionado === 'personas' && (
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
          {guardando ? 'Guardando...' : 'Guardar deuda'}
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
