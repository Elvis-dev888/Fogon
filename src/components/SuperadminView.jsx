import { Btn, StatCard, Pill, NegocioLogo } from './ui'
import { fmt$ } from '../lib/helpers'
import { toggleNegocioEstado } from '../lib/api'

export default function SuperadminView({ negocios, onChanged, notify }) {
  const totalVentasMes = negocios.reduce((s, n) => s + (n.ventasMes || 0), 0)
  const totalPedidos = negocios.reduce((s, n) => s + (n.pedidosCount || 0), 0)

  async function handleToggle(n) {
    await toggleNegocioEstado(n)
    notify(`${n.nombre} ahora está ${n.estado === 'Activo' ? 'pausado' : 'activo'}`)
    onChanged()
  }

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-line">
        <h2 className="font-serif text-3xl font-semibold mb-2">Panel del Superadministrador</h2>
        <p className="text-creamsoft text-sm max-w-lg leading-relaxed">
          Vista general de la plataforma como producto. Los negocios se registran cuando su dueño crea su propia
          cuenta desde "Admin negocio" — aquí solo administras su estado dentro de la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 mb-8">
        <StatCard label="Negocios activos" value={negocios.filter((n) => n.estado === 'Activo').length} />
        <StatCard label="Ventas del mes (todas)" value={fmt$(totalVentasMes)} tone="gold" />
        <StatCard label="Pedidos totales" value={totalPedidos} tone="champagne" />
        <StatCard label="Plataforma" value="En operación" tone="sage" />
      </div>

      <h3 className="font-serif text-xl mb-3">Negocios registrados</h3>
      {negocios.length === 0 ? (
        <p className="text-creamsoft text-sm">Todavía no hay negocios — aparecerán aquí en cuanto alguien registre el suyo.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
          {negocios.map((n) => (
            <NegocioCard key={n.id} n={n} onToggle={() => handleToggle(n)} />
          ))}
        </div>
      )}
    </div>
  )
}

function NegocioCard({ n, onToggle }) {
  return (
    <div className="rounded border border-line bg-paper2 overflow-hidden">
      <div className="h-[74px] bg-gradient-to-br from-paper3 to-paper2 border-b border-line relative overflow-hidden">
        {n.logo_url
          ? <img src={n.logo_url} alt={n.nombre} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(199,154,60,.18)_0%,transparent_60%)]" />}
      </div>
      <div className="p-5">
        <div className="mb-2.5">
          <Pill tone={n.estado === 'Activo' ? 'activo' : 'pausado'}>{n.estado}</Pill>
        </div>
        <h3 className="font-serif text-lg font-semibold mb-0.5 flex items-center gap-1.5">
          <NegocioLogo negocio={n} size={20} /> {n.nombre}
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
        <Btn size="sm" variant="ghost" onClick={onToggle}>
          {n.estado === 'Activo' ? 'Pausar' : 'Activar'}
        </Btn>
      </div>
    </div>
  )
}