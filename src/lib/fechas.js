import { addMonths, addWeeks, setDate, isBefore, startOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Calcula la próxima fecha de pago de una deuda según su configuración.
 * @param {object} deuda - registro de la tabla deudas
 * @param {Date} hoy - fecha de referencia (default: ahora)
 */
export function proximaFechaPago(deuda, hoy = new Date()) {
  const ref = startOfDay(hoy)

  // Pago mensual fijo (apps, mercado libre, tarjetas)
  if (deuda.fecha_pago_fija) {
    let fecha = setDate(ref, deuda.fecha_pago_fija)
    if (isBefore(fecha, ref)) fecha = setDate(addMonths(ref, 1), deuda.fecha_pago_fija)
    return fecha
  }

  // Pago semanal fijo (Elektra)
  if (deuda.dia_semana_pago !== null && deuda.dia_semana_pago !== undefined) {
    const diaActual = ref.getDay()
    let diff = deuda.dia_semana_pago - diaActual
    if (diff < 0) diff += 7
    if (diff === 0) diff = 7 // si hoy es el día, próxima ocurrencia es en 7 días
    return addWeeks(ref, 0).setDate(ref.getDate() + diff) && new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff)
  }

  // Pago por quincena / días específicos del mes (Coopel, nómina)
  if (deuda.dia_quincena_pago) {
    const dias = JSON.parse(deuda.dia_quincena_pago).sort((a, b) => a - b)
    const diaActual = ref.getDate()

    const proximoEsteMes = dias.find((d) => d >= diaActual)
    if (proximoEsteMes) return setDate(ref, proximoEsteMes)

    return setDate(addMonths(ref, 1), dias[0])
  }

  // Promesa de pago (personas)
  if (deuda.promesa_pago) {
    return new Date(deuda.promesa_pago)
  }

  return null
}

export function formatFecha(fecha) {
  if (!fecha) return 'Sin fecha'
  return format(fecha, "d 'de' MMMM", { locale: es })
}

export function nombreDiaSemana(num) {
  return DIAS_SEMANA[num] ?? ''
}

/**
 * Para Elektra/Coopel con plazo pactado: "Semana 13/100" o "Mes 5/12"
 */
export function textoPlazo(deuda) {
  if (!deuda.plazo_total) return null
  const unidad = deuda.dia_semana_pago !== null && deuda.dia_semana_pago !== undefined ? 'Semana' : 'Mes'
  return `${unidad} ${deuda.plazo_pagado}/${deuda.plazo_total}`
}
