import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type EstadoPago = 'espera' | 'pagado' | 'rechazado'
export type TipoDia = 'normal' | 'descanso'
export type MedioPago = 'nequi' | 'efectivo' | 'banco'

export interface Registro {
  id: string
  fecha: string
  tipo: TipoDia
  monto: number
  medio: MedioPago | null
  estado: EstadoPago | null
  foto_url: string | null
  nota: string | null
  created_at: string
}

export interface Config {
  id: string
  fecha_inicio: string  // 'YYYY-MM-DD'
  cuota_diaria: number
  created_at: string
}

export interface DiaDeuda {
  fecha: string
  registro: Registro | null
  estado: 'pagado' | 'espera' | 'pendiente' | 'rechazado' | 'descanso'
  debe: number
  monto: number
}

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

export function fmtFecha(s: string) {
  const [, m, d] = s.split('-')
  return `${d} ${MESES_CORTO[parseInt(m) - 1]}`
}

export function hoyStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function siguienteDia(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0')
}

export function getEstado(r: Registro): string {
  if (r.tipo === 'descanso') return 'descanso'
  if (r.estado) return r.estado
  return (r.monto || 0) >= 75000 ? 'pagado' : 'pendiente'
}

/**
 * Fuente de verdad única para calcular la deuda del taxi.
 * Genera la lista completa de días laborables desde fecha_inicio hasta hoy,
 * cada uno con su estado real y su deuda pendiente.
 */
export function calcularDeuda(registros: Registro[], config: Config): DiaDeuda[] {
  const hoy = hoyStr()
  const dias: DiaDeuda[] = []
  let cursor = config.fecha_inicio

  while (cursor <= hoy) {
    const reg = registros.find(r => r.fecha === cursor) || null
    let estado: DiaDeuda['estado']
    let debe: number
    let monto: number

    if (reg) {
      if (reg.tipo === 'descanso') {
        estado = 'descanso'
        debe = 0
        monto = 0
      } else if (reg.estado === 'pagado') {
        estado = 'pagado'
        monto = reg.monto || 0
        debe = Math.max(0, config.cuota_diaria - monto)
      } else if (reg.estado === 'espera') {
        estado = 'espera'
        monto = reg.monto || 0
        debe = 0  // está en proceso, no se cobra doble
      } else if (reg.estado === 'rechazado') {
        estado = 'rechazado'
        monto = 0  // rechazado = no pagó
        debe = config.cuota_diaria
      } else {
        // registro sin estado explícito (parcial o pendiente)
        monto = reg.monto || 0
        estado = monto >= config.cuota_diaria ? 'pagado' : 'pendiente'
        debe = Math.max(0, config.cuota_diaria - monto)
      }
    } else {
      // No hay registro → día pendiente implícito
      estado = 'pendiente'
      debe = config.cuota_diaria
      monto = 0
    }

    dias.push({ fecha: cursor, registro: reg, estado, debe, monto })
    cursor = siguienteDia(cursor)
  }

  return dias
}
