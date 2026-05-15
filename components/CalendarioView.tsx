'use client'
import { useState } from 'react'
import { Registro, Config, DiaDeuda, calcularDeuda, fmt, fmtFecha, hoyStr, MESES, supabase } from '@/lib/supabase'

interface Props {
  registros: Registro[]
  config: Config
  rol: 'conductor' | 'dueno'
  onRefresh: () => void
}

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const COLORES: Record<string, string> = {
  pagado:    'bg-emerald-100 text-emerald-800',
  espera:    'bg-blue-100 text-blue-800',
  pendiente: 'bg-amber-100 text-amber-800',
  rechazado: 'bg-red-100 text-red-800',
  descanso:  'bg-gray-100 text-gray-400',
  futuro:    'text-gray-300',
  inactivo:  'text-gray-200',
}

const DETALLE_COLORS: Record<string, string> = {
  pagado:    'bg-emerald-50 border-emerald-200 text-emerald-900',
  espera:    'bg-blue-50 border-blue-200 text-blue-900',
  pendiente: 'bg-amber-50 border-amber-200 text-amber-900',
  rechazado: 'bg-red-50 border-red-200 text-red-900',
  descanso:  'bg-gray-50 border-gray-200 text-gray-700',
}

export default function CalendarioView({ registros, config, rol, onRefresh }: Props) {
  const hoy = hoyStr()
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Fuente de verdad centralizada
  const todosLosDias = calcularDeuda(registros, config)
  const diasMap = new Map(todosLosDias.map(d => [d.fecha, d]))

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function marcarDescanso(fecha: string) {
    const dia = diasMap.get(fecha)
    if (dia?.registro) {
      await supabase.from('registros').update({ 
        tipo: 'descanso', monto: 0, medio: null, estado: null 
      }).eq('id', dia.registro.id)
    } else {
      await supabase.from('registros').insert({ 
        fecha, tipo: 'descanso', monto: 0, medio: null, estado: null 
      })
    }
    mostrarToast(`✅ Descanso registrado para ${fmtFecha(fecha)}`)
    onRefresh()
  }

  async function quitarDescanso(fecha: string) {
    const dia = diasMap.get(fecha)
    if (!dia?.registro) return
    await supabase.from('registros').delete().eq('id', dia.registro.id)
    mostrarToast(`↩️ Día restaurado como normal`)
    onRefresh()
  }

  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const primerDOW = (() => { const d = new Date(anio, mes, 1).getDay(); return d === 0 ? 6 : d - 1 })()

  // Stats del mes usando calcularDeuda()
  const diasMes = todosLosDias.filter(d => {
    const [y, m] = d.fecha.split('-')
    return parseInt(y) === anio && parseInt(m) - 1 === mes
  })

  const stats = {
    pagados: diasMes.filter(d => d.estado === 'pagado').length,
    pendientes: diasMes.filter(d => d.estado === 'pendiente' || d.estado === 'rechazado').length,
    espera: diasMes.filter(d => d.estado === 'espera').length,
    recibido: diasMes.filter(d => d.estado === 'pagado').reduce((s, d) => s + d.monto, 0),
  }

  function cambiarMes(dir: number) {
    setSeleccionado(null)
    let nm = mes + dir, na = anio
    if (nm > 11) { nm = 0; na++ }
    if (nm < 0) { nm = 11; na-- }
    setMes(nm); setAnio(na)
  }

  function getDiaCls(fStr: string) {
    const esFuturo = fStr > hoy
    const esAnterior = fStr < config.fecha_inicio
    const esHoy = fStr === hoy
    const sel = seleccionado === fStr

    let estado: string
    if (esFuturo) estado = 'futuro'
    else if (esAnterior) estado = 'inactivo'
    else {
      const dia = diasMap.get(fStr)
      estado = dia ? dia.estado : 'pendiente'
    }

    const base = COLORES[estado] || ''
    const ring = (esHoy || sel) ? ' ring-2 ring-gray-800 ring-offset-1' : ''
    return base + ring
  }

  const diaSel = seleccionado ? diasMap.get(seleccionado) : null
  const estadoSel = seleccionado
    ? (seleccionado > hoy ? 'futuro' : seleccionado < config.fecha_inicio ? 'inactivo' : diaSel ? diaSel.estado : 'pendiente')
    : null

  const LABELS: Record<string, string> = {
    pagado: 'Pagado y confirmado',
    espera: 'En espera de confirmación',
    pendiente: 'Sin pago registrado',
    rechazado: 'Pago rechazado',
    descanso: 'Día de descanso',
    futuro: 'Día futuro',
    inactivo: 'Antes del inicio',
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg">‹</button>
        <span className="font-semibold text-gray-900">{MESES[mes]} {anio}</span>
        <button onClick={() => cambiarMes(1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-lg">›</button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primerDOW }).map((_, i) => <div key={`v${i}`} />)}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const d = i + 1
          const fStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          return (
            <button
              key={d}
              onClick={() => setSeleccionado(seleccionado === fStr ? null : fStr)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all ${getDiaCls(fStr)}`}
            >
              {d}
            </button>
          )
        })}
      </div>

      {seleccionado && estadoSel && estadoSel !== 'inactivo' && (
        <div className={`rounded-2xl p-4 border ${DETALLE_COLORS[estadoSel] || 'bg-gray-50 border-gray-200'}`}>
          <div className="font-semibold mb-1">{fmtFecha(seleccionado)} · {LABELS[estadoSel]}</div>
          {diaSel && diaSel.estado !== 'descanso' && (
            <div className="text-sm space-y-0.5 mt-2">
              {diaSel.monto > 0 && <div>Pagado: <span className="font-medium">{fmt(diaSel.monto)}</span></div>}
              {diaSel.debe > 0 && (
                <div>Pendiente: <span className="font-medium">{fmt(diaSel.debe)}</span></div>
              )}
              {diaSel.registro?.medio && <div>Medio: <span className="font-medium capitalize">{diaSel.registro.medio}</span></div>}
              {diaSel.registro?.foto_url && rol === 'dueno' && (
                <a href={diaSel.registro.foto_url} target="_blank" rel="noopener noreferrer"
                  className="block mt-2 text-blue-600 text-sm underline">Ver comprobante</a>
              )}
            </div>
          )}
          {estadoSel === 'pendiente' && !diaSel?.registro && (
            <div className="text-sm mt-1">Debe: <span className="font-medium">{fmt(config.cuota_diaria)}</span></div>
          )}
          {rol === 'conductor' && seleccionado && seleccionado <= hoy && (
            <div className="mt-3">
              {(estadoSel === 'pendiente' || estadoSel === 'rechazado') && (
                <button onClick={() => marcarDescanso(seleccionado)} className="btn-secondary text-sm py-2">
                  🌙 Marcar como descanso
                </button>
              )}
              {estadoSel === 'descanso' && (
                <button onClick={() => quitarDescanso(seleccionado)} className="btn-secondary text-sm py-2">
                  ↩️ Cambiar a día normal
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {seleccionado && estadoSel === 'inactivo' && (
        <div className="rounded-2xl p-4 border bg-gray-50 border-gray-200 text-gray-400 text-sm text-center">
          Este día es anterior al inicio de seguimiento ({fmtFecha(config.fecha_inicio)})
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 rounded-xl p-3">
          <div className="text-xs text-emerald-700">Recibido</div>
          <div className="text-lg font-semibold text-emerald-900">{fmt(stats.recibido)}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="text-xs text-amber-700">Días pendientes</div>
          <div className="text-lg font-semibold text-amber-900">{stats.pendientes}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="text-xs text-gray-500">Días pagados</div>
          <div className="text-lg font-semibold text-gray-900">{stats.pagados}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="text-xs text-blue-700">En espera</div>
          <div className="text-lg font-semibold text-blue-900">{stats.espera}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {Object.entries(LABELS).filter(([k]) => k !== 'futuro' && k !== 'inactivo').map(([estado, label]) => (
          <div key={estado} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded ${COLORES[estado].split(' ')[0]}`} />
            {label}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white 
                        px-5 py-3 rounded-2xl text-sm font-medium shadow-lg z-50
                        animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
