# 🚚 Distribuidora Central

Aplicación web completa y responsive para una distribuidora mayorista de alimentos y bebidas, con **dos modos en el mismo sitio**:

1. **🛒 Tienda para clientes** — catálogo, buscador, filtros por categoría, ofertas, carrito de compras y pedidos por WhatsApp.
2. **🔐 Panel privado de administración** — dashboard, gestión de productos (individual y masiva por Excel), categorías, pedidos y configuración del negocio.

> **Demo local:** usuario `admin` · contraseña `Admin2026!` (pedide cambiarla al primer ingreso).
> El acceso al panel está discretamente en el pie de página: **"Administración"**.

---

## ✨ Funcionalidades

### Tienda (clientes)
- Encabezado con nombre del negocio, texto principal, horarios, dirección y botón **VER PRODUCTOS**.
- Buscador instantáneo (nombre, descripción y SKU) y **filtros por categoría** como chips: Todos, 🔥 Ofertas, Gaseosas, Aguas, Jugos, Lácteos, Almacén, Snacks, Limpieza…
- Sección destacada **🔥 OFERTAS** con precio anterior tachado y % de descuento.
- Tarjetas de producto con imagen, categoría, unidad de venta, estado de stock (**EN STOCK / POCO STOCK / SIN STOCK**), selector de cantidad y botón AGREGAR.
- Vista de detalle en modal (precio por unidad/pack/caja, descripción, SKU).
- **Carrito de compras** lateral con botón flotante siempre visible: agregar, quitar, aumentar/disminuir, vaciar, subtotal y total. Persiste aunque se recargue la página (localStorage).
- **Checkout** con nombre, teléfono, dirección, localidad, referencia, método de pago y observaciones.
- El pedido se **registra en la base de datos** (con verificación de stock y pedido mínimo del lado del servidor) y se abre **WhatsApp con el mensaje completo y emojis**.
- El número de WhatsApp sale de la configuración del panel — **nunca está hardcodeado**.
- Diseño **mobile-first**: carrito al alcance del pulgar, botones grandes, carga rápida.

### Panel (dueño)
- **Login seguro**: usuario + contraseña, verificación **bcrypt** contra la base de datos, sesión **JWT firmada** en cookie `httpOnly`, limitador de intentos por IP.
- **Cambio de contraseña obligatorio** al primer ingreso (flag `must_change_password` en la base) y opcional desde *Configuración*.
- **Dashboard**: productos totales / disponibles / sin stock / poco stock, categorías, pedidos del día, ventas del día, pedidos pendientes, últimos pedidos y alertas de stock bajo.
- **Productos**: alta manual con **foto subida desde celular o PC** (con previsualización), edición completa, precio promocional, stock, unidad de venta, SKU, destacado, disponible/oculto, eliminar con confirmación, filtros y búsqueda. Toggles rápidos de destacado y visibilidad.
- **Importación masiva desde Excel** (`.xlsx` o `.csv`):
  - Botón **IMPORTAR DESDE EXCEL** y **plantilla descargable** con hoja de ayuda.
  - Columnas: `nombre, descripcion, categoria, precio, precio_promocional, stock, unidad, sku, destacado, disponible, url_imagen`.
  - Acepta un **ZIP de imágenes** junto al Excel (asocia por nombre de archivo).
  - **Vista previa** con filas inválidas resaltadas en rojo (precio inválido, filas incompletas, promo mayor al precio…).
  - Categorías inexistentes: se pueden **crear automáticamente** o asignar a "Sin categoría".
  - Opción de **actualizar productos existentes por SKU**.
  - El archivo se parsea **100% del lado del servidor** (el cliente nunca carga la librería de Excel).
- **Categorías**: crear, renombrar y eliminar (los productos quedan "Sin categoría").
- **Pedidos**: listado con buscador y filtro por estado (Nuevo, Confirmado, Preparando, En camino, Entregado, Cancelado), detalle de ítems, datos del cliente, cambio de estado y botón de contacto por WhatsApp.
- **Configuración**: nombre del negocio, logo, imagen de portada, texto principal, WhatsApp, dirección, horarios, **pedido mínimo**, datos de transferencia y **cambio de contraseña** — todo editable sin tocar código.

---

