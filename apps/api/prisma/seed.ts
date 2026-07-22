import { PrismaClient, ProductStatus, ReviewStatus, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

function assertStrongProductionPassword(password: string) {
  const strong = password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password);
  if (!strong) throw new Error('ADMIN_PASSWORD debe tener minimo 12 caracteres e incluir mayuscula, minuscula, numero y simbolo.');
}

// Franquicias (usadas como "marca" del producto en el modelo Prisma)
const brandNames = [
  'Dragon Ball',
  'Naruto',
  'One Piece',
  'Demon Slayer',
  'Caballeros del Zodiaco',
  'Marvel',
  'DC',
  'Star Wars',
  'Harry Potter',
  'Disney',
  'Stranger Things',
  'Simpsons',
  'Looney Tunes',
  'Toy Story',
  'Minecraft',
  'League of Legends',
  'Deportes',
  'Especiales',
];

// Lineas de producto oficiales del manual de marca (CF-02 Que vende).
// Estas son las categorias "top-level" que se navegan en el sitio.
const categoryNames = [
  'Minifiguras únicas',
  'Cuadros personalizados',
  'Llaveros',
  'Funkos & Sets',
];

// El campo `category` de cada ProductSeed puede seguir usando la presentacion granular
// heredada (Figura individual, Set x4, Llavero armable...); este mapa la traduce a la
// linea de producto oficial. Si el valor ya es una de las 4 lineas, se usa tal cual.
const PRESENTATION_TO_LINE: Record<string, string> = {
  'Figura individual': 'Minifiguras únicas',
  'Bloques sueltos': 'Minifiguras únicas',
  'Decoracion de pared': 'Minifiguras únicas',
  'Ediciones especiales': 'Minifiguras únicas',
  'Set x2': 'Funkos & Sets',
  'Set x4': 'Funkos & Sets',
  'Llavero armable': 'Llaveros',
};

function placeholderImage(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;
}

function buildSpecifications(p: ProductSeed, lineName: string): Record<string, string> {
  if (lineName === 'Cuadros personalizados') {
    return {
      material: 'Impresion de alta calidad + marco de madera',
      medida: p.presentation,
      personalizacion: 'Tu eliges los personajes: cuentanoslo en las notas de tu pedido al finalizar la compra.',
    };
  }
  if (lineName === 'Funkos & Sets') {
    return {
      material: 'Vinilo estilo coleccion / set tematico',
      piezas: p.pieces ? `${p.pieces} piezas aprox.` : 'Pieza de coleccion, lista para exhibir',
      recomendacion: 'Ideal para vitrina o regalo de coleccionista.',
    };
  }
  return {
    material: 'Bloques plasticos ABS compatibles con bloques tipo LEGO',
    piezas: p.pieces ? `${p.pieces} piezas aprox.` : 'Piezas por confirmar',
    recomendacion: 'Recomendado para mayores de 6 anos. Contiene piezas pequenas.',
  };
}

type ProductSeed = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  character?: string;
  presentation: string;
  pieces?: number;
  price: number;
  previousPrice?: number;
  isLimitedEdition?: boolean;
  isFeatured?: boolean;
  description: string;
  stock: number;
};

