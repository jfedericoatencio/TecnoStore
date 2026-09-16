// TIENDA — Server Component: lee la base de datos en cada
// request, así los cambios del panel se reflejan al instante.
import { qAll } from '@/db';
import { getSettingsMap, publicSettings } from '@/lib/settings';
import { mapProduct } from '@/lib/products';
import type { Category, Product } from '@/lib/types';
import StoreView from '@/components/store/StoreView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const productRows = await qAll(`
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.available = 1
    ORDER BY p.featured DESC, p.name ASC
  `);
  const products: Product[] = productRows.map(mapProduct);

  const categories = (await qAll(`
    SELECT c.id, c.name, c.sort_order,
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.available = 1) AS product_count
    FROM categories c
    ORDER BY c.sort_order, c.name
  `)) as unknown as Category[];

  const settings = publicSettings(await getSettingsMap());

  return <StoreView products={products} categories={categories} settings={settings} />;
}
