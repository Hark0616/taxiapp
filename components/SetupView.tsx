'use client'
import { useState } from 'react'
import { supabase, Config, fmt, hoyStr } from '@/lib/supabase'

interface Props {
  onConfigured: () => void
  initialConfig?: Config
}

export default function SetupView({ onConfigured, initialConfig }: Props) {
  const [fechaInicio, setFechaInicio] = useState(initialConfig?.fecha_inicio || hoyStr())
  const [cuota, setCuota] = useState(String(initialConfig?.cuota_diaria || 75000))
  const [whatsappPhone, setWhatsappPhone] = useState(initialConfig?.whatsapp_phone || '')
  const [callmebotApikey, setCallmebotApikey] = useState(initialConfig?.callmebot_apikey || '')
  const [guardando, setGuardando] = useState(false)

  const cuotaNum = parseInt(cuota.replace(/\D/g, '')) || 0
  const esEdicion = !!initialConfig

  async function guardar() {
    if (!fechaInicio || !cuotaNum) return
    setGuardando(true)
    try {
      await supabase.from('config').upsert({
        id: 'default',
        fecha_inicio: fechaInicio,
        cuota_diaria: cuotaNum,
        whatsapp_phone: whatsappPhone.trim() || null,
        callmebot_apikey: callmebotApikey.trim() || null
      })
      onConfigured()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={`flex flex-col items-center ${esEdicion ? 'pt-6' : 'justify-center min-h-screen'} px-6 bg-white`}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">{esEdicion ? '⚙️' : '🚕'}</div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {esEdicion ? 'Configuración' : 'Configurar TaxiPago'}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {esEdicion ? 'Modifica los datos del taxi' : 'Configura los datos iniciales del taxi'}
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            ¿Desde cuándo trabaja el conductor?
          </label>
          <input
            type="date"
            value={fechaInicio}
            max={hoyStr()}
            onChange={e => setFechaInicio(e.target.value)}
            className="input-field"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            💡 Si ya tiene deuda, pon la fecha desde el primer día sin pagar
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Cuota diaria
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={cuota}
            onChange={e => setCuota(e.target.value)}
            className="input-field text-xl font-semibold"
          />
          {cuotaNum > 0 && (
            <p className="text-xs text-gray-400 mt-1.5">
              {fmt(cuotaNum)} por día de trabajo
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Notificaciones por WhatsApp (Opcional)</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Número del dueño (con código de país, ej. +57...)
              </label>
              <input
                type="text"
                value={whatsappPhone}
                placeholder="+573001234567"
                onChange={e => setWhatsappPhone(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                CallMeBot API Key
              </label>
              <input
                type="text"
                value={callmebotApikey}
                placeholder="1234567"
                onChange={e => setCallmebotApikey(e.target.value)}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                💡 Obtén tu API Key enviando un mensaje al bot de CallMeBot en WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={guardar}
          disabled={!fechaInicio || !cuotaNum || guardando}
          className="btn-primary w-full disabled:opacity-40"
        >
          {guardando ? 'Guardando...' : esEdicion ? '💾 Guardar cambios' : '✓ Comenzar'}
        </button>
      </div>
    </div>
  )
}