const products: ProductSeed[] = [
  // Dragon Ball
  { sku: 'DBZ-GOKU-001', name: 'Figura armable Goku Super Saiyan', brand: 'Dragon Ball', category: 'Figura individual', character: 'Goku', presentation: 'Figura individual 8cm', pieces: 118, price: 16000, previousPrice: 19000, isFeatured: true, description: 'Arma tu propio Goku Super Saiyan estilo bloques, compatible con otras marcas de bloques. Ideal para coleccionar y regalar.', stock: 25 },
  { sku: 'DBZ-VEGETA-001', name: 'Figura armable Vegeta', brand: 'Dragon Ball', category: 'Figura individual', character: 'Vegeta', presentation: 'Figura individual 8cm', pieces: 121, price: 16000, previousPrice: 18000, description: 'El principe de los Saiyans en version armable, compatible con bloques tipo LEGO.', stock: 22 },
  { sku: 'DBZ-SET-001', name: 'Set x4 Guerreros Z', brand: 'Dragon Ball', category: 'Set x4', character: 'Goku, Vegeta, Piccolo, Gohan', presentation: 'Set x4', pieces: 460, price: 58000, previousPrice: 68000, isFeatured: true, isLimitedEdition: true, description: 'Completa tu coleccion con los 4 guerreros mas icónicos de Dragon Ball en un solo set.', stock: 10 },
  // Naruto
  { sku: 'NRT-NARUTO-001', name: 'Figura armable Naruto Uzumaki', brand: 'Naruto', category: 'Figura individual', character: 'Naruto Uzumaki', presentation: 'Figura individual 8cm', pieces: 115, price: 15000, previousPrice: 17000, isFeatured: true, description: 'Naruto modo Sabio armable, pieza a pieza como un verdadero coleccionable estilo bloques.', stock: 30 },
  { sku: 'NRT-SASUKE-001', name: 'Figura armable Sasuke Uchiha', brand: 'Naruto', category: 'Figura individual', character: 'Sasuke Uchiha', presentation: 'Figura individual 8cm', pieces: 117, price: 15000, description: 'Sasuke Uchiha en su version Susanoo, ideal para fans de la Hoja Oculta.', stock: 18 },
  { sku: 'NRT-KEY-001', name: 'Llavero armable Kakashi Hatake', brand: 'Naruto', category: 'Llavero armable', character: 'Kakashi Hatake', presentation: 'Llavero armable', pieces: 45, price: 12000, description: 'Llavero armable del Ninja Copia, perfecto para mochilas y morrales.', stock: 40 },
  // One Piece
  { sku: 'OP-LUFFY-001', name: 'Figura armable Monkey D. Luffy', brand: 'One Piece', category: 'Figura individual', character: 'Monkey D. Luffy', presentation: 'Figura individual 8cm', pieces: 122, price: 16000, previousPrice: 18000, isFeatured: true, description: 'El futuro Rey de los Piratas en version armable estilo bloques.', stock: 28 },
  { sku: 'OP-ZORO-001', name: 'Figura armable Roronoa Zoro', brand: 'One Piece', category: 'Figura individual', character: 'Roronoa Zoro', presentation: 'Figura individual 8cm', pieces: 119, price: 16000, description: 'El espadachin de los Sombreros de Paja, listo para tu coleccion.', stock: 20 },
  { sku: 'OP-SET-001', name: 'Set x4 Tripulacion Sombrero de Paja', brand: 'One Piece', category: 'Set x4', character: 'Luffy, Zoro, Nami, Sanji', presentation: 'Set x4', pieces: 470, price: 62000, previousPrice: 70000, isLimitedEdition: true, description: 'Set coleccionable con 4 miembros de la tripulacion mas famosa de los mares.', stock: 8 },
  // Demon Slayer
  { sku: 'DS-TANJIRO-001', name: 'Figura armable Tanjiro Kamado', brand: 'Demon Slayer', category: 'Figura individual', character: 'Tanjiro Kamado', presentation: 'Figura individual 8cm', pieces: 116, price: 16000, previousPrice: 18000, isFeatured: true, description: 'Tanjiro con su uniforme de cazador de demonios, en version armable.', stock: 24 },
  { sku: 'DS-NEZUKO-001', name: 'Figura armable Nezuko Kamado', brand: 'Demon Slayer', category: 'Figura individual', character: 'Nezuko Kamado', presentation: 'Figura individual 8cm', pieces: 110, price: 16000, description: 'Nezuko con su caja de bambu, ideal para completar tu set de Demon Slayer.', stock: 21 },
  // Caballeros del Zodiaco
  { sku: 'CDZ-ALDEBARAN-001', name: 'Figura armable Aldebaran de Tauro', brand: 'Caballeros del Zodiaco', category: 'Figura individual', character: 'Aldebaran de Tauro', presentation: 'Figura individual 8cm', pieces: 125, price: 16000, description: 'El Caballero de Oro de Tauro en version armable estilo bloques.', stock: 15 },
  { sku: 'CDZ-SEIYA-001', name: 'Figura armable Seiya de Pegaso', brand: 'Caballeros del Zodiaco', category: 'Figura individual', character: 'Seiya de Pegaso', presentation: 'Figura individual 8cm', pieces: 120, price: 16000, description: 'El protagonista de Saint Seiya listo para armar y coleccionar.', stock: 17 },
  // Marvel
  { sku: 'MRV-SPIDERMAN-001', name: 'Figura armable Spider-Man', brand: 'Marvel', category: 'Figura individual', character: 'Spider-Man', presentation: 'Figura individual 8cm', pieces: 130, price: 16000, previousPrice: 19000, isFeatured: true, description: 'El Trepamuros en version armable, compatible con bloques tipo LEGO.', stock: 35 },
  { sku: 'MRV-IRONMAN-001', name: 'Figura armable Iron Man', brand: 'Marvel', category: 'Figura individual', character: 'Iron Man', presentation: 'Figura individual 8cm', pieces: 128, price: 16000, description: 'Tony Stark con su armadura mas icónica, listo para armar.', stock: 26 },
  { sku: 'MRV-SET-001', name: 'Set x4 Vengadores', brand: 'Marvel', category: 'Set x4', character: 'Iron Man, Spider-Man, Thor, Capitan America', presentation: 'Set x4', pieces: 510, price: 64000, previousPrice: 72000, isFeatured: true, isLimitedEdition: true, description: 'Completa tu equipo de superheroes con este set x4 de los Vengadores.', stock: 9 },
  { sku: 'MRV-KEY-001', name: 'Llavero armable Deadpool', brand: 'Marvel', category: 'Llavero armable', character: 'Deadpool', presentation: 'Llavero armable', pieces: 48, price: 12000, description: 'El mercenario bocazas en un llavero armable perfecto para tu maleta.', stock: 38 },
  // DC
  { sku: 'DC-BATMAN-001', name: 'Figura armable Batman', brand: 'DC', category: 'Figura individual', character: 'Batman', presentation: 'Figura individual 8cm', pieces: 132, price: 16000, previousPrice: 19000, isFeatured: true, description: 'El Caballero de la Noche en version armable, con capa incluida.', stock: 27 },
  { sku: 'DC-JOKER-001', name: 'Figura armable Joker', brand: 'DC', category: 'Figura individual', character: 'Joker', presentation: 'Figura individual 8cm', pieces: 118, price: 16000, isLimitedEdition: true, description: 'El villano mas icónico de Gotham, edicion limitada armable.', stock: 12 },
  { sku: 'DC-SUPERMAN-001', name: 'Figura armable Superman', brand: 'DC', category: 'Figura individual', character: 'Superman', presentation: 'Figura individual 8cm', pieces: 129, price: 16000, description: 'El Hombre de Acero en version armable estilo bloques.', stock: 19 },
  // Star Wars
  { sku: 'SW-ANAKIN-001', name: 'Figura armable Anakin Skywalker', brand: 'Star Wars', category: 'Figura individual', character: 'Anakin Skywalker', presentation: 'Figura individual 8cm', pieces: 124, price: 16000, description: 'Anakin Skywalker con su sable de luz, version armable coleccionable.', stock: 20 },
  { sku: 'SW-AHSOKA-001', name: 'Figura armable Ahsoka Tano', brand: 'Star Wars', category: 'Figura individual', character: 'Ahsoka Tano', presentation: 'Figura individual 8cm', pieces: 120, price: 16000, previousPrice: 18000, isFeatured: true, description: 'La Padawan mas querida de la saga en version armable estilo bloques.', stock: 23 },
  { sku: 'SW-CLONE-001', name: 'Figura armable Clone Trooper', brand: 'Star Wars', category: 'Figura individual', character: 'Clone Trooper', presentation: 'Figura individual 8cm', pieces: 116, price: 15000, description: 'Soldado clon de la Republica, ideal para armar tu propio ejercito.', stock: 30 },
  { sku: 'SW-DECOR-001', name: 'Wall art Star Wars Sable de Luz', brand: 'Star Wars', category: 'Decoracion de pared', character: 'Star Wars', presentation: 'Decoracion de pared', pieces: 210, price: 32000, previousPrice: 38000, description: 'Decoracion armable de pared con diseno de sable de luz para tu cuarto o escritorio.', stock: 11 },
  // Harry Potter
  { sku: 'HP-HARRY-001', name: 'Figura armable Harry Potter', brand: 'Harry Potter', category: 'Figura individual', character: 'Harry Potter', presentation: 'Figura individual 8cm', pieces: 114, price: 15000, previousPrice: 17000, isFeatured: true, description: 'Harry Potter con su varita y tunica de Hogwarts, version armable.', stock: 24 },
  { sku: 'HP-HERMIONE-001', name: 'Figura armable Hermione Granger', brand: 'Harry Potter', category: 'Figura individual', character: 'Hermione Granger', presentation: 'Figura individual 8cm', pieces: 113, price: 15000, description: 'La bruja mas brillante de su generacion, lista para armar.', stock: 22 },
  // Disney
  { sku: 'DIS-WOODY-001', name: 'Figura armable Woody', brand: 'Disney', category: 'Figura individual', character: 'Woody', presentation: 'Figura individual 8cm', pieces: 108, price: 15000, description: 'El vaquero favorito de Andy en version armable estilo bloques.', stock: 18 },
  { sku: 'DIS-BUZZ-001', name: 'Figura armable Buzz Lightyear', brand: 'Toy Story', category: 'Figura individual', character: 'Buzz Lightyear', presentation: 'Figura individual 8cm', pieces: 112, price: 15000, previousPrice: 17000, description: 'Al infinito y mas alla con esta figura armable de Buzz Lightyear.', stock: 20 },
  { sku: 'DIS-SET-001', name: 'Set x2 Toy Story', brand: 'Toy Story', category: 'Set x2', character: 'Woody, Buzz Lightyear', presentation: 'Set x2', pieces: 220, price: 39000, previousPrice: 45000, isFeatured: true, description: 'Woody y Buzz Lightyear juntos en este set armable x2, ideal para regalo.', stock: 14 },
  // Stranger Things
  { sku: 'ST-ELEVEN-001', name: 'Figura armable Eleven', brand: 'Stranger Things', category: 'Figura individual', character: 'Eleven', presentation: 'Figura individual 8cm', pieces: 111, price: 15000, description: 'Eleven con su icónica sudadera y nariz sangrante, version armable.', stock: 16 },
  { sku: 'ST-DEMOGORGON-001', name: 'Figura armable Demogorgon', brand: 'Stranger Things', category: 'Figura individual', character: 'Demogorgon', presentation: 'Figura individual 8cm', pieces: 126, price: 16000, isLimitedEdition: true, description: 'La criatura del Mundo del Reves en version armable, edicion limitada.', stock: 9 },
  // Simpsons / Looney Tunes
  { sku: 'SIMP-HOMERO-001', name: 'Figura armable Homero Simpson', brand: 'Simpsons', category: 'Figura individual', character: 'Homero Simpson', presentation: 'Figura individual 8cm', pieces: 105, price: 15000, previousPrice: 17000, isFeatured: true, description: 'El padre de familia mas famoso de Springfield en version armable.', stock: 26 },
  { sku: 'SIMP-BART-001', name: 'Figura armable Bart Simpson', brand: 'Simpsons', category: 'Figura individual', character: 'Bart Simpson', presentation: 'Figura individual 8cm', pieces: 100, price: 15000, description: 'El hijo mas travieso de Springfield, listo para armar.', stock: 19 },
  { sku: 'LT-BUGS-001', name: 'Figura armable Bugs Bunny', brand: 'Looney Tunes', category: 'Figura individual', character: 'Bugs Bunny', presentation: 'Figura individual 8cm', pieces: 98, price: 15000, description: 'El conejo mas astuto de las caricaturas en version armable.', stock: 21 },
  { sku: 'LT-PATOLUCAS-001', name: 'Figura armable Pato Lucas', brand: 'Looney Tunes', category: 'Figura individual', character: 'Pato Lucas', presentation: 'Figura individual 8cm', pieces: 96, price: 15000, description: 'El pato mas gruñon de Looney Tunes en version armable estilo bloques.', stock: 17 },
  // Minecraft / LoL / Gaming
  { sku: 'MC-STEVE-001', name: 'Figura armable Steve', brand: 'Minecraft', category: 'Figura individual', character: 'Steve', presentation: 'Figura individual 8cm', pieces: 140, price: 16000, previousPrice: 18000, isFeatured: true, description: 'Steve de Minecraft en version armable con bloques cubicos característicos.', stock: 30 },
  { sku: 'MC-CREEPER-001', name: 'Figura armable Creeper', brand: 'Minecraft', category: 'Figura individual', character: 'Creeper', presentation: 'Figura individual 8cm', pieces: 95, price: 15000, description: 'El enemigo mas temido de Minecraft, ahora en version armable.', stock: 28 },
  { sku: 'LOL-JINX-001', name: 'Figura armable Jinx', brand: 'League of Legends', category: 'Figura individual', character: 'Jinx', presentation: 'Figura individual 8cm', pieces: 127, price: 16000, previousPrice: 18500, isFeatured: true, description: 'Jinx de League of Legends y Arcane en version armable coleccionable.', stock: 24 },
  { sku: 'LOL-YASUO-001', name: 'Figura armable Yasuo', brand: 'League of Legends', category: 'Figura individual', character: 'Yasuo', presentation: 'Figura individual 8cm', pieces: 122, price: 16000, description: 'El espadachin sin maestro de Runaterra, version armable.', stock: 18 },
  // Deportes
  { sku: 'DEP-FUTBOL-001', name: 'Figura armable Jugador de Futbol', brand: 'Deportes', category: 'Figura individual', character: 'Jugador de futbol', presentation: 'Figura individual 8cm', pieces: 105, price: 15000, description: 'Figura armable de jugador de futbol, personalizable con distintos uniformes.', stock: 22 },
  { sku: 'DEP-BASKET-001', name: 'Figura armable Jugador de Basketball', brand: 'Deportes', category: 'Figura individual', character: 'Jugador de basketball', presentation: 'Figura individual 8cm', pieces: 103, price: 15000, description: 'Ideal para los amantes del basketball, en version armable estilo bloques.', stock: 20 },
  { sku: 'DEP-WWE-001', name: 'Figura armable John Cena', brand: 'Deportes', category: 'Figura individual', character: 'John Cena', presentation: 'Figura individual 8cm', pieces: 130, price: 16000, previousPrice: 18000, description: 'La superestrella de WWE en version armable, lista para el ring.', stock: 15 },
  // Especiales / Temporada
  { sku: 'ESP-PENNYWISE-001', name: 'Figura armable Pennywise', brand: 'Especiales', category: 'Ediciones especiales', character: 'Pennywise', presentation: 'Figura individual 8cm', pieces: 118, price: 17000, previousPrice: 20000, isLimitedEdition: true, isFeatured: true, description: 'El payaso mas terrorifico para Halloween, edicion limitada armable.', stock: 10 },
  { sku: 'ESP-SANTA-001', name: 'Figura armable Santa Claus', brand: 'Especiales', category: 'Ediciones especiales', character: 'Santa Claus', presentation: 'Figura individual 8cm', pieces: 120, price: 17000, isLimitedEdition: true, description: 'Santa Claus armable, ideal para regalar y decorar en Navidad.', stock: 20 },
  { sku: 'ESP-BLOQUES-001', name: 'Bolsa de bloques sueltos surtidos', brand: 'Especiales', category: 'Bloques sueltos', presentation: 'Bloques sueltos', pieces: 300, price: 25000, description: 'Bolsa con bloques sueltos surtidos compatibles con la mayoria de marcas, para reponer piezas o crear tus propios disenos.', stock: 30 },
  { sku: 'ESP-DECOR-001', name: 'Wall art armable Personajes Mix', brand: 'Especiales', category: 'Decoracion de pared', presentation: 'Decoracion de pared', pieces: 250, price: 35000, previousPrice: 40000, description: 'Decoracion armable de pared con mosaico de personajes populares, ideal para cuartos gamer o fans.', stock: 12 },
  { sku: 'ESP-KEY-002', name: 'Llavero armable Minecraft Espada', brand: 'Minecraft', category: 'Llavero armable', character: 'Espada de diamante', presentation: 'Llavero armable', pieces: 40, price: 12000, description: 'Llavero armable con forma de espada de diamante de Minecraft.', stock: 35 },

  // ---- Linea B: Cuadros personalizados (el emocional, ticket mas alto, regalo estrella) ----
  // El cliente elige los personajes al hacer su pedido; se invita a escribirlo en las notas del pedido en el checkout.
  { sku: 'CUA-30X40-1P', name: 'Cuadro personalizado 30x40 — 1 personaje', brand: 'Especiales', category: 'Cuadros personalizados', presentation: 'Cuadro enmarcado 30x40 cm · 1 personaje', price: 65000, isFeatured: true, description: 'Un cuadro enmarcado con tu personaje favorito, elegido por ti. Cuentanos en las notas del pedido que personaje (o personajes) quieres y de que franquicia, y lo armamos para ti. Ideal para regalar o para tu propia repisa.', stock: 20 },
  { sku: 'CUA-30X40-2P', name: 'Cuadro personalizado 30x40 — 2 personajes', brand: 'Especiales', category: 'Cuadros personalizados', presentation: 'Cuadro enmarcado 30x40 cm · 2 personajes', price: 85000, description: 'Dos personajes que tu elijas, juntos en un mismo cuadro enmarcado. Perfecto para parejas de fans, hermanos o para celebrar dos fandoms en una sola pieza. Indicanos los personajes en las notas del pedido.', stock: 15 },
  { sku: 'CUA-40X60-1P', name: 'Cuadro personalizado 40x60 — 1 personaje', brand: 'Especiales', category: 'Cuadros personalizados', presentation: 'Cuadro enmarcado 40x60 cm · 1 personaje', price: 95000, isFeatured: true, description: 'Version grande de nuestro cuadro personalizado, con el personaje que tu elijas en alta definicion. El regalo que nadie mas va a dar. Cuentanos que personaje quieres en las notas del pedido.', stock: 12 },
  { sku: 'CUA-40X60-GRUPO', name: 'Cuadro personalizado 40x60 — grupo (hasta 4 personajes)', brand: 'Especiales', category: 'Cuadros personalizados', presentation: 'Cuadro enmarcado 40x60 cm · grupo hasta 4 personajes', price: 130000, description: 'Reune hasta 4 personajes favoritos en un solo cuadro: tu equipo, tu familia de fandoms o tus sagas favoritas juntas. Escribenos en las notas del pedido cuales personajes quieres incluir.', stock: 10 },
  { sku: 'CUA-50X70-GRUPO', name: 'Cuadro personalizado 50x70 — grupo', brand: 'Especiales', category: 'Cuadros personalizados', presentation: 'Cuadro enmarcado 50x70 cm · grupo', price: 150000, isLimitedEdition: true, description: 'Nuestro formato mas grande, pensado para ser la pieza central de una sala o una oficina gamer. Personalizalo por completo: cuentanos los personajes que quieres en las notas de tu pedido.', stock: 6 },

  // ---- Linea C: Llaveros (el complemento, add-on de bolsillo) ----
  { sku: 'LLA-GOKU-001', name: 'Llavero armable Goku', brand: 'Dragon Ball', category: 'Llavero armable', character: 'Goku', presentation: 'Llavero armable', pieces: 42, price: 12000, description: 'Lleva a Goku contigo a todos lados: llavero armable ideal para mochila, morral o las llaves de casa.', stock: 30 },
  { sku: 'LLA-BATMAN-001', name: 'Llavero armable Batman', brand: 'DC', category: 'Llavero armable', character: 'Batman', presentation: 'Llavero armable', pieces: 44, price: 13000, description: 'El Caballero de la Noche en formato llavero armable, perfecto para sumar a tu pedido o para regalar.', stock: 28 },
  { sku: 'LLA-GROGU-001', name: 'Llavero armable Grogu', brand: 'Star Wars', category: 'Llavero armable', character: 'Grogu', presentation: 'Llavero armable', pieces: 40, price: 13000, isFeatured: true, description: 'El favorito de la galaxia en version llavero armable. Un pequeno gran detalle para sumar a cualquier pedido.', stock: 32 },

  // ---- Linea D: Funkos & Sets (el clasico, ticket de coleccion) ----
  { sku: 'FNK-GROGU-001', name: 'Funko Pop style Grogu', brand: 'Star Wars', category: 'Funkos & Sets', character: 'Grogu', presentation: 'Funko Pop style · pieza de coleccion', price: 39000, previousPrice: 45000, isFeatured: true, description: 'Grogu en formato Funko Pop style, listo para exhibir en tu escritorio o vitrina. Para el fan que ya sabe que quiere en su coleccion.', stock: 18 },
  { sku: 'FNK-NARUTO-001', name: 'Funko Pop style Naruto Modo Sabio', brand: 'Naruto', category: 'Funkos & Sets', character: 'Naruto Uzumaki', presentation: 'Funko Pop style · pieza de coleccion', price: 42000, description: 'Naruto en su version Modo Sabio, en formato Funko Pop style para coleccionistas exigentes.', stock: 14 },
];

