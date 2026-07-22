import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        // Manual de marca CollectorFigu: Bricolage Grotesque (display), Instrument Sans (body), Space Mono (mono).
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          // ---- Paleta oficial del manual de marca (CF-06 Identidad visual) ----
          ink: '#201A2E', // Tinta: texto y fondos oscuros
          inkSoft: '#6E6580', // Tinta suave: texto secundario
          paper: '#FBF7F1', // Papel: fondo claro principal
          paper2: '#F3ECE0', // Papel 2: fondo claro secundario / cards
          pop: '#FF3E6C', // Coral pop: acento primario, CTAs, enfasis
          coral: '#FF3E6C', // alias de pop
          violet: '#6D3BF5', // Violeta arcade: acento secundario, links, precios en mono
          gold: '#FFB627', // Oro spotlight: highlight, CTA principal, glow del hero
          green: '#178A4E', // Verde ok: exito / confirmaciones
          line: '#E4DACB', // Linea / bordes

          // ---- Alias heredados de la sesion anterior, remapeados a los valores oficiales ----
          // para no romper clases `brand-*` ya usadas en toda la app (ver componentes en src/).
          dark: '#201A2E', // antes #0B0B10 -> Tinta oficial
          navy: '#2C2440', // antes #1A1024 -> tono oscuro secundario (tomado del propio manual, tarjeta "blister")
          midnight: '#241D34', // antes #150E1F -> tono oscuro terciario (tomado del propio manual, tarjeta "blister")
          blue: '#6D3BF5', // antes #6C3CE9 -> Violeta arcade oficial (el valor ya era casi identico)
          blueInk: '#5629C7', // antes #4B21B8 -> hover mas oscuro sobre el violeta arcade
          cyan: '#FFB627', // antes #FFC933 -> Oro spotlight oficial (ya cumplia el mismo rol de acento calido)
          steel: '#F3ECE0', // antes #EFEAFE -> Papel 2 oficial
          soft: '#FBF7F1', // antes #F6F3FE -> Papel oficial
        },
      },
      boxShadow: {
        soft: '0 18px 50px rgba(32, 26, 46, 0.10)',
        glow: '0 0 38px rgba(109, 59, 245, 0.38)',
        cyan: '0 0 36px rgba(255, 182, 39, 0.32)',
        card: '0 22px 60px rgba(32, 26, 46, 0.12)',
      },
      backgroundImage: {
        'tech-grid': 'linear-gradient(rgba(255,182,39,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(109,59,245,.10) 1px, transparent 1px)',
        'brand-radial': 'radial-gradient(circle at 20% 15%, rgba(255,182,39,.20), transparent 30%), radial-gradient(circle at 80% 0%, rgba(109,59,245,.28), transparent 34%)',
        'premium-line': 'linear-gradient(90deg, transparent, rgba(255,182,39,.55), transparent)',
      },
    },
  },
  plugins: [],
};

export default config;
