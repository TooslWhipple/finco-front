"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, CalendarX, Download, Send } from "lucide-react";
import { toast } from "sonner";
import { antiguedadSaldos, DEMO_TODAY, type Factura } from "@/domain";
import {
  EmptyState,
  BarraFiltros,
  KpiCard,
  KpiRow,
  PillsFiltro,
  SelectorPill,
  type OpcionSelector,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { can } from "@/config/permissions";
import {
  useContratos,
  useFacturas,
  useLocales,
  useLocatarios,
  usePlazas,
  useSesion,
} from "@/hooks";
import { avisarProximaFase } from "@/lib/avisos";
import {
  formatDiaMes,
  formatMesCorto,
  formatNumero,
  formatPorcentaje,
  formatPuntos,
} from "@/lib/format";
import { MES_DEMO } from "@/lib/tiempo";
import { useAppStore } from "@/store";
import { AntiguedadSaldos } from "./antiguedad-saldos";
import {
  avisosAutomaticosHoy,
  cierreMesAnterior,
  conteoPorEstatus,
  diasAniversarioPorLocal,
  facturasPorDia,
  filtrarFacturas,
  kpisCobranza,
  META_COBRADO,
  montoAlCorriente,
  pendientesDeAviso,
  type FiltroEstatus,
} from "./calculos";
import { formatMillones } from "./formato";
import { ProximasFacturas } from "./proximas-facturas";
import { SyncEnKontrol } from "./sync-enkontrol";
import { TablaCuentas } from "./tabla-cuentas";

const MESES: readonly OpcionSelector[] = [
  { valor: "2026-09", etiqueta: "Septiembre 2026" },
  { valor: "2026-10", etiqueta: "Octubre 2026" },
  { valor: MES_DEMO, etiqueta: "Noviembre 2026" },
  { valor: "2026-12", etiqueta: "Diciembre 2026" },
];

const TODAS_LAS_PLAZAS = "todas";

export function Cobranza() {
  const { rol } = useSesion();
  const [mes, setMes] = useState(MES_DEMO);
  const [filtro, setFiltro] = useState<FiltroEstatus>("TODAS");
  const [plazaId, setPlazaId] = useState(TODAS_LAS_PLAZAS);

  const { datos: facturas } = useFacturas(mes);
  const { datos: locales } = useLocales();
  const { datos: plazas } = usePlazas();
  const { datos: locatarios } = useLocatarios();
  const { datos: contratos } = useContratos();
  const avisados = useAppStore((s) => s.cobranza.avisados);
  const registrarSeguimiento = useAppStore((s) => s.registrarSeguimiento);
  const registrarAvisos = useAppStore((s) => s.registrarAvisos);

  const puedeGestionar = can(rol, "cobranza.gestionar");

  const codigoLocal = useMemo(
    () => new Map((locales ?? []).map((l) => [l.id, l.codigo])),
    [locales],
  );
  const plazaPorLocal = useMemo(
    () => new Map((locales ?? []).map((l) => [l.id, l.plazaId])),
    [locales],
  );
  const nombrePlazaPorId = useMemo(
    () => new Map((plazas ?? []).map((p) => [p.id, p.nombre])),
    [plazas],
  );
  const nombrePlazaPorLocal = useMemo(
    () =>
      new Map(
        [...plazaPorLocal].map(([localId, id]) => [
          localId,
          nombrePlazaPorId.get(id) ?? id,
        ]),
      ),
    [plazaPorLocal, nombrePlazaPorId],
  );
  const nombreLocatario = useMemo(
    () => new Map((locatarios ?? []).map((t) => [t.id, t.nombre])),
    [locatarios],
  );
  const folios = useMemo(
    () => new Map((facturas ?? []).map((f) => [f.id, f.folio ?? f.id])),
    [facturas],
  );

  const todas = useMemo(() => facturas ?? [], [facturas]);
  const kpis = useMemo(() => kpisCobranza(todas, mes, DEMO_TODAY), [todas, mes]);
  const conteo = useMemo(() => conteoPorEstatus(todas, DEMO_TODAY), [todas]);
  const cubos = useMemo(() => antiguedadSaldos(todas, DEMO_TODAY), [todas]);
  const visibles = useMemo(
    () =>
      filtrarFacturas(
        todas,
        DEMO_TODAY,
        filtro,
        plazaPorLocal,
        plazaId === TODAS_LAS_PLAZAS ? null : plazaId,
      ),
    [todas, filtro, plazaPorLocal, plazaId],
  );
  const porAvisar = useMemo(
    () => pendientesDeAviso(todas, DEMO_TODAY, avisados),
    [todas, avisados],
  );
  const diasProximos = useMemo(
    () => facturasPorDia(contratos ?? [], DEMO_TODAY),
    [contratos],
  );
  const diaAniversario = useMemo(
    () => diasAniversarioPorLocal(contratos ?? [], DEMO_TODAY),
    [contratos],
  );
  const alCorriente = useMemo(() => montoAlCorriente(todas, DEMO_TODAY), [todas]);
  const avisosHoy = useMemo(() => avisosAutomaticosHoy(todas, DEMO_TODAY), [todas]);

  const opcionesPlaza = useMemo<OpcionSelector[]>(() => {
    const conFacturas = new Set(todas.map((f) => plazaPorLocal.get(f.localId)));
    return [
      { valor: TODAS_LAS_PLAZAS, etiqueta: "Plaza: todas" },
      ...(plazas ?? [])
        .filter((p) => conFacturas.has(p.id))
        .map((p) => ({ valor: p.id, etiqueta: `Plaza: ${p.nombre}` }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    ];
  }, [todas, plazas, plazaPorLocal]);

  const recordar = useCallback(
    (factura: Factura) => {
      registrarSeguimiento(
        factura.id,
        `Recordatorio enviado el ${formatDiaMes(DEMO_TODAY)}`,
      );
      toast.success(`Recordatorio registrado para ${factura.folio ?? factura.id}`);
    },
    [registrarSeguimiento],
  );

  const enviarAvisos = () => {
    registrarAvisos(
      porAvisar.map((f) => f.id),
      `Aviso de cobranza enviado el ${formatDiaMes(DEMO_TODAY)}`,
    );
    toast.success(`${formatNumero(porAvisar.length)} avisos de cobranza registrados`);
  };

  const opcionesFiltro = [
    { valor: "TODAS", etiqueta: `Todas · ${formatNumero(conteo.TODAS)}` },
    { valor: "VIGENTE", etiqueta: `Por vencer · ${formatNumero(conteo.VIGENTE)}` },
    { valor: "VENCIDA", etiqueta: `Con atraso · ${formatNumero(conteo.VENCIDA)}` },
    { valor: "PAGADA", etiqueta: `Pagadas · ${formatNumero(conteo.PAGADA)}` },
  ] as const;

  const mesVacio = facturas !== undefined && facturas.length === 0;
  const variacionCartera =
    kpis.carteraVencidaMesAnterior > 0
      ? (kpis.carteraVencida - kpis.carteraVencidaMesAnterior) /
        kpis.carteraVencidaMesAnterior
      : undefined;
  const nombreMes = MESES.find((m) => m.valor === mes)?.etiqueta ?? mes;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cobranza"
        descripcion="Facturación automática en la fecha aniversario de cada contrato · avisos y seguimiento de morosos"
        acciones={
          <>
            <span className="relative inline-flex items-center">
              <CalendarDays
                aria-hidden
                className="pointer-events-none absolute left-3 z-10 size-4 text-brand-primary"
              />
              <SelectorPill
                etiqueta="Mes del corte"
                valor={mes}
                opciones={MESES}
                onChange={setMes}
                className="[&_select]:pl-9"
              />
            </span>
            <Button variant="outline" size="lg" onClick={avisarProximaFase}>
              <Download aria-hidden />
              Estado de cuenta
            </Button>
            {puedeGestionar ? (
              <Button size="lg" disabled={porAvisar.length === 0} onClick={enviarAvisos}>
                <Send aria-hidden />
                Enviar avisos ({formatNumero(porAvisar.length)})
              </Button>
            ) : null}
          </>
        }
      />

      {mesVacio ? (
        <SectionCard>
          <EmptyState
            icono={CalendarX}
            titulo="Sin facturación en este mes"
            descripcion="El prototipo solo trae datos de cobranza de noviembre 2026."
            accion={
              <Button variant="outline" onClick={() => setMes(MES_DEMO)}>
                Ir a noviembre 2026
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <>
          <KpiRow>
            <KpiCard
              etiqueta={`Facturado ${nombreMes.split(" ")[0].toLowerCase()}`}
              valor={formatMillones(kpis.facturado)}
              subtexto={`${formatNumero(kpis.facturasDelMes)} CFDI · por aniversario`}
            />
            <KpiCard
              etiqueta="Cobrado al día"
              valor={formatMillones(kpis.cobrado)}
              subtexto={
                <>
                  <span className="font-medium text-brand-secondary">
                    {formatPorcentaje(kpis.porcentajeCobrado)}
                  </span>{" "}
                  · meta {formatPorcentaje(META_COBRADO)}
                </>
              }
            />
            <KpiCard
              etiqueta="Cartera vencida"
              valor={formatMillones(kpis.carteraVencida)}
              delta={
                variacionCartera === undefined
                  ? undefined
                  : {
                      texto: `${formatPuntos(Math.abs(variacionCartera) * 100)} vs. ${formatMesCorto(cierreMesAnterior(mes))}`,
                      direccion: variacionCartera >= 0 ? "sube" : "baja",
                      tono: variacionCartera >= 0 ? "peligro" : "positivo",
                    }
              }
            />
            <KpiCard
              etiqueta="Locatarios con atraso"
              valor={formatNumero(kpis.locatariosConAtraso)}
              subtexto={`${formatNumero(kpis.locatariosMasDe60)} con más de 60 días`}
            />
            <KpiCard
              etiqueta="Avisos automáticos hoy"
              valor={formatNumero(avisosHoy.total)}
              subtexto={`WhatsApp ${formatNumero(avisosHoy.whatsapp)} · correo ${formatNumero(avisosHoy.correo)}`}
            />
          </KpiRow>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SectionCard
              titulo="Cuentas por cobrar"
              className="flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-1 [&>div:last-child]:flex-col"
            >
              <BarraFiltros
                envolver
                className="mb-4"
                derecha={
                  <SelectorPill
                    etiqueta="Plaza"
                    valor={plazaId}
                    opciones={opcionesPlaza}
                    onChange={setPlazaId}
                  />
                }
              >
                <PillsFiltro
                  etiqueta="Estatus de la cuenta"
                  opciones={opcionesFiltro}
                  valor={filtro}
                  onChange={setFiltro}
                  envolver
                />
              </BarraFiltros>
              <TablaCuentas
                key={`${filtro}-${plazaId}`}
                facturas={visibles}
                codigoLocal={codigoLocal}
                nombrePlaza={nombrePlazaPorLocal}
                nombreLocatario={nombreLocatario}
                diaAniversario={diaAniversario}
                puedeGestionar={puedeGestionar}
                onRecordar={recordar}
              />
            </SectionCard>

            <div className="space-y-6">
              <ProximasFacturas dias={diasProximos} />
              <AntiguedadSaldos alCorriente={alCorriente} cubos={cubos} />
              <SyncEnKontrol
                puedeSincronizar={can(rol, "integraciones.sincronizar")}
                folios={folios}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
