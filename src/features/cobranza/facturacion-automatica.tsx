"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePlus2, FileText, Percent, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DEMO_TODAY,
  DIA_MAXIMO_FACTURACION,
  DIAS_ENTRE_RECARGOS,
  entregasDeEmision,
  facturasAEmitir,
  HORA_DEMO,
  mesSiguiente,
  nombreLocatario,
  proximaEmision,
  recargosPendientes,
  type CanalAviso,
  type Factura,
  type ProgramacionEmision,
  type ReglaRecargo,
} from "@/domain";
import {
  DataTable,
  EmptyState,
  MoneyAmount,
  SectionCard,
  SegmentedControl,
  StatusChip,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/config/permissions";
import {
  useContratosVivos,
  useFacturas,
  useFuentesLocatario,
  useLocales,
  useSesion,
} from "@/hooks";
import { formatDiaMes, formatMesAnio, formatNumero } from "@/lib/format";
import { MES_DEMO } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import { formatEjecucion } from "./avisos";
import {
  ETIQUETA_CANAL,
  InterruptorProgramacion,
  OPCIONES_CANAL,
  SOLO_44,
} from "./controles-programacion";

const CLASE_INPUT = "mt-2 h-11 text-base md:text-base";

/** Facturas emitidas por página en la lista. */
const FILAS_EMITIDAS = 10;

/** Tope de días de gracia que se puede capturar. */
const GRACIA_MAXIMA = 60;

const esEnteroEntre = (valor: number, min: number, max: number) =>
  Number.isInteger(valor) && valor >= min && valor <= max;

interface FilaEmitida {
  factura: Factura;
  locatario: string;
  local: string;
}

/**
 * Vista "Facturación" de Cobranza: programa la emisión mensual de las rentas
 * del mes siguiente, la corre a mano, aplica recargos, edita la regla de
 * recargo y lista las facturas emitidas en la demo (todas simuladas).
 */
export function FacturacionAutomatica() {
  const { rol } = useSesion();
  const puedeProgramar = can(rol, "cobranza.avisosProgramar");
  const puedeGestionar = can(rol, "cobranza.gestionar");

  const { datos: corte } = useFacturas(MES_DEMO);
  const { datos: contratos } = useContratosVivos();
  const { datos: locales } = useLocales();
  const fuentesLocatario = useFuentesLocatario();

  const emitidas = useAppStore((s) => s.cobranza.emitidas);
  const recargos = useAppStore((s) => s.cobranza.recargos);
  const programacion = useAppStore((s) => s.cobranza.programacionEmision);
  const regla = useAppStore((s) => s.cobranza.reglaRecargo);
  const emitirFacturacion = useAppStore((s) => s.emitirFacturacion);
  const generarRecargos = useAppStore((s) => s.generarRecargos);
  const guardarProgramacion = useAppStore((s) => s.guardarProgramacionEmision);
  const editarRegla = useAppStore((s) => s.editarReglaRecargo);

  const mesAEmitir = mesSiguiente(DEMO_TODAY);
  const todas = useMemo(() => corte ?? [], [corte]);
  // Todo lo ya facturado: la llave contra duplicados y el folio máximo salen de aquí.
  const existentes = useMemo(() => {
    const ids = new Set(todas.map((f) => f.id));
    return [...todas, ...[...emitidas, ...recargos].filter((f) => !ids.has(f.id))];
  }, [todas, emitidas, recargos]);

  const porEmitir = useMemo(
    () => facturasAEmitir(contratos ?? [], existentes, mesAEmitir),
    [contratos, existentes, mesAEmitir],
  );
  const porRecargar = useMemo(
    () => recargosPendientes(existentes, regla, DEMO_TODAY),
    [existentes, regla],
  );

  const emitirAhora = () => {
    if (porEmitir.length === 0 && porRecargar.length === 0) {
      toast.info(
        `La facturación de ${formatMesAnio(`${mesAEmitir}-01`)} ya está emitida`,
      );
      return;
    }
    emitirFacturacion(
      {
        facturas: porEmitir,
        recargos: porRecargar,
        entregas: entregasDeEmision(porEmitir, programacion.canal),
      },
      "MANUAL",
    );
    toast.success(
      `${formatNumero(porEmitir.length)} facturas emitidas y ${formatNumero(porRecargar.length)} recargos aplicados (simulado)`,
    );
  };

  const aplicarRecargos = () => {
    if (porRecargar.length === 0) {
      toast.info("No hay recargos por aplicar hoy");
      return;
    }
    generarRecargos(porRecargar);
    toast.success(`${formatNumero(porRecargar.length)} recargos aplicados`);
  };

  const proxima = proximaEmision(programacion, { fecha: DEMO_TODAY, hora: HORA_DEMO });

  const codigoLocal = useMemo(
    () => new Map((locales ?? []).map((l) => [l.id, l.codigo])),
    [locales],
  );
  const filas = useMemo<FilaEmitida[]>(
    () =>
      [...emitidas]
        .sort((a, b) => (b.folio ?? "").localeCompare(a.folio ?? ""))
        .map((factura) => ({
          factura,
          locatario: nombreLocatario(factura.locatarioId, fuentesLocatario),
          local: codigoLocal.get(factura.localId) ?? factura.localId,
        })),
    [emitidas, fuentesLocatario, codigoLocal],
  );

  const columnas = useMemo<ColumnDef<FilaEmitida>[]>(
    () => [
      { id: "folio", header: "Folio", accessorFn: (f) => f.factura.folio },
      { id: "locatario", header: "Locatario", accessorFn: (f) => f.locatario },
      { id: "local", header: "Local", accessorFn: (f) => f.local },
      {
        id: "mes",
        header: "Mes",
        accessorFn: (f) => f.factura.mes,
        cell: ({ row }) => formatMesAnio(`${row.original.factura.mes}-01`),
      },
      {
        id: "monto",
        header: "Monto",
        accessorFn: (f) => f.factura.monto,
        cell: ({ row }) => <MoneyAmount valor={row.original.factura.monto} />,
      },
      {
        id: "vence",
        header: "Vence",
        accessorFn: (f) => f.factura.vencimiento,
        cell: ({ row }) => formatDiaMes(row.original.factura.vencimiento),
      },
      {
        id: "estado",
        header: "Timbrado",
        cell: () => <StatusChip estatus="SIMULADO" />,
      },
    ],
    [],
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <SectionCard
          titulo="Emisión del mes"
          extra={`Rentas de ${formatMesAnio(`${mesAEmitir}-01`)}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-brand-text">
              {formatNumero(porEmitir.length)} contratos vigentes por facturar ·{" "}
              {formatNumero(emitidas.length)} facturas emitidas en la demo ·{" "}
              {formatNumero(porRecargar.length)} recargos por aplicar hoy
            </p>
            {puedeGestionar ? (
              <div className="flex flex-wrap gap-2">
                <Button className="h-11 px-4" onClick={emitirAhora}>
                  <FilePlus2 aria-hidden />
                  Emitir ahora ({formatNumero(porEmitir.length)})
                </Button>
                <Button variant="outline" className="h-11 px-4" onClick={aplicarRecargos}>
                  <Percent aria-hidden />
                  Aplicar recargos ({formatNumero(porRecargar.length)})
                </Button>
              </div>
            ) : (
              <p className="text-sm text-brand-text-muted">
                Solo Cobranza puede emitir la facturación y aplicar recargos.
              </p>
            )}
            <p className="text-xs text-brand-text-muted">
              En el prototipo no hay timbrado real: las facturas y sus avisos quedan como
              simulados.
            </p>
          </div>
        </SectionCard>

        <SectionCard titulo="Facturas emitidas" sinPadding>
          <DataTable
            columns={columnas}
            data={filas}
            tamanoPagina={FILAS_EMITIDAS}
            ocultarEnVertical={["mes", "vence"]}
            vacio={
              <EmptyState
                icono={FileText}
                titulo="Aún no se emite facturación"
                descripcion="Las facturas aparecen aquí al correr la emisión."
              />
            }
          />
        </SectionCard>
      </div>

      <div className="space-y-6">
        <ProgramacionEmisionCard
          key={JSON.stringify(programacion)}
          programacion={programacion}
          proxima={proxima ? formatEjecucion(proxima) : "sin programar"}
          puedeEditar={puedeProgramar}
          onGuardar={(nueva) => {
            guardarProgramacion(nueva);
            toast.success("Programación de la emisión guardada");
          }}
        />
        <ReglaRecargoCard
          key={JSON.stringify(regla)}
          regla={regla}
          puedeEditar={puedeProgramar}
          onGuardar={(nueva) => {
            editarRegla(nueva);
            toast.success("Regla de recargo guardada");
          }}
        />
      </div>
    </div>
  );
}

interface ProgramacionEmisionCardProps {
  programacion: ProgramacionEmision;
  proxima: string;
  puedeEditar: boolean;
  onGuardar: (programacion: ProgramacionEmision) => void;
}

function ProgramacionEmisionCard({
  programacion,
  proxima,
  puedeEditar,
  onGuardar,
}: ProgramacionEmisionCardProps) {
  const [activa, setActiva] = useState(programacion.activa);
  const [dia, setDia] = useState(String(programacion.dia));
  const [hora, setHora] = useState(programacion.hora);
  const [canal, setCanal] = useState<CanalAviso>(programacion.canal);

  const diaNumero = Number(dia);
  const diaValido = esEnteroEntre(diaNumero, 1, DIA_MAXIMO_FACTURACION);
  const sucia =
    activa !== programacion.activa ||
    diaNumero !== programacion.dia ||
    hora !== programacion.hora ||
    canal !== programacion.canal;

  return (
    <SectionCard titulo="Programación de la emisión">
      <div className="space-y-5">
        <InterruptorProgramacion
          activa={activa}
          etiqueta={`Emisión automática ${activa ? "activa" : "apagada"}`}
          disabled={!puedeEditar}
          onToggle={() => setActiva((a) => !a)}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-brand-text">
            Día del mes
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={DIA_MAXIMO_FACTURACION}
              value={dia}
              disabled={!puedeEditar}
              aria-invalid={!diaValido}
              onChange={(e) => setDia(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>
          <label className="block text-sm font-medium text-brand-text">
            Hora
            <Input
              type="time"
              value={hora}
              disabled={!puedeEditar}
              onChange={(e) => e.target.value && setHora(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>
        </div>
        {diaValido ? null : (
          <p className="text-xs text-brand-danger">
            El día va del 1 al {DIA_MAXIMO_FACTURACION}.
          </p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-brand-text">Canal del aviso</p>
          {puedeEditar ? (
            <SegmentedControl
              etiqueta="Canal del aviso de factura emitida"
              opciones={OPCIONES_CANAL}
              valor={canal}
              onChange={setCanal}
              className={SOLO_44}
            />
          ) : (
            <p className="text-sm text-brand-text">{ETIQUETA_CANAL[canal]}</p>
          )}
        </div>

        <p className="rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-text">
          <span className="text-brand-text-muted">Próxima emisión: </span>
          <strong>{proxima}</strong>
        </p>

        {puedeEditar ? (
          <Button
            className="h-11 px-4"
            disabled={!sucia || !diaValido}
            onClick={() => onGuardar({ activa, dia: diaNumero, hora, canal })}
          >
            <Save aria-hidden />
            Guardar programación
          </Button>
        ) : (
          <p className="text-sm text-brand-text-muted">
            Solo Cobranza puede programar la emisión.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

interface ReglaRecargoCardProps {
  regla: ReglaRecargo;
  puedeEditar: boolean;
  onGuardar: (regla: ReglaRecargo) => void;
}

function ReglaRecargoCard({ regla, puedeEditar, onGuardar }: ReglaRecargoCardProps) {
  const { porcentaje, diasGracia } = regla;
  // Se captura en puntos porcentuales ("2" = 2 %) y se guarda como fracción.
  const [puntos, setPuntos] = useState(String(Math.round(porcentaje * 10_000) / 100));
  const [gracia, setGracia] = useState(String(diasGracia));

  const puntosNumero = Number(puntos);
  const graciaNumero = Number(gracia);
  const valida =
    puntos.trim() !== "" &&
    Number.isFinite(puntosNumero) &&
    puntosNumero > 0 &&
    puntosNumero <= 100 &&
    esEnteroEntre(graciaNumero, 0, GRACIA_MAXIMA);
  const sucia = puntosNumero / 100 !== porcentaje || graciaNumero !== diasGracia;

  return (
    <SectionCard titulo="Regla de recargo">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-brand-text">
            Recargo (%)
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.5}
              value={puntos}
              disabled={!puedeEditar}
              onChange={(e) => setPuntos(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>
          <label className="block text-sm font-medium text-brand-text">
            Días de gracia
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={GRACIA_MAXIMA}
              value={gracia}
              disabled={!puedeEditar}
              onChange={(e) => setGracia(e.target.value)}
              className={CLASE_INPUT}
            />
          </label>
        </div>
        <p className="text-xs text-brand-text-muted">
          Sobre el monto de la renta, sin capitalizar: el primer recargo cae el día{" "}
          {valida ? graciaNumero + 1 : diasGracia + 1} de atraso y uno más cada{" "}
          {DIAS_ENTRE_RECARGOS} días. Cambiar la regla no toca los recargos ya generados.
        </p>
        {puedeEditar ? (
          <Button
            className="h-11 px-4"
            disabled={!sucia || !valida}
            onClick={() =>
              onGuardar({ porcentaje: puntosNumero / 100, diasGracia: graciaNumero })
            }
          >
            <Save aria-hidden />
            Guardar regla
          </Button>
        ) : (
          <p className="text-sm text-brand-text-muted">
            Solo Cobranza puede editar la regla de recargo.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
