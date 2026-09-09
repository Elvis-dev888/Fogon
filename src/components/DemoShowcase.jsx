import { useState, useEffect } from 'react'
import AdminView from './AdminView'
import ClienteView from './ClienteView'
import SuperadminView from './SuperadminView'
import { TabDashboard, TabProductos, TabCategorias, TabInventario, TabCompras, TabPedidos, TabVentas, TabTrabajadores, TabFinanzas, TabMiNegocio, TabMiSuscripcion } from './AdminTabs'
import App from '../App'
import { Card, Pill, StatCard, Btn } from './ui'

const MOCK_NEGOCIO = {
  id: 'demo-negocio-01',
  nombre: 'El Rincón Gourmet',
  slogan: 'Sabores auténticos hechos con pasión',
  descripcion: 'Restaurante y cafetería especializada en hamburguesas artesanales, pizzas y bebidas.',
  modo_operacion: 'catalogo',
  moneda: 'COP',
  plan: 'Plan Pro',
  subscription_status: 'trial',
  trial_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  trial_ends_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  codigo_empleados: '4821',
  productosCount: 18,
  is_vip: false,
}

const MOCK_CATEGORIAS = [
  { id: 'cat-1', nombre: '🍔 Hamburguesas Artesanales', orden: 1 },
  { id: 'cat-2', nombre: '🍕 Pizzas al Horno', orden: 2 },
  { id: 'cat-3', nombre: '🍟 Acompañamientos', orden: 3 },
  { id: 'cat-4', nombre: '🥤 Bebidas & Cócteles', orden: 4 },
]

const MOCK_PRODUCTOS = [
  {
    id: 'prod-1',
    categoria_id: 'cat-1',
    nombre: 'Hamburguesa Doble Angus',
    descripcion: 'Doble carne angus 150g, queso cheddar fundido, tocineta crocante y salsa especial de la casa.',
    precio: 28000,
    disponible: true,
    foto_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    adiciones: [
      { nombre: 'Queso Cheddar Extra', precio: 3500 },
      { nombre: 'Tocineta Ahumada', precio: 4500 },
      { nombre: 'Papas Francesas', precio: 6000 },
    ]
  },
  {
    id: 'prod-2',
    categoria_id: 'cat-1',
    nombre: 'Hamburguesa Clásica BBQ',
    descripcion: 'Carne de res seleccionada, aros de cebolla crocantes, lechuga fresca y salsa barbacoa.',
    precio: 22000,
    disponible: true,
    foto_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    adiciones: [
      { nombre: 'Salsa BBQ Extra', precio: 2000 },
      { nombre: 'Huevo Frito', precio: 2500 }
    ]
  },
  {
    id: 'prod-3',
    categoria_id: 'cat-2',
    nombre: 'Pizza Especial Rincón (8 porciones)',
    descripcion: 'Masa madre, salsa napolitana artesanal, queso mozzarella, jamón serrano y champiñones frescos.',
    precio: 42000,
    disponible: true,
    foto_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    adiciones: [
      { nombre: 'Borde de Queso', precio: 7000 },
      { nombre: 'Extra Pepperoni', precio: 5000 }
    ]
  },
  {
    id: 'prod-4',
    categoria_id: 'cat-3',
    nombre: 'Papas Rústicas con Queso y Tocineta',
    descripcion: 'Papas en cascos doradas sazonadas con páprika, queso fundido y bits de tocineta.',
    precio: 16000,
    disponible: true,
    foto_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    adiciones: []
  },
  {
    id: 'prod-5',
    categoria_id: 'cat-4',
    nombre: 'Limonada de Coco Cremosita',
    descripcion: 'Refrescante limonada natural preparada con crema de coco y hielo granizado.',
    precio: 9500,
    disponible: true,
    foto_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    adiciones: []
  }
]

