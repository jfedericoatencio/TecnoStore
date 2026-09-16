// Datos iniciales compartidos entre scripts/seed.mjs y el auto-seeder en producción

export const DEFAULT_SETTINGS = {
  business_name: 'Distribuidora Central',
  tagline:
    'Mayorista de alimentos y bebidas. Precios de bodega para comercios, bares, kioscos y particulares. Pedidos con entrega a domicilio.',
  whatsapp_phone: '5491123456789',
  address: 'Av. del Comercio 1234, San Martín, Buenos Aires',
  hours: 'Lunes a viernes de 8 a 18 h · Sábados de 8 a 13 h',
  min_order: '15000',
  bank_info:
    'Banco Nación · CBU 0110599930000001234567 · Alias DISTRIB.CENTRAL · Titular: Distribuidora Central SRL · CUIT 30-12345678-9',
  logo_url: '',
  hero_image_url: '/demo/hero.jpg',
};

export const CATEGORIES = ['Gaseosas', 'Aguas', 'Jugos', 'Lácteos', 'Almacén', 'Snacks', 'Limpieza'];

export const PRODUCTS = [
  ['Gaseosa Cola 2.25 L', 'Gaseosa sabor cola en botella descartable de 2.25 litros.', 'Gaseosas', 1850, 1590, 40, 'Caja x6', 'GA-001', 1, 1, '/demo/gaseosa-cola-225.jpg'],
  ['Gaseosa Lima-Limón 1.5 L', 'Gaseosa sabor lima-limón en botella descartable de 1.5 litros.', 'Gaseosas', 1390, null, 60, 'Pack x6', 'GA-002', 0, 1, '/demo/gaseosa-lima-limon.jpg'],
  ['Agua Mineral sin Gas 2 L', 'Agua mineral sin gas, botella descartable de 2 litros.', 'Aguas', 950, null, 120, 'Pack x8', 'AG-001', 0, 1, '/demo/agua-sin-gas.jpg'],
  ['Agua Mineral con Gas 2 L', 'Agua mineral gasificada, botella descartable de 2 litros.', 'Aguas', 1050, null, 80, 'Pack x8', 'AG-002', 0, 1, '/demo/agua-con-gas.jpg'],
  ['Jugo de Naranja 1 L', 'Jugo de naranja listopara beber, botella de 1 litro.', 'Jugos', 1250, 999, 35, 'Caja x12', 'JU-001', 1, 1, '/demo/jugo-naranja.jpg'],
  ['Jugo de Manzana 1 L', 'Jugo de manzana claro, botella de 1 litro.', 'Jugos', 1300, null, 28, 'Caja x12', 'JU-002', 0, 1, '/demo/jugo-manzana.jpg'],
  ['Leche Entera 1 L', 'Leche entera pasteurizada, sachet de 1 litro.', 'Lácteos', 1180, null, 90, 'Pack x6', 'LA-001', 1, 1, '/demo/leche.jpg'],
  ['Yogur Vainilla 1 kg', 'Yogur batido sabor vainilla, pote de 1 kilo.', 'Lácteos', 1980, null, 4, 'Unidad', 'LA-002', 0, 1, '/demo/yogur.jpg'],
  ['Arroz Blanco 1 kg', 'Arroz blanco doble ceraus, paquete de 1 kilo.', 'Almacén', 980, 850, 150, 'Bolsa x10', 'AL-001', 1, 1, '/demo/arroz.jpg'],
  ['Fideos Spaghetti 500 g', 'Fideos secos de sémola, formato spaghetti, 500 gramos.', 'Almacén', 720, null, 200, 'Bolsa x20', 'AL-002', 0, 1, '/demo/fideos.jpg'],
  ['Aceite de Girasol 900 ml', 'Aceite de girasol refinado, botella de 900 mililitros.', 'Almacén', 1450, null, 70, 'Caja x12', 'AL-003', 1, 1, '/demo/aceite.jpg'],
  ['Papas Fritas 150 g', 'Snack de papas fritas ultracongeladas al aire, paquete de 150 gramos.', 'Snacks', 1100, 890, 45, 'Caja x14', 'SN-001', 1, 1, '/demo/papas.jpg'],
  ['Maní Salado 250 g', 'Maní tostado y salado, paquete de 250 gramos.', 'Snacks', 1500, null, 0, 'Caja x10', 'SN-002', 0, 1, '/demo/mani.jpg'],
  ['Detergente Líquido 750 ml', 'Detergente líquido para ropa, botella de 750 mililitros.', 'Limpieza', 1750, null, 55, 'Pack x6', 'LI-001', 0, 1, '/demo/detergente.jpg'],
  ['Lavandina 1 L', 'Agua lavandina concentrada, botella de 1 litro.', 'Limpieza', 890, null, 3, 'Pack x12', 'LI-002', 0, 1, '/demo/lavandina.jpg'],
];
