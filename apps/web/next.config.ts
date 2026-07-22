import type { NextConfig } from 'next';

// En produccion, Caddy expone /uploads/* en el mismo dominio publico y lo reenvia al servicio
// api (ver Caddyfile). En desarrollo local no hay Caddy, asi que Next.js hace ese mismo reenvio
// aqui: sin esto, las imagenes subidas via importacion masiva (guardadas localmente por la API
// cuando Cloudinary no esta configurado) devuelven 404 porque la URL publica apunta al origen
// del sitio web (puerto 2026) y no al contenedor de la API que realmente sirve esos archivos.
const apiOrigin = (process.env.NEXT_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://api:4000/api/v1').replace(/\/api\/v1\/?$/, '');

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] },
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path((?:brand|payments|retoma)/.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
export default nextConfig;