## 🛠 Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 14** (App Router) + **TypeScript** |
| Estilos | **Tailwind CSS** |
| Base de datos | **SQLite** vía `node:sqlite` (Node ≥ 22.5) — estructura 1:1 portable a **PostgreSQL / Supabase** |
| Autenticación | bcryptjs + JWT (`jose`) en cookie `httpOnly` + middleware de borde |
| Excel/CSV | `xlsx` + `adm-zip` — **solo en el servidor** (API routes) |
| Imágenes | Subida con `FormData` a almacenamiento persistente (`UPLOAD_DIR`); reemplazable por **Supabase Storage** |

### Estructura
```
src/
├── app/
│   ├── page.tsx                  # TIENDA (Server Component → lee la BD en cada request)
│   ├── checkout/                 # Finalizar pedido
│   ├── admin/
│   │   ├── login/                # Login público
│   │   ├── cambiar-password/     # Cambio obligatorio (primer ingreso)
│   │   └── (panel)/              # Panel protegido: Dashboard, Productos,
│   │                             # Categorías, Pedidos, Configuración
│   └── api/
│       ├── products|categories|settings|orders   # Públicos
│       ├── uploads/[...path]                     # Imágenes subidas
│       └── admin/*                               # Protegidos por middleware + sesión
├── components/  # UI tienda + panel
├── db/          # Esquema y conexión
├── lib/         # auth, jwt, format, whatsapp, import, client
└── middleware.ts  # 🔒 Bloquea /admin/* y /api/admin/* sin sesión válida
scripts/seed.mjs # Seed del servidor (admin hasheado + datos demo)
data/            # (gitignored) app.db + uploads/
```

### Base de datos
```
users (id, username, password_hash, must_change_password, …)
categories (id, name, sort_order)
products (id, name, description, category_id, price, promo_price,
          stock, unit, sku, featured, available, image_url, …)
orders (id, number, customer_name, phone, address, location, reference,
        payment_method, notes, total, status, created_at)
order_items (id, order_id, product_id, name, unit, price, quantity)
settings (key, value)
```

---

## 🚀 Puesta en marcha

```bash
# 1. Requisitos: Node.js 22.5 o superior
node -v

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env
#   → generá tu AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Crear la base + admin inicial + productos de prueba
npm run db:seed          # (o npm run db:reset para empezar de cero)

# 5. Desarrollo
npm run dev              # http://localhost:3000

# 6. Producción
npm run build && npm start
```

### Variables de entorno (`.env`)
| Variable | Descripción |
|---|---|
| `DATABASE_PATH` | Ruta del archivo SQLite (`data/app.db`) |
| `AUTH_SECRET` | **Secreto para firmar los JWT.** Obligatorio, nunca se sube al repo |
| `UPLOAD_DIR` | Carpeta de imágenes subidas (`data/uploads`) |
| `ADMIN_INITIAL_USER` | Usuario inicial del seed (`admin`) |
| `ADMIN_INITIAL_PASSWORD` | Contraseña inicial del seed (`Admin2026!`) — solo la usa el script del servidor |

> 🔐 **Seguridad**: la contraseña inicial vive solo en variables de entorno del servidor y se guarda **hasheada con bcrypt** en la base. No existe en ningún archivo del frontend. Al primer ingreso se exige el cambio de contraseña. Todas las rutas `/admin/*` y `/api/admin/*` se bloquean en el middleware **y** en cada endpoint (defensa en profundidad). Los clientes no pueden crear pedidos sobre productos sin stock ni saltarse el mínimo: todo se re-valida en el servidor.

---

## ☁️ Publicación

El proyecto es un Next.js estándar, listo para cualquier hosting compatible:

- **VPS / Railway / Render / Fly.io** (recomendado para esta versión): `npm run build && npm start` con Node 22+. La base SQLite y las imágenes persisten en disco (montá un volumen para `data/`).
- **Vercel + Supabase**: la capa de datos está aislada en `src/db` y el esquema es 1:1 con PostgreSQL. Para serverless, migrá esas funciones a Postgres/Supabase (`users`, `products`, `categories`, `orders`, `order_items`, `settings`), usá **Supabase Auth** o mantené el login JWT con bcrypt, y reemplazá `UPLOAD_DIR` por **Supabase Storage**. El resto de la aplicación (UI, API, middleware) no requiere cambios.

### Checklist antes de publicar
- [ ] `AUTH_SECRET` propio (48+ bytes aleatorios).
- [ ] `npm run db:seed` ejecutado en el servidor.
- [ ] Cambiar la contraseña inicial al primer login (es obligatorio).
- [ ] Configurar WhatsApp real y datos del negocio desde el panel.

---

## 📄 Licencia

MIT — uso libre para tu negocio.
