# Mis Deudas — PWA offline-first

App personal para controlar deudas (apps de préstamo, TDC, instituciones,
nómina, personas, pasajes), con almacenamiento local (SQLite via PowerSync)
que se sincroniza con Supabase cuando hay internet.

## 1. Requisitos

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cuenta gratuita en [Supabase](https://supabase.com)
- Cuenta gratuita en [PowerSync](https://www.powersync.com)

## 2. Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`.
   Esto crea las tablas, catálogos, RLS, el trigger de `plazo_pagado`
   y la publicación `powersync` necesaria para la replicación.
3. Ve a **Authentication > Users** y crea tu usuario manualmente
   (email + contraseña), ya que la app es de uso personal y no
   tiene registro público.
4. Ve a **Settings > API** y copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

## 3. Configurar PowerSync

1. Crea una instancia nueva en PowerSync Cloud, conectándola a tu
   proyecto de Supabase (necesitarás la connection string de
   Postgres, en Supabase: **Settings > Database**).
2. En el dashboard de PowerSync, ve a **Sync Rules** y pega el
   contenido de `supabase/powersync-sync-rules.yaml`.
3. Ve a **Edit Instance > Client SDK** y copia la URL de conexión
   → `VITE_POWERSYNC_URL`.
4. PowerSync usa el JWT de Supabase para autenticación: en la
   configuración de la instancia, agrega el JWT secret/JWKS de tu
   proyecto Supabase (Supabase: **Settings > API > JWT Settings**).

## 4. Configurar el proyecto

```bash
cp .env.example .env
# Edita .env con tus valores de Supabase y PowerSync

pnpm install
pnpm dev
```

Abre `http://localhost:5173`. Es necesario porque el motor SQLite
(`wa-sqlite`) requiere `Cross-Origin-Isolation`, ya configurado en
`vite.config.js`.

## 5. Instalar como app en el celular

1. Despliega el proyecto en Vercel o Netlify (`pnpm build`, luego
   sube la carpeta `dist/` o conecta el repo de Git).
2. Abre la URL desde Chrome/Safari en tu celular.
3. Menú del navegador → **"Agregar a pantalla de inicio" / "Instalar app"**.
4. La app queda instalada como PWA. Funciona sin internet (SQLite
   local) y sincroniza automáticamente con Supabase al reconectar.

## 6. Generar iconos PWA

Faltan los archivos `public/icon-192.png`, `public/icon-512.png` y
`public/favicon.svg`. Puedes generarlos con cualquier generador de
iconos PWA (ej. https://realfavicongenerator.net) a partir de un logo
o emoji, y colocarlos en `public/`.

## Estructura del proyecto

```
src/
  lib/
    schema.js              # Esquema de tablas locales (SQLite/PowerSync)
    powersync.js           # Inicialización de PowerSync
    supabaseConnector.js    # Conector PowerSync <-> Supabase + auth
    fechas.js               # Cálculo de próxima fecha de pago, plazos
  hooks/
    useAuth.js              # Sesión de Supabase
  pages/
    Login.jsx
    Dashboard.jsx           # Totales + listado por tipo de deuda
    DeudaDetalle.jsx        # Registrar pago, historial, finalizar
    NuevaDeuda.jsx          # Alta de deuda con campos condicionales
  components/
    BottomNav.jsx
supabase/
  schema.sql                # Tablas, RLS, trigger plazo_pagado, publication
  powersync-sync-rules.yaml # Reglas de sincronización
```

## Notas sobre la lógica de negocio

- **Registrar pago**: inserta en `historico_pagos`. NO descuenta
  automáticamente de `total_a_pagar` (tú lo actualizas manualmente
  vía "Editar deuda", ya que algunas instituciones separan pagos a
  capital/interés).
- **plazo_pagado**: se incrementa automáticamente vía trigger en
  Supabase cada vez que se registra un pago en una deuda con
  `plazo_total` definido (Elektra semanas, Coopel meses). Al llegar
  al plazo, la deuda se marca `finalizada` automáticamente.
- **Total a pagar (dashboard)**: suma de `total_a_pagar` de todas
  las deudas con `estatus = 'activa'`.
- **Total gastado (dashboard)**: suma de TODOS los registros de
  `historico_pagos` (deudas + futuros gastos extra).
