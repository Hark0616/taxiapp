'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarioView from '@/components/CalendarioView'
import PagarView from '@/components/PagarView'
import ConfirmarView from '@/components/ConfirmarView'
import ResumenView from '@/components/ResumenView'
import SetupView from '@/components/SetupView'
import { supabase, Registro, Config } from '@/lib/supabase'

export default function AppPage() {
  const router = useRouter()
  const [rol, setRol] = useState<'conductor'|'dueno'|null>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [pendientes, setPendientes] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [necesitaSetup, setNecesitaSetup] = useState(false)

  useEffect(() => {
    const r = sessionStorage.getItem('rol') as 'conductor'|'dueno'|null
    if (!r) { router.push('/'); return }
    setRol(r)
    setTab(r === 'conductor' ? 'pagar' : 'confirmar')
    cargar()
    const channel = supabase
      .channel('registros')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function cargar() {
    setCargando(true)
    const [regRes, cfgRes] = await Promise.all([
      supabase.from('registros').select('*').order('fecha', { ascending: false }),
      supabase.from('config').select('*').eq('id', 'default').single()
    ])
    if (regRes.data) {
      setRegistros(regRes.data)
      setPendientes(regRes.data.filter((r: Registro) => r.estado === 'espera').length)
    }
    if (cfgRes.data) {
      setConfig(cfgRes.data)
      setNecesitaSetup(false)
    } else {
      setNecesitaSetup(true)
    }
    setCargando(false)
  }

  function salir() {
    sessionStorage.clear()
    router.push('/')
  }

  if (!rol) return null

  // Si no hay config, solo el dueño puede configurar
  if (necesitaSetup && !cargando) {
    if (rol === 'dueno') {
      return <SetupView onConfigured={cargar} />
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">App no configurada</h2>
        <p className="text-gray-500">El dueño debe configurar la app primero</p>
        <button onClick={salir} className="btn-secondary mt-6">← Volver</button>
      </div>
    )
  }

  const tabsConductor = [
    { id: 'pagar', icon: '💸', label: 'Pagar' },
    { id: 'calendario', icon: '📅', label: 'Calendario' },
  ]
  const tabsDueno = [
    { id: 'confirmar', icon: '✅', label: 'Confirmar' },
    { id: 'calendario', icon: '📅', label: 'Calendario' },
    { id: 'resumen', icon: '📊', label: 'Resumen' },
  ]
  const tabs = rol === 'conductor' ? tabsConductor : tabsDueno

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-lg font-semibold text-gray-900">
          {rol === 'conductor' ? '🚗 Conductor' : '🚕 Dueño'}
        </span>
        <div className="flex items-center gap-2">
          {rol === 'dueno' && (
            <button onClick={() => setTab('config')} className="text-sm text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100">
              ⚙️
            </button>
          )}
          <button onClick={salir} className="text-sm text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-100">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 relative">
        {cargando && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 overflow-hidden z-10">
            <div className="h-full bg-emerald-500 w-1/3" style={{ animationDuration: '1.5s', animationName: 'progress', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }} />
          </div>
        )}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}} />
        {tab === 'pagar' && config && <PagarView registros={registros} config={config} onRefresh={cargar} cargando={cargando} />}
        {tab === 'confirmar' && config && <ConfirmarView registros={registros} config={config} onRefresh={cargar} />}
        {tab === 'calendario' && config && <CalendarioView registros={registros} config={config} rol={rol} onRefresh={cargar} />}
        {tab === 'resumen' && config && <ResumenView registros={registros} config={config} />}
        {tab === 'config' && config && (
          <SetupView onConfigured={() => { cargar(); setTab('confirmar') }} initialConfig={config} />
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors relative ${
              tab === t.id ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'confirmar' && pendientes > 0 && (
              <span className="absolute top-2 right-1/4 bg-amber-400 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
