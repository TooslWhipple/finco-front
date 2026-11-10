import type { Rol } from "@/domain";
import { PERMISOS, type Accion } from "@/config/permissions";

/** Acciones de la matriz, agrupadas por módulo, con su etiqueta para la UI. */
export const ACCIONES_MATRIZ: readonly {
  modulo: string;
  acciones: readonly { accion: Accion; etiqueta: string }[];
}[] = [
  {
    modulo: "Prospectos y cotizaciones",
    acciones: [
      { accion: "prospectos.gestionar", etiqueta: "Gestionar prospectos" },
      { accion: "cotizaciones.crear", etiqueta: "Crear cotizaciones" },
      { accion: "excepcion.solicitar", etiqueta: "Solicitar excepciones" },
      { accion: "comercial.verEquipo", etiqueta: "Ver el trabajo de todo el equipo" },
    ],
  },
  {
    modulo: "Contratos",
    acciones: [
      { accion: "contrato.generar", etiqueta: "Generar contrato" },
      { accion: "contratos.gestionar", etiqueta: "Gestionar contratos" },
    ],
  },
  {
    modulo: "Precios y reglas",
    acciones: [
      { accion: "excepcion.autorizar", etiqueta: "Autorizar excepciones de precio" },
      { accion: "excepcion.aplicar", etiqueta: "Aplicar excepciones autorizadas" },
      { accion: "metaIngresos.editar", etiqueta: "Editar meta de ingresos" },
      { accion: "precioMinimo.editar", etiqueta: "Editar precio mínimo" },
      { accion: "regla.editar", etiqueta: "Editar regla del local" },
      { accion: "actualizacionAnual.resolver", etiqueta: "Resolver actualización anual" },
      { accion: "local.liberar", etiqueta: "Liberar un local (terminar el contrato)" },
    ],
  },
  {
    modulo: "Cobranza e integraciones",
    acciones: [
      { accion: "cobranza.gestionar", etiqueta: "Gestionar cobranza" },
      { accion: "cobranza.avisosProgramar", etiqueta: "Programar avisos automáticos" },
      { accion: "integraciones.sincronizar", etiqueta: "Sincronizar integraciones" },
    ],
  },
  {
    modulo: "Mantenimientos",
    acciones: [
      {
        accion: "mantenimientos.gestionar",
        etiqueta: "Crear mantenimientos y cambiar su estatus",
      },
      {
        accion: "mantenimiento.presupuestoEditar",
        etiqueta: "Editar el presupuesto de mantenimiento",
      },
      {
        accion: "mantenimiento.sobregiroAutorizar",
        etiqueta: "Autorizar sobregiros de mantenimiento",
      },
    ],
  },
  {
    modulo: "Obra y licitación",
    acciones: [
      { accion: "obra.corteCapturar", etiqueta: "Capturar corte de obra" },
      { accion: "obra.corteValidar", etiqueta: "Validar corte de obra" },
      { accion: "obra.estimacionRegistrar", etiqueta: "Registrar estimación de pago" },
      { accion: "obra.estimacionAutorizar", etiqueta: "Autorizar estimación de pago" },
      { accion: "licitacion.gestionar", etiqueta: "Gestionar licitación" },
    ],
  },
  {
    modulo: "Terrenos y configuración",
    acciones: [
      { accion: "terrenos.gestionar", etiqueta: "Gestionar terrenos y proyectos" },
      { accion: "configuracion.editar", etiqueta: "Editar configuración" },
    ],
  },
];

export interface FilaMatriz {
  modulo: string;
  accion: Accion;
  etiqueta: string;
  /** Si cada rol puede ejecutar la acción. */
  permitido: Readonly<Record<Rol, boolean>>;
}

/** Matriz rol × acción generada desde `PERMISOS` (fuente única de verdad). */
export function matrizPermisos(roles: readonly Rol[]): FilaMatriz[] {
  return ACCIONES_MATRIZ.flatMap(({ modulo, acciones }) =>
    acciones.map(({ accion, etiqueta }) => ({
      modulo,
      accion,
      etiqueta,
      permitido: Object.fromEntries(
        roles.map((r) => [r, PERMISOS[r].includes(accion)]),
      ) as Record<Rol, boolean>,
    })),
  );
}