const reviewSeeds = [
  { character: 'Goku', name: 'Camila Rodriguez', city: 'Bogota', rating: 5, title: 'Excelente calidad', comment: 'La figura de Goku quedo perfecta, las piezas encajan muy bien y llego rapido a Bogota.' },
  { character: 'Spider-Man', name: 'Juan Pablo Diaz', city: 'Medellin', rating: 5, title: 'Mi hijo quedo feliz', comment: 'Compramos a Spider-Man de regalo de cumpleanos y quedo encantado armandolo con nosotros.' },
  { character: 'Naruto', name: 'Valentina Gomez', city: 'Cali', rating: 4, title: 'Muy buena', comment: 'Naruto se ve genial en el escritorio, solo una pieza costo un poco de encajar pero nada grave.' },
  { character: 'Batman', name: 'Andres Felipe Torres', city: 'Barranquilla', rating: 5, title: 'Coleccionista feliz', comment: 'Ya tengo 5 figuras de CollectorFigu, todas con excelente acabado y precio muy accesible.' },
  { character: 'Jinx', name: 'Laura Martinez', city: 'Bucaramanga', rating: 5, title: 'Amo Arcane', comment: 'Jinx quedo hermosa, la compre por Instagram y el envio a Bucaramanga fue rapido.' },
  { character: 'Harry Potter', name: 'Santiago Perez', city: 'Bogota', rating: 4, title: 'Buen detalle', comment: 'Harry Potter tiene muy buen detalle para el tamano, ideal para coleccionar toda la saga.' },
];

