# Finco · Portal de Plazas (prototipo navegable)

Prototipo de demostración para Finco, construido por Whipple Studio. No tiene
backend, base de datos, autenticación real ni integraciones reales: todos los datos
son ficticios y se generan de forma determinista en el cliente. "Hoy" está fijo en
**martes 3 de noviembre de 2026** (`DEMO_TODAY`).

## Stack

- Next.js 16.4.5 (App Router) + React 19 + TypeScript `strict`
- Tailwind CSS 4 + shadcn/ui, lucide-react
- Recharts, TanStack Table, react-hook-form + zod
- Zustand con `persist` (localStorage)
- Leaflet / react-leaflet con tiles de OpenStreetMap (requiere internet)
- Vitest, ESLint, Prettier

## Comandos

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm run test
npm run build && npm start
```

## Estructura

```
src/
  app/            rutas (login, (portal)/…)
  domain/         tipos y funciones puras (precio, repricing, candados, KPIs, cobranza)
  data/           seed determinista (PRNG con semilla fija) y plaza héroe a mano
  services/       interfaces de repositorio + implementación mock
  store/          Zustand: sesión, rol, estado mutable de la demo
  hooks/          acceso a datos y navegación para la UI
  config/         navegación, matriz de permisos (can(rol, acción)), usuarios demo
  features/       panorama, plaza, local, cotizacion, aprobaciones (excepciones), precios-reglas, cobranza
  components/     ui (shadcn), shared (negocio reutilizable), layout (shell)
```

Los KPIs, badges del sidebar y píldora de EnKontrol se **calculan** de los datos; no
hay cifras fijas en la UI. Los tests del seed vigilan la coherencia entre pantallas
(por ejemplo, C-12 ocupado con una factura vencida de 54 días).

## Despliegue en Vercel

App Next.js estándar, sin `output: 'export'` y sin variables de entorno: basta
importar el repositorio en Vercel con el preset de Next.js (build `npm run build`).
El primer despliegue requiere la cuenta de Vercel de Whipple o del usuario.

## Guion de demo

Reinicia antes de ensayar: menú de usuario → **Reiniciar demo**. El selector de rol
de la topbar cambia de rol en vivo. Escritorio ≥ 1280 px.

### 1. Dirección (Mariana López) — Panorama

1. Login → "Entrar como Dirección". Aterriza en el Panorama.
2. Muestra los KPIs y el mapa con 11 pines; filtra por Sinaloa y alterna a "Lista".
3. Abre la plaza héroe desde el mapa o la lista.

### 2. Ventas (Jorge Ramírez) — Plano y cotización

1. Cambia a Ventas (aterriza en el plano de la plaza héroe). Haz clic en **A-09**.
2. En la ficha, "Cotizar": captura renta **$22,900**. El candado de precio mínimo
   ($23,500) queda en rojo y "Generar contrato" se deshabilita.
3. "Solicitar excepción de precio".

### 3. Superadmin (Laura Fuentes) — Precios y reglas y local

1. Cambia a Superadmin → **Precios y reglas** → sección "Excepciones de precio" (debajo):
   aprueba la excepción.
2. Vuelve a Ventas: la cotización ya permite "Generar contrato" y muestra el
   borrador con Anexo A.
3. Superadmin → local **A-09**: edita el precio mínimo (solo visible para este rol);
   el historial se actualiza. Cambia la regla a "Valor fijo" y la gráfica de
   repricing (parte de $18,740) se recalcula.
4. Precios y reglas → "Bandeja de aprobación" (derecha): selecciona 6 cambios y aprueba; el badge
   del sidebar baja.

### 4. Cobranza (Patricia Gaxiola) — Cuentas y EnKontrol

1. Cambia a Cobranza. Filtro **Con atraso**; "Recordar" registra el seguimiento.
2. Revisa antigüedad de saldos y próximas facturas por aniversario.
3. "Sincronizar ahora" simula el progreso y actualiza la píldora global de la
   topbar; "Revisar diferencias" abre las 3 diferencias.

### 5. Mapa, Prospectos y Contratos

1. Mapa de plazas: acerca el zoom para separar los pines agrupados; filtra por
   preventa (8) y abre la ficha de una plaza.
2. Prospectos: "Registrar prospecto" valida campos; "Avanzar etapa" mueve la tarjeta.
3. Cotizaciones → COT-2026-0418 → "Generar contrato": el toast enlaza a Contratos.
   Ahí "Enviar a firma" y "Registrar firma" lo dejan vigente (alta en EnKontrol).

### 6. Terrenos, Reportes, Integraciones y Configuración

1. Terrenos y proyectos: tablero por etapa; mover un proyecto a Preventa.
2. Reportes: "Pregúntale a tus datos" con las preguntas sugeridas y "Exportar CSV".
3. Integraciones: "Sincronizar ahora" en EnKontrol, Excel o Monday; revisa el log.
4. Configuración: usuarios y matriz de permisos, reglas por default (Superadmin),
   parámetros y reinicio de la demo.

### 7. Cierre

- El buscador ⌘K encuentra plazas, locales, locatarios, contratos, prospectos y terrenos.
- Como Dirección todas las pantallas son de consulta (sin acciones).
- Si no hay red, los tiles del mapa no cargan: usa el toggle "Lista".
- Los datos de versiones anteriores de la demo se descartan al abrir (vuelve al login).
- "Reiniciar demo" deja todo en el estado inicial.
