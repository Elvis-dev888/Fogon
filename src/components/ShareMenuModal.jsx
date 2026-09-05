import { useState } from 'react'
import { Modal, Btn } from './ui'
import { useLanguage } from '../lib/i18n.jsx'

export function ShareMenuModal({ negocio, onClose, notify }) {
  const { t } = useLanguage()
  const [copiado, setCopiado] = useState(false)
  const urlMenu = `https://administraciondenegocios.netlify.app/?negocio=${negocio.id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=15&format=png&data=${encodeURIComponent(urlMenu)}`

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlMenu)
      setCopiado(true)
      if (notify) notify(t.digitalMenu?.linkCopied || '¡Enlace de menú copiado al portapapeles!')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Fallback
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  function compartirWhatsApp() {
    const texto = `¡Hola! 👋 Mira nuestro menú y realiza tus pedidos en línea aquí:\n${urlMenu}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(waUrl, '_blank')
  }

  function imprimirQR() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${(t.digitalMenu?.qrPrintTitle || 'Código QR — {business}').replace('{business}', negocio.nombre)}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 40px 20px;
            background: #fff;
            color: #111;
          }
          .card {
            max-width: 420px;
            margin: 0 auto;
            border: 2px dashed #333;
            border-radius: 16px;
            padding: 30px 20px;
          }
          h1 {
            font-size: 26px;
            margin: 10px 0 4px;
            color: #111;
          }
          p.slogan {
            font-size: 14px;
            color: #555;
            margin: 0 0 20px;
          }
          img.qr {
            width: 260px;
            height: 260px;
            margin: 0 auto;
            display: block;
            border-radius: 8px;
          }
          .cta {
            margin-top: 20px;
            font-size: 16px;
            font-weight: bold;
            color: #b8860b;
          }
          .subtext {
            font-size: 12px;
            color: #777;
            margin-top: 6px;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${negocio.emoji ? negocio.emoji + ' ' : ''}${negocio.nombre}</h1>
          ${negocio.slogan ? `<p class="slogan">${negocio.slogan}</p>` : ''}
          <img class="qr" src="${qrCodeUrl}" alt="QR Menu" />
          <div class="cta">${t.digitalMenu?.scanToOrder || '📱 Escanea con tu celular para ver el menú y ordenar'}</div>
          <div class="subtext">${urlMenu}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4 text-left max-h-[85vh] overflow-y-auto pr-1">
        <div className="border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{negocio.emoji || '🍴'}</span>
            <div>
              <h3 className="font-serif text-xl font-semibold text-cream">
                {t.digitalMenu?.shareTitle || 'Menú Digital & Código QR'}
              </h3>
              <p className="text-xs text-creamsoft">
                {(t.digitalMenu?.shareSubtitle || '{business} · Tu enlace web público para clientes').replace('{business}', negocio.nombre)}
              </p>
            </div>
          </div>
        </div>

        {/* Enlace directo */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-creamsoft mb-1.5">
            {t.digitalMenu?.webLinkLabel || 'Enlace web de tu menú:'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={urlMenu}
              className="flex-1 bg-paper border border-line rounded px-3 py-2 text-xs font-mono text-gold select-all focus:outline-none"
            />
            <Btn size="sm" variant={copiado ? 'avocado' : 'primary'} onClick={copiarLink}>
              {copiado ? (t.digitalMenu?.copied || '✓ ¡Copiado!') : (t.digitalMenu?.copy || '📋 Copiar')}
            </Btn>
          </div>
        </div>

        {/* Visualización del Código QR */}
        <div className="bg-paper2 border border-line rounded-lg p-4 text-center">
          <div className="inline-block p-3 bg-white rounded-lg shadow-md mb-2">
            <img
              src={qrCodeUrl}
              alt={`QR ${negocio.nombre}`}
              className="w-44 h-44 object-contain mx-auto block"
              loading="lazy"
            />
          </div>
          <p className="text-xs text-cream font-medium">
            {t.digitalMenu?.scanHint || '📱 Tus clientes escanean este código y tu menú abre directamente en su navegador.'}
          </p>
          <p className="text-[11px] text-creamsoft mt-0.5">
            {t.digitalMenu?.printHint || 'Ideal para imprimir y poner en mesas, mostrador, volantes o cartas.'}
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <Btn
            variant="avocado"
            className="justify-center text-xs py-2.5"
            onClick={compartirWhatsApp}
          >
            📲 WhatsApp
          </Btn>
          <Btn
            variant="mustard"
            className="justify-center text-xs py-2.5"
            onClick={imprimirQR}
          >
            {t.digitalMenu?.printQR || '🖨️ Imprimir QR'}
          </Btn>
          <a
            href={urlMenu}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-3 py-2.5 rounded text-xs font-semibold border border-line bg-paper2 hover:bg-paper text-cream text-center"
          >
            {t.digitalMenu?.viewWebMenu || '👁️ Ver Menú Web'}
          </a>
        </div>

        <div className="flex justify-end pt-3 border-t border-line">
          <Btn variant="ghost" onClick={onClose}>
            {t.orderShared?.back || 'Cerrar'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

