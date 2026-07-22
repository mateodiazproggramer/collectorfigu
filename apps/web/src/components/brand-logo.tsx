import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';

type BrandLogoProps = {
  variant?: 'wordmark' | 'symbol' | 'hero';
  className?: string;
  priority?: boolean;
  href?: string;
};

const assets = {
  wordmark: {
    src: '/brand/collectorfigu-wordmark.png',
    width: 430,
    height: 430,
  },
  symbol: {
    src: '/brand/collectorfigu-symbol.png',
    width: 160,
    height: 160,
  },
  hero: {
    src: '/brand/collectorfigu-logo-hero.png',
    width: 820,
    height: 820,
  },
};

export function BrandLogo({ variant = 'wordmark', className, priority, href = '/' }: BrandLogoProps) {
  const asset = assets[variant];
  const image = (
    <Image
      src={asset.src}
      alt="CollectorFigu"
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={clsx('object-contain', className)}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} aria-label="Ir al inicio de CollectorFigu" className="inline-flex items-center">
      {image}
    </Link>
  );
}