async function seedBaseCatalog() {
  const adminRole = await prisma.role.upsert({ where: { name: RoleName.ADMIN }, update: {}, create: { name: RoleName.ADMIN, description: 'Administrador' } });
  const customerRole = await prisma.role.upsert({ where: { name: RoleName.CUSTOMER }, update: {}, create: { name: RoleName.CUSTOMER, description: 'Cliente' } });

  for (const name of brandNames) {
    await prisma.brand.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
  }

  for (const name of categoryNames) {
    await prisma.category.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
  }

  return { adminRole, customerRole };
}

async function seedProductionAdmin(adminRoleId: string) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const firstName = process.env.ADMIN_FIRST_NAME?.trim();
  const lastName = process.env.ADMIN_LAST_NAME?.trim();

  if (!email || !password || !firstName || !lastName) {
    console.log('Seed produccion: roles, marcas y categorias creadas. Admin omitido porque faltan variables ADMIN_*.');
    return;
  }

  assertStrongProductionPassword(password);
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
  const admin = await prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, passwordHash, isActive: true },
    create: {
      email,
      passwordHash,
      firstName,
      lastName,
      roles: { create: [{ roleId: adminRoleId }] },
    },
  });
  console.log(`Seed produccion: admin listo (${admin.email}).`);
}

