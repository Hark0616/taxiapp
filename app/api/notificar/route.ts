import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function getWhatsAppConfig() {
  const envPhone = process.env.WHATSAPP_PHONE?.trim()
  const envApiKey = process.env.CALLMEBOT_APIKEY?.trim()
  if (envPhone && envApiKey) return { phone: envPhone, apikey: envApiKey, source: 'env' as const }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return { phone: '', apikey: '', source: 'missing' as const }
  }

  const sb = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await sb
    .from('config')
    .select('whatsapp_phone, callmebot_apikey')
    .eq('id', 'default')
    .single()

  if (error) {
    return { phone: '', apikey: '', source: 'supabase_error' as const, error: error.message }
  }

  const phone = (data?.whatsapp_phone || '').trim()
  const apikey = (data?.callmebot_apikey || '').trim()
  return { phone, apikey, source: 'supabase' as const }
}

export async function POST(req: NextRequest) {
  try {
    const { monto, medio, dias_cubiertos, dias_parciales } = await req.json()

    const cfg = await getWhatsAppConfig()
    const phone = cfg.phone
    const apikey = cfg.apikey

    if (!phone || !apikey) {
      const detalle = cfg.source === 'supabase_error'
        ? `; error Supabase: ${cfg.error}`
        : ''
      return NextResponse.json(
        { ok: false, error: `WhatsApp no configurado (env o config.whatsapp_phone/config.callmebot_apikey)${detalle}` },
        { status: 500 }
      )
    }

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')
    let texto = `🚕 *Pago recibido*\n`
    texto += `Monto: *${fmt(monto)}* por ${medio}\n`
    if (dias_cubiertos > 0) texto += `Cubre ${dias_cubiertos} día${dias_cubiertos !== 1 ? 's' : ''} completo${dias_cubiertos !== 1 ? 's' : ''}`
    if (dias_parciales > 0) texto += ` y 1 día a medias`
    texto += `\n\n✅ Confirma en la app`

    const params = new URLSearchParams({
      phone: phone,
      text: texto,
      apikey: apikey
    })
    
    const url = `https://api.callmebot.com/whatsapp.php?${params.toString()}`
    const apiRes = await fetch(url)
    
    if (!apiRes.ok) {
      const errorText = await apiRes.text()
      return NextResponse.json({ ok: false, error: `Error de CallMeBot: ${errorText}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
