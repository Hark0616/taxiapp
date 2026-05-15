import './globals.css'

export const metadata = {
  title: 'TaxiPago',
  description: 'Seguimiento de pagos del taxi',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'TaxiPago' },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚕</text></svg>'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="bg-gray-50 min-h-screen flex items-start justify-center">
        <div className="w-full max-w-md min-h-screen bg-white">
          {children}
        </div>
      </body>
    </html>
  )
}
