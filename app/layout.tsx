import './globals.css'

export const metadata = {
  title: 'TaxiPago',
  description: 'Seguimiento de pagos del taxi',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'TaxiPago' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen flex items-start justify-center">
        <div className="w-full max-w-md min-h-screen bg-white">
          {children}
        </div>
      </body>
    </html>
  )
}
