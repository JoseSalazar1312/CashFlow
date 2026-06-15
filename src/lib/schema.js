import { Schema, Table, column } from '@powersync/web'

// Este esquema define las tablas en el SQLite local del dispositivo.
// Debe reflejar (un subconjunto de) las columnas de Supabase.
// PowerSync sincroniza automáticamente según las sync rules.

const tipos_deuda = new Table({
  nombre: column.text
})

const instituciones = new Table({
  nombre: column.text,
  frecuencia_pago: column.text
})

const deudas = new Table(
  {
    user_id: column.text,
    tipo_deuda_id: column.integer,
    institucion_id: column.integer,
    nombre: column.text,

    total_a_pagar: column.real,
    estatus: column.text,

    fecha_pago_fija: column.integer,
    dia_semana_pago: column.integer,
    dia_quincena_pago: column.text, // JSON string, ej: "[1,15]"
    fecha_corte: column.integer,
    promesa_pago: column.text, // ISO date string

    plazo_total: column.integer,
    plazo_pagado: column.integer,

    fecha_creacion: column.text,
    fecha_finalizacion: column.text,
    notas: column.text
  },
  { indexes: { tipo: ['tipo_deuda_id'], estatus: ['estatus'] } }
)

const historico_pagos = new Table(
  {
    user_id: column.text,
    deuda_id: column.text,
    monto: column.real,
    fecha_pago: column.text,
    tipo_pago: column.text,
    notas: column.text
  },
  { indexes: { deuda: ['deuda_id'], fecha: ['fecha_pago'] } }
)

export const AppSchema = new Schema({
  tipos_deuda,
  instituciones,
  deudas,
  historico_pagos
})