const MOCK_TRABAJADORES = [
  { id: 'trab-1', nombre: 'Carlos Rodríguez', cargo: 'Cocinero Principal', rol: 'Cocinero Principal', estado: 'Activo', pago: 1750000, esquema_pago: 'fijo', frecuencia_pago: 'mensual', pagos: [{ id: 'p-1', periodo: 'Enero 2026', valor: 1750000, creado_en: '2026-01-31T12:00:00Z' }] },
  { id: 'trab-2', nombre: 'Valentina Duque', cargo: 'Confección & Ventas Ropa', rol: 'Confección & Ventas Ropa', estado: 'Activo', pago: 0, esquema_pago: 'comision', tipo_comision: 'porcentaje', valor_comision: 10, pagos: [{ id: 'p-2', periodo: 'Comisión Quincena 1', valor: 150000, creado_en: '2026-02-15T12:00:00Z' }] },
  { id: 'trab-3', nombre: 'Andrés Felipe Pérez', cargo: 'Asesor Comercial / Boutique', rol: 'Asesor Comercial', estado: 'Activo', pago: 800000, esquema_pago: 'mixto', tipo_comision: 'monto_fijo', valor_comision: 5000, frecuencia_pago: 'quincenal', pagos: [] },
]

const MOCK_PEDIDOS = [
  {
    id: 'ped-101',
    numero: 101,
    cliente: 'Mesa 4 — Valentina Duque',
    tipo: 'local',
    mesa: 'Mesa 4',
    estado: 'En preparación',
    total: 56000,
    creado_en: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    items: [
      { producto: 'Hamburguesa Doble Angus', cantidad: 2, precio_unitario: 28000, adiciones: ['Queso Cheddar Extra', 'Tocineta'] }
    ]
  },
  {
    id: 'ped-102',
    numero: 102,
    cliente: 'Domicilio — Juan Camilo Herrera',
    tipo: 'domicilio',
    direccion: 'Carrera 15 # 85-30 Apto 402',
    telefono: '3124567890',
    estado: 'Pendiente',
    total: 68000,
    creado_en: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    items: [
      { producto: 'Pizza Especial Rincón', cantidad: 1, precio_unitario: 42000, adiciones: ['Borde de Queso'] },
      { producto: 'Limonada de Coco Cremosita', cantidad: 2, precio_unitario: 9500, adiciones: [] }
    ]
  },
  {
    id: 'ped-103',
    numero: 103,
    cliente: 'Mesa 2 — David Morales',
    tipo: 'local',
    mesa: 'Mesa 2',
    estado: 'Listo',
    total: 38000,
    creado_en: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items: [
      { producto: 'Hamburguesa Clásica BBQ', cantidad: 1, precio_unitario: 22000, adiciones: ['Papas Francesas'] },
      { producto: 'Papas Rústicas con Queso', cantidad: 1, precio_unitario: 16000, adiciones: [] }
    ]
  }
]

const MOCK_INGREDIENTES = [
  { id: 'ing-1', nombre: 'Carne Angus Molida', unidad: 'kg', stock: 18.5, stock_minimo: 5, costo_unitario: 32000 },
  { id: 'ing-2', nombre: 'Queso Cheddar Tajado', unidad: 'kg', stock: 8.2, stock_minimo: 3, costo_unitario: 24000 },
  { id: 'ing-3', nombre: 'Pan Brioche Artesanal', unidad: 'unidad', stock: 45, stock_minimo: 15, costo_unitario: 1600 },
  { id: 'ing-4', nombre: 'Tocineta Ahumada', unidad: 'kg', stock: 6.0, stock_minimo: 2, costo_unitario: 28000 },
  { id: 'ing-5', nombre: 'Papas Russet Congeladas', unidad: 'kg', stock: 25.0, stock_minimo: 10, costo_unitario: 7500 },
]

