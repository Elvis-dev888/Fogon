import { useLanguage, LANGUAGES } from '../lib/i18n.jsx'

export default function PrivacyPolicy() {
  const { language, setLanguage, t } = useLanguage()
  const p = t.privacyPolicy || {}

  return (
    <main className="min-h-screen bg-[#151515] px-5 py-10 text-[#f4e8d0] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-10">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
          <a className="text-sm font-semibold text-[#d7ae5a] hover:underline" href="/">
            {p.backToKiosko || '← Volver a Kiosko'}
          </a>

          {/* Selector de idioma */}
          <div className="flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-lg border border-white/10">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  language === l.code
                    ? 'bg-[#d7ae5a] text-[#151515] font-bold shadow'
                    : 'text-[#c6bba8] hover:text-[#f4e8d0]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-6 font-serif text-3xl font-semibold sm:text-4xl text-[#f4e8d0]">
          {p.title || 'Política de Privacidad de Kiosko'}
        </h1>
        <p className="mt-2 text-xs text-[#c6bba8] font-mono">
          {p.lastUpdated || 'Última actualización: 8 de septiembre de 2026'}
        </p>

        <Section title={p.sec1Title || '1. Responsable'}>
          {p.sec1Text}
        </Section>

        <Section title={p.sec2Title || '2. Información que se recopila'}>
          {p.sec2Text}
        </Section>

        <Section title={p.sec3Title || '3. Uso de la información'}>
          {p.sec3Text}
        </Section>

        <Section title={p.sec4Title || '4. Almacenamiento y proveedores'}>
          {p.sec4Text}
        </Section>

        <Section title={p.sec5Title || '5. Compartición y visibilidad'}>
          {p.sec5Text}
        </Section>

        <Section title={p.sec6Title || '6. Conservación y seguridad'}>
          {p.sec6Text}
        </Section>

        <Section title={p.sec7Title || '7. Tus derechos y contacto'}>
          {p.sec7Text}
        </Section>

        <Section title={p.sec8Title || '8. Cambios a esta política'}>
          {p.sec8Text}
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#e6c77d]">{title}</h2>
      <p className="mt-2 leading-7 text-[#e6dfd0] text-sm sm:text-base">{children}</p>
    </section>
  )
}
