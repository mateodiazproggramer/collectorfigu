import Image from 'next/image';

export function WompiPaymentArt({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.25rem] border border-brand-line bg-white p-2 shadow-soft ${className}`}>
      <Image
        src="/payments/wompi-payment-methods.svg"
        alt="Wompi con PSE, Bancolombia, Nequi, Visa, Mastercard y American Express"
        width={690}
        height={153}
        className="mx-auto aspect-[690/153] w-full object-contain"
      />
    </div>
  );
}
