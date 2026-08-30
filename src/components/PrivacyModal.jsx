import { Modal, Btn } from './ui'

export function PrivacyModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-4 text-[13px] text-cream">
        <div className="border-b border-line pb-3">
          <span className="text-gold font-serif text-xl font-bold">Kiosko</span>
          <h2 className="text-lg font-serif font-semibold text-cream mt-0.5">Política de Privacidad</h2>
          <p className="text-creamsoft text-[11.5px]">Última actualización: 30 de agosto de 2026</p>
        </div>

        <p className="leading-relaxed text-creamsoft">
          Bienvenido a <b className="text-cream">Kiosko</b>. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información personal y comercial que usted proporciona al utilizar nuestra aplicación en Windows (Microsoft Store), Android, iOS y Web.
        </p>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">1. Información que recopilamos</h3>
          <ul className="list-disc list-inside space-y-1 text-creamsoft text-[12.5px]">
            <li><b className="text-cream">Cuenta y contacto:</b> Correo electrónico y contraseñas cifradas para administradores y trabajadores.</li>
            <li><b className="text-cream">Datos del negocio:</b> Nombre, eslogan, logotipo, productos, existencias de inventario, costos y precios.</li>
            <li><b className="text-cream">Pedidos y clientes:</b> Nombre del cliente, productos solicitados, notas, tipo de entrega (local o domicilio), dirección y teléfono.</li>
            <li><b className="text-cream">Operación y finanzas:</b> Compras a proveedores, ingresos, egresos y pagos de personal.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">2. Uso de la información</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">
            La información se utiliza exclusivamente para sincronizar pedidos en tiempo real, administrar inventarios, generar reportes contables privados y procesar solicitudes de soporte técnico.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">3. Protección y almacenamiento</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">
            Los datos se almacenan de forma segura en bases de datos PostgreSQL en la nube con cifrado SSL/TLS y políticas de seguridad por filas (RLS). Las contraseñas se gestionan mediante estándares criptográficos.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">4. No compartición con terceros</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">
            <b className="text-cream">Kiosko no vende ni comercializa sus datos personales ni los de su negocio</b> con terceros ajenos al servicio.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-gold text-sm font-semibold mb-1">5. Derechos del usuario</h3>
          <p className="text-creamsoft text-[12.5px] leading-relaxed">
            Usted puede consultar, corregir o solicitar la eliminación total de sus datos en cualquier momento desde su panel o escribiéndonos directamente.
          </p>
        </div>

        <div className="p-3 bg-paper2 border border-gold/30 rounded text-xs space-y-1">
          <p className="font-semibold text-gold">Contacto y Soporte Oficial:</p>
          <p>📧 Correo: <a href="mailto:kkiosko440@gmail.com" className="text-gold font-mono hover:underline">kkiosko440@gmail.com</a></p>
          <p className="text-creamsoft">Desarrollador: Qelvis / Kiosko Platform</p>
        </div>

        <div className="pt-2 flex justify-end">
          <Btn variant="primary" onClick={onClose}>
            Entendido / Cerrar
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

