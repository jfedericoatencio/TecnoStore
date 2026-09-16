# 🚚 TecnoStore / Distribuidora Central

Aplicación web completa y responsive para una tienda mayorista y distribuidora de productos, preparada para producción en **Vercel** con base de datos **Supabase / PostgreSQL** y almacenamiento persistente en **Supabase Storage**.

Cuenta con **dos modos integrados en el mismo sitio**:

1. **🛒 Tienda pública para clientes** — catálogo con fotos, buscador instantáneo, filtros por categoría, promociones con % de descuento, carrito de compras persistente y confirmación de pedidos vía WhatsApp.
2. **🔐 Panel privado de administración (`/admin`)** — dashboard con métricas en tiempo real, gestión de productos (individual y masiva vía Excel con ZIP de imágenes), categorías, pedidos y configuración completa del negocio (teléfono, pedido mínimo, datos bancarios, etc.).

> **Credenciales iniciales:** usuario `admin` · contraseña `Admin2026!` (exige cambio de clave obligatorio al primer ingreso).
> Acceso al panel: enlace discreto en el pie de página o directamente en `/admin`.

---

## ✨ Funcionalidades

### 🛒 Tienda (Clientes)
- Encabezado con marca, horario de atención, dirección física y botón de acceso rápido al catálogo.
- Buscador instantáneo por nombre, descripción y SKU.
- Chips de filtrado rápido por categoría: Todos, 🔥 Ofertas, Gaseosas, Aguas, Jugos, Lácteos, Almacén, Snacks, Limpieza...
- Sección destacada con cálculo automático de porcentaje de descuento sobre precios promocionales.
- Tarjetas interactivas de producto con indicadores de stock en tiempo real (**EN STOCK / POCO STOCK / SIN STOCK**), selector de cantidad y vista modal detallada.
- Carrito lateral retráctil flotante con persistencia en `localStorage`.
- Formulario de checkout con validación de datos de cliente, validación de pedido mínimo y stock disponible en el servidor.
- Generación automática de número de pedido y redirección fluida a WhatsApp con el pedido desglosado y emojis.

### 🔐 Panel de Control (Administración)
- **Autenticación robusta**: Contraseñas hasheadas con `bcrypt`, cookies seguras `httpOnly`, tokens JWT firmados con `jose`, limitador de intentos por IP y middleware de protección de rutas.
- **Cambio de clave obligatorio**: Protege la instalación forzando el cambio de clave en el primer inicio de sesión.
- **Métricas del Dashboard**: Total de productos, productos con bajo stock, pedidos y facturación del día, últimos pedidos y alertas de reposición.
- **Gestión de catálogo**: Alta, edición y eliminación de productos con fotos subidas directamente a Supabase Storage (o disco local en desarrollo).
- **Importación masiva desde Excel**: Carga de archivos `.xlsx` o `.csv` junto a archivo `.zip` de fotografías, con validación previa en el servidor, vista previa de errores y creación automática de categorías faltantes.
- **Gestión de pedidos**: Historial completo con cambio de estados (*Nuevo, Confirmado, Preparando, En camino, Entregado, Cancelado*) y botón para responder al cliente por WhatsApp.
- **Configuración centralizada**: Modificación sin tocar código de nombre del negocio, teléfono de WhatsApp, horarios, dirección, pedido mínimo e información para transferencias bancarias.

---

## 🛠 Arquitectura y Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript |
| **Estilos** | Tailwind CSS + diseño mobile-first |
| **Base de datos (Producción)** | PostgreSQL / Supabase vía connection pooler |
| **Base de datos (Desarrollo)** | SQLite nativo (fallback automático sin configuración) |
| **Almacenamiento de imágenes** | Supabase Storage (CDN persistente) / disco local en dev |
| **Autenticación** | bcryptjs + JWT (`jose`) en cookies seguras httpOnly |
| **Importación Excel/ZIP** | `xlsx` + `adm-zip` procesados 100% del lado del servidor |

---

## 🚀 Despliegue en Vercel con Supabase

### 1. Configuración del proyecto en Supabase
1. Ingresá a [Supabase](https://supabase.com) y creá un proyecto nuevo (por ejemplo: `tecnostore`).
2. Obtené la cadena de conexión a la base de datos:
   - Andá a **Project Settings > Database**.
   - En **Connection string**, seleccioná **URI**.
   - Copiá la URL del **Transaction pooler** (puerto `6543`, modo transacción con `?pgbouncer=true`) o **Session pooler / Direct** (puerto `5432`). Reemplazá `[YOUR-PASSWORD]` por la contraseña de tu base de datos.
3. Obtené las claves de API:
   - Andá a **Project Settings > API**.
   - Copiá la **Project URL** (`SUPABASE_URL`).
   - Copiá la clave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`) o **anon** (`SUPABASE_ANON_KEY`).
4. *(Opcional)* En **Storage**, podés crear un bucket público llamado `uploads`. Si usás `SUPABASE_SERVICE_ROLE_KEY`, la aplicación lo creará automáticamente si aún no existe.

### 2. Configuración en Vercel
1. Importá el repositorio en [Vercel](https://vercel.com).
2. En la sección **Environment Variables**, agregá las siguientes variables:

| Variable | Valor / Descripción | Requerido |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión URI de Supabase PostgreSQL | **Sí** |
| `AUTH_SECRET` | Secreto aleatorio largo (ejecutá: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) | **Sí** |
| `SUPABASE_URL` | URL de tu proyecto Supabase (ej: `https://xyz.supabase.co`) | Para imágenes |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta service_role de Supabase (o `SUPABASE_ANON_KEY`) | Para imágenes |
| `SUPABASE_STORAGE_BUCKET` | `uploads` (nombre del bucket de imágenes) | Opcional (def: `uploads`) |
| `ADMIN_INITIAL_USER` | Usuario administrador inicial (por defecto `admin`) | Opcional |
| `ADMIN_INITIAL_PASSWORD` | Contraseña inicial (por defecto `Admin2026!`) | Opcional |

3. Hacé clic en **Deploy**.

> 💡 **Inicialización automática:** Al primer acceso a la URL pública de Vercel, la aplicación detectará la base de datos de Supabase, creará automáticamente todas las tablas necesarias y cargará la configuración inicial y el usuario administrador si la base está vacía.

---

## 💻 Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/jfedericoatencio/TecnoStore.git
cd TecnoStore

# 2. Instalar dependencias
npm install

# 3. Variables de entorno (opcional para desarrollo local; por defecto usa SQLite)
cp .env.example .env
# Generá un AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Sembrar datos locales de prueba
npm run db:seed

# 5. Iniciar servidor de desarrollo
npm run dev
# Abrir http://localhost:3000
```

---

## 🔒 Seguridad
- Todas las rutas `/admin/*` y `/api/admin/*` están protegidas tanto en el **Middleware (Edge)** como en cada **Route Handler (Server)**.
- Las contraseñas de administrador se almacenan exclusivamente como hashes `bcrypt` (10 rounds).
- Las sesiones utilizan JWT firmados con clave simétrica en cookies `httpOnly`, `sameSite: lax` y `secure` en producción.
- En el checkout, las cantidades y precios son recalculados y validados íntegramente del lado del servidor contra la base de datos dentro de transacciones atómicas.
