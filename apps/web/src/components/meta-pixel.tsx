'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { META_PIXEL_ID, trackMetaPixel, trackMetaPixelCustom, trackSiteAnalytics } from '@/lib/meta-pixel';

export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPageViewSkipped = useRef(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (!initialPageViewSkipped.current) {
      initialPageViewSkipped.current = true;
      trackSiteAnalytics('PageView');
      return;
    }
    trackMetaPixel('PageView');
  }, [routeKey]);

  if (!META_PIXEL_ID) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}

export function MetaPixelEvent({ event, parameters, custom = false }: { event: string; parameters?: Record<string, unknown>; custom?: boolean }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (custom) trackMetaPixelCustom(event, parameters);
    else trackMetaPixel(event, parameters);
  }, [custom, event, parameters]);

  return null;
}
