'use client'
import { useState } from 'react'
import { supabase, Registro, Config, fmt, fmtFecha } from '@/lib/supabase'

interface Props {
  registros: Registro[]
  config: Config
  onRefresh: () => void
}

export default function ConfirmarView({ registros, config, onRefresh }: Props) {
  const [expandida, setExpandida] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)

  const enEspera = registros
    .filter(r => r.estado === 'espera')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const historial = registros
    .filter(r => r.estado === 'pagado' || r.estado === 'rechazado')
    .slice(0, 20)

  async function confirmar(r: Registro) {
    setProcesando(r.id)
    await supabase.from('registros').update({ estado: 'pagado' }).eq('id', r.id)
    onRefresh()
    setProcesando(null)
  }

  async function rechazar(r: Registro) {
    setProcesando(r.id)
    await supabase.from('registros').update({ estado: 'rechazado' }).eq('id', r.id)
    onRefresh()
    setProcesando(null)
  }

  const medio_icons: Record<string, string> = { nequi: '📱', efectivo: '💵', banco: '🏦' }

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Por confirmar {enEspera.length > 0 && <span className="ml-1 bg-amber-400 text-white text-xs px-2 py-0.5 rounded-full">{enEspera.length}</span>}
        </h2>
        {enEspera.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-sm">Todo confirmado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enEspera.map(r => (
              <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandida(expandida === r.id ? null : r.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{fmt(r.monto)}</div>
                      <div className="text-sm text-amber-700 mt-0.5">
                        {fmtFecha(r.fecha)} · {medio_icons[r.medio || ''] || ''} {r.medio}
                      </div>
                    </div>
                    <span className="text-gray-400 text-lg">{expandida === r.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expandida === r.id && (
                  <div className="px-4 pb-4 space-y-3">
                    {r.foto_url && (
                      <a href={r.foto_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.foto_url} alt="comprobante" className="w-full rounded-xl object-cover max-h-48" />
                        <p className="text-xs text-center text-blue-600 mt-1">Ver foto completa</p>
                      </a>
                    )}
                    <div className="bg-white rounded-xl p-3 text-sm text-gray-600">
                      <div className="flex justify-between"><span>Fecha</span><span className="font-medium text-gray-900">{fmtFecha(r.fecha)}</span></div>
                      <div className="flex justify-between mt-1"><span>Monto</span><span className="font-medium text-gray-900">{fmt(r.monto)}</span></div>
                      <div className="flex justify-between mt-1"><span>Medio</span><span className="font-medium text-gray-900">{medio_icons[r.medio || '']} {r.medio}</span></div>
                      {r.monto < config.cuota_diaria && (
                        <div className="flex justify-between mt-1 text-amber-700"><span>Queda pendiente</span><span className="font-medium">{fmt(config.cuota_diaria - r.monto)}</span></div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => rechazar(r)}
                        disabled={procesando === r.id}
                        className="py-3 rounded-xl bg-red-50 text-red-700 font-semibold border border-red-200 active:scale-95 transition-transform disabled:opacity-40"
                      >
                        ✕ Rechazar
                      </button>
                      <button
                        onClick={() => confirmar(r)}
                        disabled={procesando === r.id}
                        className="py-3 rounded-xl bg-emerald-600 text-white font-semibold active:scale-95 transition-transform disabled:opacity-40"
                      >
                        ✓ Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historial reciente</h2>
          <div className="space-y-2">
            {historial.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.estado === 'pagado' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{fmt(r.monto)} · {medio_icons[r.medio || '']} {r.medio}</div>
                  <div className="text-xs text-gray-400">{fmtFecha(r.fecha)}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {r.estado === 'pagado' ? 'Confirmado' : 'Rechazado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
