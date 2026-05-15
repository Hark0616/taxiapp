'use client'
import { useState, useRef } from 'react'
import { supabase, Registro, DIARIO, fmt, fmtFecha, hoyStr, getEstado } from '@/lib/supabase'

type Medio = 'nequi' | 'efectivo' | 'banco'

interface Props {
  registros: Registro[]
  onRefresh: () => void
}

export default function PagarView({ registros, onRefresh }: Props) {
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState<Medio>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ultimo_medio') as Medio) || 'nequi'
    }
    return 'nequi'
  })
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [exito, setExito] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hoy = hoyStr()
  const regHoy = registros.find(r => r.fecha === hoy)
  const deudaDias = registros
    .filter(r => r.tipo !== 'descanso' && r.estado !== 'espera')
    .map(r => ({ ...r, debe: Math.max(0, DIARIO - (r.monto || 0)) }))
    .filter(r => r.debe > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const totalDeuda = deudaDias.reduce((s, r) => s + r.debe, 0)

  const montoNum = parseInt(monto.replace(/\D/g, '')) || 0
  let resto = montoNum
  type DiaConPaga = (typeof deudaDias)[0] & { paga: number }
  const cobertura: DiaConPaga[] = deudaDias.map(d => {
    if (resto <= 0) return { ...d, paga: 0 }
    const paga = Math.min(resto, d.debe)
    resto -= paga
    return { ...d, paga }
  })
  const completos = cobertura.filter(d => d.paga >= d.debe && d.debe > 0).length
  const parciales = cobertura.filter(d => d.paga > 0 && d.paga < d.debe).length
  const adelanto = resto

  function selFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFoto(f)
    setFotoPreview(URL.createObjectURL(f))
  }

  async function enviar() {
    if (!montoNum) return
    setEnviando(true)
    try {
      let foto_url = null
      if (foto) {
        const ext = foto.name.split('.').pop()
        const path = `comprobantes/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('fotos').upload(path, foto)
        if (!error) {
          const { data } = supabase.storage.from('fotos').getPublicUrl(path)
          foto_url = data.publicUrl
        }
      }

      if (!regHoy) {
        await supabase.from('registros').insert({
          fecha: hoy, tipo: 'normal', monto: Math.min(montoNum, DIARIO),
          medio, estado: 'espera', foto_url
        })
      } else {
        await supabase.from('registros').update({
          monto: (regHoy.monto || 0) + Math.min(montoNum, DIARIO - (regHoy.monto || 0)),
          medio, estado: 'espera', foto_url
        }).eq('fecha', hoy)
      }

      let r2 = montoNum
      for (const d of deudaDias) {
        if (r2 <= 0) break
        const paga = Math.min(r2, d.debe)
        r2 -= paga
        if (paga > 0) {
          await supabase.from('registros').update({
            monto: (d.monto || 0) + paga,
            estado: (d.monto || 0) + paga >= DIARIO ? 'espera' : d.estado
          }).eq('id', d.id)
        }
      }

      await fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: montoNum, medio, dias_cubiertos: completos, dias_parciales: parciales })
      })

      setMonto(''); setFoto(null); setFotoPreview(null); setConfirmando(false); setExito(true)
      localStorage.setItem('ultimo_medio', medio)
      onRefresh()
      setTimeout(() => setExito(false), 3000)
    } finally {
      setEnviando(false)
    }
  }



  const medios: { id: Medio; icon: string; label: string }[] = [
    { id: 'nequi', icon: '📱', label: 'Nequi' },
    { id: 'efectivo', icon: '💵', label: 'Efectivo' },
    { id: 'banco', icon: '🏦', label: 'Banco' },
  ]

  if (exito) return (
    <div className="flex flex-col items-center justify-center min-h-96 px-6 text-center">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Pago enviado</h2>
      <p className="text-gray-500">Esperando confirmación del dueño</p>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-4">
      {totalDeuda > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <div className="text-2xl font-semibold text-amber-900">{fmt(totalDeuda)}</div>
          <div className="text-sm text-amber-700 mt-0.5">{deudaDias.length} día{deudaDias.length !== 1 ? 's' : ''} pendiente{deudaDias.length !== 1 ? 's' : ''}</div>
        </div>
      )}
      {regHoy?.estado === 'espera' && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 text-center">
          <p className="text-blue-800 font-medium">⏳ Pago de hoy en espera de confirmación</p>
        </div>
      )}
      {regHoy?.estado === 'pagado' && (
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center">
          <p className="text-emerald-800 font-medium">✅ Hoy ya está pagado y confirmado</p>
        </div>
      )}

      {totalDeuda > 0 && regHoy?.estado !== 'espera' && (
        <button 
          onClick={() => setMonto(String(Math.min(DIARIO, totalDeuda)))}
          className="w-full py-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 
                     text-emerald-800 font-semibold text-lg active:scale-95 transition-transform"
        >
          ⚡ Pagar {fmt(Math.min(DIARIO, totalDeuda))}
        </button>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">¿Cuánto entrega?</label>
        <input
          className="input-field text-2xl font-semibold"
          type="number"
          inputMode="numeric"
          placeholder="75.000"
          value={monto}
          onChange={e => setMonto(e.target.value)}
        />
      </div>

      {montoNum > 0 && deudaDias.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
          {completos > 0 && <span className="text-emerald-700 font-medium">{completos} día{completos !== 1 ? 's' : ''} completo{completos !== 1 ? 's' : ''} </span>}
          {parciales > 0 && <span className="text-blue-700 font-medium">{parciales} día a medias </span>}
          {adelanto > 0 && <span className="text-gray-500">+ {fmt(adelanto)} adelanto</span>}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">¿Cómo paga?</label>
        <div className="grid grid-cols-3 gap-2">
          {medios.map(m => (
            <button
              key={m.id}
              onClick={() => setMedio(m.id)}
              className={`py-3 rounded-xl flex flex-col items-center gap-1 text-sm font-medium border transition-all ${
                medio === m.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Comprobante (opcional)</label>
        {fotoPreview ? (
          <div className="relative">
            <img src={fotoPreview} className="w-full h-36 object-cover rounded-xl" alt="comprobante" />
            <button onClick={() => { setFoto(null); setFotoPreview(null) }}
              className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-600 border border-gray-200">✕</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-400 text-sm">
            📷 Adjuntar foto del pago
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={selFoto} />
      </div>

      {confirmando ? (
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3 mt-4">
          <h3 className="font-semibold text-gray-900 text-center text-lg">Confirmar pago</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Monto</span>
              <span className="font-semibold text-gray-900">{fmt(montoNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Medio</span>
              <span className="font-semibold text-gray-900 capitalize">{medio}</span>
            </div>
            {completos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cubre</span>
                <span className="font-semibold text-emerald-700">{completos} día{completos !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => setConfirmando(false)} className="btn-secondary">← Volver</button>
            <button onClick={enviar} disabled={enviando} className="btn-primary">
              {enviando ? 'Enviando...' : '✓ Confirmar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmando(true)} disabled={!montoNum} className="btn-primary disabled:opacity-40">
          📤 Enviar pago al dueño
        </button>
      )}

    </div>
  )
}
