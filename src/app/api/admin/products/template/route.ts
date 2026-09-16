// GET /api/admin/products/template — plantilla .xlsx descargable
import * as XLSX from 'xlsx';
import { requireAdmin } from '@/lib/auth';
import { IMPORT_COLUMNS } from '@/lib/import';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const sample = [
    ['Gaseosa Cola 2.25 L', 'Gaseosa sabor cola botella 2.25 L', 'Gaseosas', 1850, 1600, 24, 'Caja x6', 'GA-001', 'si', 'si', ''],
    ['Agua Mineral 2 L', 'Agua mineral sin gas', 'Aguas', 950, '', 48, 'Pack x8', 'AG-001', 'no', 'si', ''],
    ['Jugo de Naranja 1 L', 'Jugo listo para beber', 'Jugos', 1250, 999, 30, 'Caja x12', 'JU-001', 'si', 'si', ''],
  ];

  const help = [
    ['GUÍA DE LA PLANTILLA DE PRODUCTOS'],
    [''],
    ['Columna', 'Qué va', 'Ejemplo / valores aceptados'],
    ['nombre', 'Nombre del producto (obligatorio)', 'Gaseosa Cola 2.25 L'],
    ['descripcion', 'Detalle del producto (opcional)', 'Botella descartable'],
    ['categoria', 'Nombre de la categoría', 'Gaseosas, Aguas, Jugos… Si no existe podés crearla al confirmar'],
    ['precio', 'Precio de venta en números (obligatorio)', '1850 o 1850.50'],
    ['precio_promocional', 'Precio de oferta, MENOR al precio (opcional)', '1600'],
    ['stock', 'Cantidad disponible (número entero)', '24'],
    ['unidad', 'Unidad de venta', 'Unidad, Pack x6, Caja x24, Bolsa x10…'],
    ['sku', 'Código interno del producto (opcional)', 'GA-001'],
    ['destacado', '¿Aparece destacado?', 'si / no'],
    ['disponible', '¿Se puede comprar?', 'si / no'],
    ['url_imagen', 'Link de imagen o nombre de archivo si subís un ZIP de imágenes', 'https://… o foto.jpg'],
    [''],
    ['Nota: podés subir un ZIP con las imágenes junto al Excel.'],
    ['Si el nombre de archivo coincide con url_imagen, se asocia automáticamente.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS as unknown as string[], ...sample]);
  ws['!cols'] = IMPORT_COLUMNS.map((c) => ({ wch: Math.max(12, c.length + 4) }));
  const wsHelp = XLSX.utils.aoa_to_sheet(help);
  wsHelp['!cols'] = [{ wch: 22 }, { wch: 46 }, { wch: 72 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Ayuda');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const body = new Uint8Array(buf);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla_productos.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
