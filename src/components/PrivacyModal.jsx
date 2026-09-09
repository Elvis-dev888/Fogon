import { Modal, Btn } from './ui'
import { useLanguage, LANGUAGES } from '../lib/i18n.jsx'

export function PrivacyModal({ onClose }) {
  const { language, setLanguage, t } = useLanguage()
  const p = t.privacyPolicy || {}

  return (
    <Modal onClose={onClose} width="max-w-2xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-4 text-[13px] text-cream">
        <div className="border-b border-line pb-3 flex items-start justify-between flex-wrap gap-2">
          <div>
            <span className="text-gold font-serif text-xl font-bold">Kiosko</span>
            <h2 className="text-lg font-serif font-semibold text-cream mt-0.5">{p.title || 'Política de Privacidad de Kiosko'}</h2>
            <p className="text-creamsoft text-[11.5px] font-mono">{p.lastUpdated || 'Última actualización: 8 de septiembre de 2026'}</p>
          </div>

          {/* Selector interactivo de idioma */}
          <div className="flex items-center gap-1 bg-paper2 p-1 rounded-lg border border-line">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  language === l.code
                    ? 'bg-gold text-paper font-bold shadow'
                    : 'text-creamsoft hover:text-cream'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec1Title || '1. Responsable'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec1Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec2Title || '2. Información que se recopila'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec2Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec3Title || '3. Uso de la información'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec3Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec4Title || '4. Almacenamiento y proveedores de infraestructura'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec4Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec5Title || '5. Compartición y visibilidad de datos'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec5Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec6Title || '6. Conservación y seguridad'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec6Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec7Title || '7. Tus derechos y contacto'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec7Text}</p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">{p.sec8Title || '8. Cambios a esta política'}</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">{p.sec8Text}</p>
        </div>

        <div className="p-3 bg-paper2 border border-gold/30 rounded text-xs space-y-1">
          <p className="font-semibold text-gold">
            {language === 'en' ? 'Official Contact & Support:' : language === 'pt' ? 'Contato e Suporte Oficial:' : 'Contacto y Soporte Oficial:'}
          </p>
          <p>📧 {language === 'en' ? 'Email:' : language === 'pt' ? 'E-mail:' : 'Correo:'} <a href="mailto:kkiosko440@gmail.com" className="text-gold font-mono hover:underline">kkiosko440@gmail.com</a></p>
          <p className="text-creamsoft">
            {language === 'en' ? 'Developer: Qelvis / Kiosko Platform' : language === 'pt' ? 'Desenvolvedor: Qelvis / Plataforma Kiosko' : 'Desarrollador: Qelvis / Plataforma Kiosko'}
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Btn variant="primary" onClick={onClose}>
            {t.commonDialogs?.close || 'Cerrar'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

