'use client'
import { Registro, DIARIO, fmt, fmtFecha, getEstado } from '@/lib/supabase'

interface Props { registros: Registro[] }

export default function ResumenView({ registros }: Props) {
  const normales = registros.filter(r => r.tipo !== 'descanso')
  const pagados = normales.filter(r => getEstado(r) === 'pagado')
  const pendientes = normales.filter(r => getEstado(r) === 'pendiente' || getEstado(r) === 'rechazado')
  const enEspera = normales.filter(r => r.estado === 'espera')

  const totalRecibido = pagados.reduce((s, r) => s + (r.monto || 0), 0)
  const totalDeuda = pendientes.reduce((s, r) => s + Math.max(0, DIARIO - (r.monto || 0)), 0)
  const totalEspera = enEspera.reduce((s, r) => s + (r.monto || 0), 0)

  const medios = { nequi: 0, efectivo: 0, banco: 0 } as Record<string, number>
  pagados.forEach(r => { if (r.medio && medios[r.medio] !== undefined) medios[r.medio] += (r.monto || 0) })

  const diasConDeuda = pendientes
    .map(r => ({ ...r, debe: Math.max(0, DIARIO - (r.monto || 0)) }))
    .filter(r => r.debe > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const medioIcons: Record<string, string> = { nequi: '📱', efectivo: '💵', banco: '🏦' }

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4 col-span-2">
          <div className="text-xs text-emerald-700 font-medium">Total recibido</div>
          <div className="text-3xl font-semibold text-emerald-900 mt-1">{fmt(totalRecibido)}</div>
          <div className="text-xs text-emerald-600 mt-1">{pagados.length} días confirmados</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <div className="text-xs text-amber-700 font-medium">Deuda total</div>
          <div className="text-2xl font-semibold text-amber-900 mt-1">{fmt(totalDeuda)}</div>
          <div className="text-xs text-amber-600 mt-1">{diasConDeuda.length} días</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="text-xs text-blue-700 font-medium">En espera</div>
          <div className="text-2xl font-semibold text-blue-900 mt-1">{fmt(totalEspera)}</div>
          <div className="text-xs text-blue-600 mt-1">{enEspera.length} por confirmar</div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Por medio de pago</h3>
        <div className="space-y-3">
          {Object.entries(medios).map(([m, val]) => {
            const pct = totalRecibido > 0 ? (val / totalRecibido) * 100 : 0
            return (
              <div key={m}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{medioIcons[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</span>
                  <span className="font-medium text-gray-900">{fmt(val)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {diasConDeuda.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Días pendientes ({diasConDeuda.length})
          </h3>
          <div className="space-y-2">
            {diasConDeuda.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{fmtFecha(r.fecha)}</div>
                  {(r.monto || 0) > 0 && (
                    <div className="text-xs text-gray-400">Pagó parcial {fmt(r.monto || 0)}</div>
                  )}
                </div>
                <div className="text-sm font-semibold text-amber-700">{fmt(r.debe)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
            <span className="text-sm text-gray-500">Total deuda</span>
            <span className="font-semibold text-amber-800">{fmt(totalDeuda)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
