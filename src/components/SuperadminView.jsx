import { useState } from 'react'
import { Btn, Card, StatCard, Pill, Modal, Field, Input } from './ui'
import { fmt$ } from '../lib/helpers'
import { createNegocio, toggleNegocioEstado } from '../lib/api'

export default function SuperadminView({ negocios, onEnter, onChanged, notify }) {
  const [showNew, setShowNew] = useState(false)

  const totalVentasMes = negocios.reduce((s, n) => s + (n.ventasMes || 0), 0)
  const totalPedidos = negocios.reduce((s, n) => s + (n.pedidosCount || 0), 0)

  async function handleToggle(n) {
    await toggleNegocioEstado(n)
    notify(`${n.nombre} ahora está ${n.estado === 'Activo' ? 'pausado' : 'activo'}`)
    onChanged()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-6 flex-wrap mb-8 pb-6 border-b border-line">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-2">Panel del Superadministrador</h2>
          <p className="text-creamsoft text-sm max-w-lg leading-relaxed">
            Vista general de la plataforma como producto. La operación diaria de cada negocio la maneja su propio administrador.
          </p>
        </div>
        <Btn variant="primary" onClick={() => setShowNew(true)}>
          ➕ Registrar negocio
        </Btn>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-8">
        <StatCard label="Negocios activos" value={negocios.filter((n) => n.estado === 'Activo').length} />
        <StatCard label="Ventas del mes (todas)" value={fmt$(totalVentasMes)} tone="gold" />
        <StatCard label="Pedidos totales" value={totalPedidos} tone="champagne" />
        <StatCard label="Plataforma" value="En operación" tone="sage" />
      </div>

      <h3 className="font-serif text-xl mb-3">Negocios registrados</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {negocios.map((n) => (
          <NegocioCard key={n.id} n={n} onEnter={onEnter} onToggle={() => handleToggle(n)} />
        ))}
        <button
          onClick={() => setShowNew(true)}
          className="border border-dashed border-line rounded flex flex-col items-center justify-center gap-2.5 min-h-[196px] text-creamsoft font-semibold text-[13px] hover:border-gold hover:text-gold transition-colors"
        >
          <span className="text-2xl">➕</span>Registrar nuevo negocio
        </button>
      </div>

      {showNew && (
        <NuevoNegocioModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false)
            notify('Negocio registrado en la plataforma')
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function NegocioCard({ n, onEnter, onToggle }) {
  return (
    <div className="rounded border border-line bg-paper2 overflow-hidden hover:border-gold transition-colors">
      <div className="h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(199,154,60,.18)_0%,transparent_60%)]" />
      </div>
      <div className="p-5">
        <div className="mb-2.5">
          <Pill tone={n.estado === 'Activo' ? 'activo' : 'pausado'}>{n.estado}</Pill>
        </div>
        <h3 className="font-serif text-lg font-semibold mb-0.5">
          {n.emoji} {n.nombre}
        </h3>
        <p className="text-[12.5px] text-creamsoft mb-3">{n.slogan}</p>
        <div className="flex gap-4 mb-4 font-mono text-[11.5px] text-creamsoft">
          <div>
            <b className="block font-serif text-base text-cream font-semibold">{n.productosCount ?? 0}</b>productos
          </div>
          <div>
            <b className="block font-serif text-base text-cream font-semibold">{fmt$(n.ventasMes || 0)}</b>ventas/mes
          </div>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="primary" onClick={() => onEnter('admin', n.id)}>
            Entrar como admin
          </Btn>
          <Btn size="sm" variant="ghost" onClick={onToggle}>
            {n.estado === 'Activo' ? 'Pausar' : 'Activar'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function NuevoNegocioModal({ onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [slogan, setSlogan] = useState('')
  const [emoji, setEmoji] = useState('🍴')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await createNegocio({ nombre: nombre.trim(), slogan: slogan.trim() || 'Recién llegado a Fogón', emoji })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-serif text-xl font-semibold mb-4">Registrar nuevo negocio</h2>
      <form onSubmit={submit}>
        <Field label="Nombre del negocio">
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fritanga La 15" />
        </Field>
        <Field label="Eslogan (opcional)">
          <Input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Ej: Fritos con actitud" />
        </Field>
        <Field label="Emoji / ícono">
          <Input maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </Field>
        <Btn variant="primary" className="w-full justify-center" disabled={saving}>
          {saving ? 'Guardando…' : 'Crear negocio'}
        </Btn>
      </form>
    </Modal>
  )
}
