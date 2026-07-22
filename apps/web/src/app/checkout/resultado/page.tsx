import Link from 'next/link';
import { CheckCircle2, Clock, CreditCard } from 'lucide-react';
import { MetaPixelEvent } from '@/components/meta-pixel';

export default async function CheckoutResultPage({ searchParams }: { searchParams: Promise<{ id?: string; reference?: string }> }) {
  const params = await searchParams;
  return (
    <main>
      <MetaPixelEvent custom event="WompiReturn" parameters={{ order_id: params.reference, transaction_id: params.id }} />
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-12">
          <p className="badge-brand">Resultado de pago</p>
          <h1 className="mt-4 text-4xl font-black">Estamos verificando tu transaccion</h1>
          <p className="mt-3 max-w-2xl text-white/60">Wompi redirecciona al finalizar, pero la aprobacion definitiva se confirma automaticamente con la pasarela.</p>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="card max-w-3xl p-8">
          <div className="inline-flex rounded-2xl bg-brand-blue/10 p-3 text-brand-blue"><CreditCard size={28} /></div>
          <h2 className="mt-5 text-2xl font-black">Pago recibido para validacion</h2>
          <p className="mt-3 text-sm leading-6 text-brand-inkSoft">
            Si Wompi aprueba la transaccion, el pedido cambiara automaticamente a pagado. Si queda pendiente o rechazado, el equipo podra revisarlo desde el panel administrativo.
          </p>
          <div className="mt-6 grid gap-3 rounded-3xl bg-brand-paper2 p-5 text-sm font-semibold text-brand-inkSoft">
            <p><Clock size={16} className="mr-2 inline text-brand-blue" /> Referencia: {params.reference ?? 'No informada'}</p>
            <p><CheckCircle2 size={16} className="mr-2 inline text-brand-blue" /> Transaccion Wompi: {params.id ?? 'Pendiente de retorno'}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/productos" className="btn-primary">Volver al catalogo</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
