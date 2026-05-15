import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

export const DIARIO = 75000
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

export function getEstado(r: Registro): string {
  if (r.tipo === 'descanso') return 'descanso'
  if (r.estado) return r.estado
  return (r.monto || 0) >= DIARIO ? 'pagado' : 'pendiente'
}
