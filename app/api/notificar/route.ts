import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { monto, medio, dias_cubiertos, dias_parciales } = await req.json()

    const phone = process.env.WHATSAPP_PHONE as string
    const apikey = process.env.CALLMEBOT_APIKEY as string

    if (!phone || !apikey) {
      return NextResponse.json({ ok: false, error: 'WhatsApp no configurado' })
    }

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')
    let texto = `🚕 *Pago recibido*\n`
    texto += `Monto: *${fmt(monto)}* por ${medio}\n`
    if (dias_cubiertos > 0) texto += `Cubre ${dias_cubiertos} día${dias_cubiertos !== 1 ? 's' : ''} completo${dias_cubiertos !== 1 ? 's' : ''}`
    if (dias_parciales > 0) texto += ` y 1 día a medias`
    texto += `\n\n✅ Confirma en la app`

    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(texto)}&apikey=${apikey}`
    const apiRes = await fetch(url)
    
    if (!apiRes.ok) {
      const errorText = await apiRes.text()
      return NextResponse.json({ ok: false, error: `Error de CallMeBot: ${errorText}` })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
