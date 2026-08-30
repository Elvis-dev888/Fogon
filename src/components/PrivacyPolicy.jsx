export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#151515] px-5 py-10 text-[#f4e8d0] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-10">
        <a className="text-sm text-[#d7ae5a] hover:underline" href="/">← Volver a Kiosko</a>
        <h1 className="mt-6 font-serif text-3xl font-semibold sm:text-4xl">Política de privacidad de Kiosko</h1>
        <p className="mt-3 text-sm text-[#c6bba8]">Última actualización: 28 de agosto de 2026</p>

        <Section title="1. Responsable">
          Kiosko es una aplicación para administrar negocios, inventario, pedidos y ventas. Esta política explica cómo se trata la información al usar la aplicación y sus servicios asociados.
        </Section>
        <Section title="2. Información que se recopila">
          Para crear y administrar una cuenta se recopila el correo electrónico y la información de autenticación. Los administradores también pueden registrar datos del negocio, catálogo, inventario, trabajadores, compras, ventas y movimientos financieros. Al crear un pedido, el cliente puede proporcionar el nombre que desea usar para identificarlo en el negocio.
        </Section>
        <Section title="3. Uso de la información">
          La información se usa únicamente para prestar las funciones de Kiosko: autenticar usuarios, mostrar catálogos, gestionar pedidos, inventario, personal, ventas y finanzas, y mantener separados los datos de cada negocio.
        </Section>
        <Section title="4. Almacenamiento y proveedores">
          Los datos de la aplicación se almacenan y procesan mediante Supabase, proveedor de infraestructura de base de datos, autenticación y archivos. Kiosko no vende información personal ni la usa para publicidad basada en el comportamiento.
        </Section>
        <Section title="5. Compartición y visibilidad">
          La información de pedidos y operación se comparte con el negocio al que corresponde y con los usuarios autorizados de ese negocio. Las imágenes de logos y productos que sus administradores publiquen pueden ser visibles en el catálogo público del negocio.
        </Section>
        <Section title="6. Conservación y seguridad">
          Los datos se conservan mientras sean necesarios para operar la cuenta o el negocio, salvo que una obligación legal requiera conservarlos por más tiempo. Se aplican controles de acceso de la plataforma para limitar el acceso a la información según el rol del usuario.
        </Section>
        <Section title="7. Tus derechos y contacto">
          Puedes solicitar acceso, corrección o eliminación de los datos de tu cuenta contactando al administrador del negocio que usa Kiosko. Si eres administrador, puedes gestionar la información operativa desde la aplicación o contactar al responsable de Kiosko mediante el canal desde el que obtuviste la aplicación.
        </Section>
        <Section title="8. Cambios a esta política">
          Si se realizan cambios relevantes, esta página se actualizará con una nueva fecha de revisión.
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#e6c77d]">{title}</h2>
      <p className="mt-2 leading-7 text-[#e6dfd0]">{children}</p>
    </section>
  )
}
