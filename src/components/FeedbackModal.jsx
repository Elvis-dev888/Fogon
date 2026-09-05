import { useState } from 'react'
import { Modal, Btn, Field, Input, Textarea } from './ui'
import { enviarSugerencia } from '../lib/api'
import { useLanguage } from '../lib/i18n.jsx'
import { supabase } from '../lib/supabaseClient'

export function FeedbackModal({ negocio, onClose, notify }) {
  const { t } = useLanguage()
  const [tipo, setTipo] = useState('idea') // 'idea' | 'mejora' | 'error' | 'otro'
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  const tipos = [
    { key: 'idea', label: t.feedback.typeIdea },
    { key: 'mejora', label: t.feedback.typeImprovement },
    { key: 'error', label: t.feedback.typeBug },
    { key: 'otro', label: t.feedback.typeOther },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!mensaje.trim()) return
    setEnviando(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const email = authData?.user?.email || ''

      await enviarSugerencia({
        negocioId: negocio.id,
        negocioNombre: negocio.nombre,
        usuarioEmail: email,
        tipo,
        titulo,
        mensaje,
      })

      notify(t.feedback.sent)
      onClose()
    } catch (err) {
      console.error('[Kiosko] Error enviando sugerencia:', err)
      notify('Error al enviar la sugerencia: ' + (err.message || String(err)))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4">
        <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
          💡 {t.feedback.title}
        </h2>
        <p className="text-creamsoft text-[12.5px] mt-1">{t.feedback.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-creamsoft mb-2">
            {t.feedback.typeLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tipos.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTipo(item.key)}
                className={`py-2 px-2.5 rounded text-left text-xs transition-colors border ${
                  tipo === item.key
                    ? 'border-gold bg-gold/15 text-gold font-semibold'
                    : 'border-line bg-paper text-creamsoft hover:text-cream'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <Field label={t.feedback.subjectLabel}>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t.feedback.subjectPlaceholder}
            maxLength={100}
          />
        </Field>

        <Field label={t.feedback.messageLabel}>
          <Textarea
            required
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder={t.feedback.messagePlaceholder}
          />
        </Field>

        <div className="pt-2 flex justify-end gap-2">
          <Btn variant="ghost" type="button" onClick={onClose} disabled={enviando}>
            {t.orderShared?.back || 'Cancelar'}
          </Btn>
          <Btn variant="primary" type="submit" disabled={enviando}>
            {enviando ? t.feedback.sending : t.feedback.send}
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

