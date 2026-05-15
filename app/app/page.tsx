'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarioView from '@/components/CalendarioView'
import PagarView from '@/components/PagarView'
import ConfirmarView from '@/components/ConfirmarView'
import ResumenView from '@/components/ResumenView'
import { supabase, Registro } from '@/lib/supabase'

export default function AppPage() {
  const router = useRouter()
  const [rol, setRol] = useState<'conductor'|'dueno'|null>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<Registro[]>([])
  const [pendientes, setPendientes] = useState(0)

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
    const { data } = await supabase
      .from('registros')
      .select('*')
      .order('fecha', { ascending: false })
    if (data) {
      setRegistros(data)
      setPendientes(data.filter((r: Registro) => r.estado === 'espera').length)
    }
  }

  function salir() {
    sessionStorage.clear()
    router.push('/')
  }

  if (!rol) return null

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
        <button onClick={salir} className="text-sm text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-100">
          Salir
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'pagar' && <PagarView registros={registros} onRefresh={cargar} />}
        {tab === 'confirmar' && <ConfirmarView registros={registros} onRefresh={cargar} />}
        {tab === 'calendario' && <CalendarioView registros={registros} rol={rol} />}
        {tab === 'resumen' && <ResumenView registros={registros} />}
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
