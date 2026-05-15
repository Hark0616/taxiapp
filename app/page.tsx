'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PIN_CONDUCTOR = process.env.NEXT_PUBLIC_PIN_CONDUCTOR || '1234'
const PIN_DUENO = process.env.NEXT_PUBLIC_PIN_DUENO || '0000'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  function presionar(val: string) {
    if (val === '⌫') {
      setPin(p => p.slice(0, -1))
      setError(false)
      return
    }
    const nuevo = pin + val
    if (nuevo.length > 4) return
    setPin(nuevo)
    if (nuevo.length === 4) {
      setTimeout(() => {
        if (nuevo === PIN_CONDUCTOR) {
          sessionStorage.setItem('rol', 'conductor')
          router.push('/app')
        } else if (nuevo === PIN_DUENO) {
          sessionStorage.setItem('rol', 'dueno')
          router.push('/app')
        } else {
          setError(true)
          setPin('')
        }
      }, 120)
    }
  }

  const teclas = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 bg-white">
      <div className="mb-10 text-center">
        <div className="text-5xl mb-3">🚕</div>
        <h1 className="text-2xl font-semibold text-gray-900">TaxiPago</h1>
        <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN</p>
      </div>

      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
            pin.length > i
              ? error ? 'bg-red-400 border-red-400' : 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300'
          }`} />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4 -mt-4">PIN incorrecto</p>}

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {teclas.map((t, i) => (
          t === '' ? <div key={i} /> :
          <button
            key={i}
            onClick={() => presionar(t)}
            className={`h-16 rounded-2xl text-xl font-semibold active:scale-90 transition-transform ${
              t === '⌫'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