async function seedDevelopmentDemo(adminRoleId: string, customerRoleId: string) {
  const adminHash = await bcrypt.hash('Admin123*', 12);
  const customerHash = await bcrypt.hash('Cliente123*', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@collectorfigu.test' },
    update: {},
    create: { email: 'admin@collectorfigu.test', passwordHash: adminHash, firstName: 'Admin', lastName: 'CollectorFigu', roles: { create: [{ roleId: adminRoleId }] } },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'cliente@collectorfigu.test' },
    update: {},
    create: { email: 'cliente@collectorfigu.test', passwordHash: customerHash, firstName: 'Mateo', lastName: 'Cliente', phone: '3000000000', roles: { create: [{ roleId: customerRoleId }] }, customer: { create: { document: '1000000000' } } },
  });

  const brandsBySlug = new Map((await prisma.brand.findMany()).map((brand) => [brand.slug, brand]));
  const categoriesBySlug = new Map((await prisma.category.findMany()).map((category) => [category.slug, category]));

  const createdProducts: Array<{ id: string; character?: string | null }> = [];

  for (const p of products) {
    const lineName = PRESENTATION_TO_LINE[p.category] ?? p.category;
    const brand = brandsBySlug.get(slugify(p.brand));
    const category = categoriesBySlug.get(slugify(lineName));
    if (!brand || !category) continue;

    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        slug: slugify(p.name),
        name: p.name,
        brandId: brand.id,
        categoryId: category.id,
        character: p.character,
        presentation: p.presentation,
        pieces: p.pieces,
        isLimitedEdition: p.isLimitedEdition ?? false,
        description: p.description,
        specifications: buildSpecifications(p, lineName),
        price: p.price,
        previousPrice: p.previousPrice,
        status: ProductStatus.ACTIVE,
        isFeatured: p.isFeatured ?? false,
        inventory: { create: { stock: p.stock, lowStockThreshold: 3 } },
        images: {
          create: [
            { url: placeholderImage(p.sku), publicId: `demo/${p.sku.toLowerCase()}`, alt: p.name, isMain: true, sortOrder: 0 },
            { url: placeholderImage(`${p.sku}-2`), publicId: `demo/${p.sku.toLowerCase()}-2`, alt: p.name, isMain: false, sortOrder: 1 },
          ],
        },
      },
      include: { images: true },
    });
    createdProducts.push(created);
  }

  for (const review of reviewSeeds) {
    const product = createdProducts.find((entry) => entry.character?.toLowerCase().includes(review.character.toLowerCase()));
    if (!product) continue;
    await prisma.productReview.create({
      data: {
        productId: product.id,
        name: review.name,
        city: review.city,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        status: ReviewStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  console.log({ admin: admin.email, customer: customer.email, products: createdProducts.length, reviews: reviewSeeds.length });
}

async function main() {
  const { adminRole, customerRole } = await seedBaseCatalog();
  if (isProduction) {
    await seedProductionAdmin(adminRole.id);
    return;
  }
  await seedDevelopmentDemo(adminRole.id, customerRole.id);
}

main().finally(() => prisma.$disconnect());