const MOCK_COMPRAS = [
  { id: 'comp-1', ingrediente: 'Carne Angus Molida', cantidad: 20, costo_total: 640000, fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'comp-2', ingrediente: 'Pan Brioche Artesanal', cantidad: 60, costo_total: 96000, fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
]

const MOCK_INGRESOS = [
  { id: 'ingr-1', descripcion: 'Ventas de mostrador turno mañana', monto: 850000, fecha: new Date().toISOString() },
  { id: 'ingr-2', descripcion: 'Ventas pedidos QR y domicilios', monto: 620000, fecha: new Date().toISOString() },
]

const MOCK_EGRESOS = [
  { id: 'egr-1', descripcion: 'Compra de verduras e insumos frescos', monto: 180000, fecha: new Date().toISOString() },
  { id: 'egr-2', descripcion: 'Pago diario ayudante de cocina', monto: 60000, fecha: new Date().toISOString() },
]

const MOCK_DATA = {
  categorias: MOCK_CATEGORIAS,
  productos: MOCK_PRODUCTOS,
  ingredientes: MOCK_INGREDIENTES,
  compras: MOCK_COMPRAS,
  pedidos: MOCK_PEDIDOS,
  ventas: MOCK_PEDIDOS.filter(p => p.estado === 'Listo' || p.estado === 'Entregado'),
  trabajadores: MOCK_TRABAJADORES,
  ingresos: MOCK_INGRESOS,
  egresos: MOCK_EGRESOS,
}

export default function DemoShowcase() {
  const urlParams = new URLSearchParams(window.location.search)
  const scene = urlParams.get('scene') || 'dashboard'

  const notify = (msg) => console.log('Toast:', msg)

  if (scene === 'home') {
    return (
      <div className="min-h-screen bg-bg text-cream">
        <App />
      </div>
    )
  }

  if (scene === 'cliente') {
    return (
      <div className="min-h-screen bg-bg text-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-paper border border-line rounded-3xl shadow-2xl overflow-hidden min-h-[850px]">
          <div className="bg-paper2 px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍔</span>
              <div>
                <h3 className="font-serif font-bold text-sm text-gold">El Rincón Gourmet</h3>
                <p className="text-[10px] text-creamsoft">Menú Digital • Mesa 4</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded">
              Abierto
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-paper border border-line rounded-xl p-3 flex gap-3">
              <img
                src={MOCK_PRODUCTOS[0].foto_url}
                alt="Hamburguesa"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-serif font-bold text-sm text-cream">{MOCK_PRODUCTOS[0].nombre}</h4>
                <p className="text-xs text-creamsoft line-clamp-2 mt-0.5">{MOCK_PRODUCTOS[0].descripcion}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-serif font-bold text-gold">$28.000 COP</span>
                  <button className="text-xs bg-gold text-paper font-bold px-3 py-1 rounded hover:bg-golddark">
                    + Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-paper border border-line rounded-xl p-3 flex gap-3">
              <img
                src={MOCK_PRODUCTOS[2].foto_url}
                alt="Pizza"
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-serif font-bold text-sm text-cream">{MOCK_PRODUCTOS[2].nombre}</h4>
                <p className="text-xs text-creamsoft line-clamp-2 mt-0.5">{MOCK_PRODUCTOS[2].descripcion}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-serif font-bold text-gold">$42.000 COP</span>
                  <button className="text-xs bg-gold text-paper font-bold px-3 py-1 rounded hover:bg-golddark">
                    + Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Carrito abierto */}
            <div className="mt-6 bg-gradient-to-b from-paper2 to-paper border-2 border-gold/50 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h4 className="font-serif font-bold text-sm text-gold flex items-center gap-1.5">
                  🛒 Tu Pedido (Mesa 4)
                </h4>
                <span className="text-xs text-creamsoft">2 productos</span>
              </div>
              <div className="py-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>1x Hamburguesa Doble Angus (+ Cheddar Extra)</span>
                  <span className="font-mono text-gold">$31.500</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Limonada de Coco</span>
                  <span className="font-mono text-gold">$9.500</span>
                </div>
              </div>
              <div className="pt-2 border-t border-line flex justify-between items-center">
                <span className="text-xs text-creamsoft">Total a Pagar:</span>
                <span className="font-serif font-bold text-base text-gold">$41.000 COP</span>
              </div>
              <button className="w-full mt-3 bg-gold hover:bg-golddark text-paper font-bold text-xs py-2.5 rounded-lg transition-colors">
                ✓ Confirmar y Enviar a Cocina
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (scene === 'empleado_pin') {
    return (
      <div className="min-h-screen bg-bg text-cream flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">📱</span>
            <h2 className="font-serif text-2xl font-bold text-cream mt-2">Acceso de Empleados &amp; Meseros</h2>
            <p className="text-xs text-creamsoft">Ingresa con el código PIN de 6 dígitos que te compartió el dueño del negocio</p>
          </div>
          <div className="bg-paper border border-line rounded-2xl p-6 shadow-2xl">
            <label className="block text-xs font-semibold text-creamsoft mb-2 uppercase tracking-wider">
              Código PIN de tu Negocio
            </label>
            <div className="font-mono text-3xl font-bold tracking-[0.3em] text-center text-gold bg-paper2 border border-gold/40 py-4 rounded-xl mb-4">
              482195
            </div>
            <p className="text-xs text-creamsoft mb-5 text-center">
              ✓ Vinculado con éxito a: <b className="text-cream">El Rincón Gourmet</b>
            </p>
            <button className="w-full bg-gold hover:bg-golddark text-paper font-bold py-3 rounded-xl transition-all shadow-lg text-sm">
              🧑‍🍳 Entrar a Atender Pedidos en Vivo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Wrapper for Admin Tabs
  return (
    <div className="min-h-screen bg-bg text-cream font-sans p-6 max-w-7xl mx-auto">
      {/* App Header */}
      <div className="flex items-center justify-between pb-5 mb-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/40 flex items-center justify-center text-2xl shadow">
            🍔
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-cream">El Rincón Gourmet</h2>
            <p className="text-xs text-creamsoft">Panel de Administración • Modo Catálogo &amp; Restaurante</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-sage/10 text-sage border border-sage/30 px-3 py-1 rounded-full">
            ● Operación en Vivo
          </span>
          <span className="text-xs font-serif bg-gold/10 text-gold border border-gold/30 px-3 py-1 rounded-full">
            ⏳ 60 Días de Prueba
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-line text-xs font-semibold">
        {[
          ['dashboard', '📊 Dashboard'],
          ['productos', '🍔 Productos'],
          ['pedidos', '🧑‍🍳 Pedidos en Vivo'],
          ['inventario', '📦 Inventario'],
          ['compras', '🛍️ Compras'],
          ['ventas', '🛒 Ventas'],
          ['trabajadores', '👥 Trabajadores & PIN'],
          ['finanzas', '📈 Finanzas'],
          ['suscripcion', '💳 Mi Suscripción']
        ].map(([key, label]) => (
          <div
            key={key}
            className={`px-3.5 py-2 rounded-lg cursor-pointer whitespace-nowrap transition-all ${
              scene === key
                ? 'bg-gold text-paper font-bold shadow'
                : 'text-creamsoft bg-paper hover:text-cream border border-line'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Active Scene Component */}
      <div className="bg-paper/60 border border-line rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        {scene === 'dashboard' && <TabDashboard negocio={MOCK_NEGOCIO} data={MOCK_DATA} onOpenShareMenu={() => {}} />}
        {scene === 'productos' && <TabProductos negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'pedidos' && <TabPedidos negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'inventario' && <TabInventario negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'compras' && <TabCompras negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'ventas' && <TabVentas negocio={MOCK_NEGOCIO} data={MOCK_DATA} />}
        {scene === 'trabajadores' && <TabTrabajadores negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'finanzas' && <TabFinanzas negocio={MOCK_NEGOCIO} data={MOCK_DATA} notify={notify} reload={() => {}} />}
        {scene === 'suscripcion' && <TabMiSuscripcion negocio={MOCK_NEGOCIO} data={MOCK_DATA} />}
        {scene === 'superadmin' && (
          <SuperadminView
            negocios={[
              MOCK_NEGOCIO,
              { id: 'neg-2', nombre: 'Ferretería & Bodega Central', modo_operacion: 'inventario', plan: 'Plan Pro', subscription_status: 'trial', trial_started_at: new Date().toISOString(), trial_ends_at: new Date(Date.now() + 65*86400000).toISOString(), productosCount: 142, is_vip: false },
              { id: 'neg-3', nombre: 'Barbería Don Mario', modo_operacion: 'catalogo', plan: 'Plan Cortesía VIP', subscription_status: 'vip', is_vip: true, productosCount: 12 }
            ]}
            onExit={() => {}}
            notify={notify}
          />
        )}
      </div>
    </div>
  )
}

