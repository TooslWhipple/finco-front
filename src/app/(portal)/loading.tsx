/**
 * Respaldo de las pantallas del portal mientras llegan sus datos. Es la
 * frontera de Suspense de cada página: sin ella, lo que se evalúa al
 * prerenderizar (p. ej. los tiempos que TanStack Table mide en desarrollo)
 * bloquea la navegación.
 */
export default function CargandoPortal() {
  return <p className="text-sm text-brand-text-muted">Cargando…</p>;
}
