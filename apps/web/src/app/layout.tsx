import type { Metadata } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, Space_Mono } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Header } from '@/components/header';
import { GoogleTagManagerNoScript, MarketingTags } from '@/components/marketing-tags';
import { LeadCapturePopup } from '@/components/lead-capture-popup';
import { MetaPixel } from '@/components/meta-pixel';
import { SiteFooter } from '@/components/site-footer';
import { COMPANY_CONTACT } from '@/lib/company';
import { META_PIXEL_ID } from '@/lib/meta-pixel';

// Manual de marca CollectorFigu (CF-06 Identidad visual):
// Bricolage Grotesque (display / titulares), Instrument Sans (cuerpo), Space Mono (codigos, precios y datos).
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-display',
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CollectorFigu | Figuras coleccionables armables para cada fandom',
    template: '%s | CollectorFigu',
  },
  description: 'Arma tu colección con figuras coleccionables armables compatibles con bloques tipo LEGO: anime, superhéroes, películas, series, gaming y más. Envíos a toda Colombia.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  icons: {
    icon: [{ url: '/icon.png?v=20260722-1', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png?v=20260722-1', type: 'image/png' }],
  },
  openGraph: {
    title: 'CollectorFigu',
    description: 'Figuras coleccionables armables para cada fandom: anime, superhéroes, películas, series y gaming. Envíos a toda Colombia.',
    url: '/',
    siteName: 'CollectorFigu',
    images: ['/brand/collectorfigu-logo.png'],
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CollectorFigu',
    description: 'Figuras coleccionables armables para cada fandom: anime, superhéroes, películas, series y gaming. Envíos a toda Colombia.',
    images: ['/brand/collectorfigu-logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_CONTACT.brandName,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collectorfigu.com',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collectorfigu.com'}/brand/collectorfigu-logo.png`,
    email: COMPANY_CONTACT.supportEmail,
    sameAs: [COMPANY_CONTACT.instagramUrl, COMPANY_CONTACT.facebookUrl],
    areaServed: COMPANY_CONTACT.country,
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: COMPANY_CONTACT.brandName,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collectorfigu.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collectorfigu.com'}/productos?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="es-CO" suppressHydrationWarning className={`${bricolageGrotesque.variable} ${instrumentSans.variable} ${spaceMono.variable}`}>
      <body>
        <MarketingTags />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <GoogleTagManagerNoScript />
        {META_PIXEL_ID ? (
          <noscript>
            <img height="1" width="1" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
          </noscript>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd]) }} />
        <Header />
        {children}
        <SiteFooter />
        <LeadCapturePopup />
      </body>
    </html>
  );
}
