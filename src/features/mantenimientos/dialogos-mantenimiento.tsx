"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo, CLASE_SELECT } from "@/features/cotizacion/campo";
import {
  CATEGORIAS_MANTENIMIENTO,
  consumoPresupuesto,
  DEMO_TODAY,
  erroresMantenimiento,
  excedenteSobregiro,
  requiereAutorizacion,
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  ETIQUETA_TIPO_MANTENIMIENTO,
  sumarDias,
  TIPOS_MANTENIMIENTO,
  type CategoriaMantenimiento,
  type CargoMantenimiento,
  type Local,
  type Mantenimiento,
  type OrigenMantenimiento,
  type Plaza,
  type Proveedor,
  type TipoMantenimiento,
} from "@/domain";
import { useLocales, useMantenimientos, usePresupuestosMantenimiento } from "@/hooks";
import { formatMoneda } from "@/lib/format";
import type { NuevoMantenimiento } from "@/store/reducers";

interface DialogoBase {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
}

const CLASE_BOTON = "bg-brand-cta text-white hover:bg-brand-cta-light";

// --- finalizar ------------------------------------------------------------

function FormularioFinalizar({
  mantenimiento,
  onCerrar,
  onFinalizar,
}: {
  mantenimiento: Mantenimiento;
  onCerrar: () => void;
  onFinalizar: (costoReal: number) => void;
}) {
  const [texto, setTexto] = useState(String(mantenimiento.costoEstimado));
  const costo = Number(texto);
  const error =
    texto.trim() === "" || !Number.isFinite(costo) || costo < 0
      ? "Escribe el costo real en pesos (0 o más)."
      : undefined;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        onFinalizar(costo);
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Finalizar mantenimiento</DialogTitle>
        <DialogDescription>
          {mantenimiento.folio} · {mantenimiento.titulo}. El fin queda en hoy y se adjunta
          evidencia del trabajo terminado.
        </DialogDescription>
      </DialogHeader>
      <Campo
        etiqueta="Costo real (MXN)"
        htmlFor="costo-real-mantenimiento"
        error={error}
        ayuda={`Estimado: ${formatMoneda(mantenimiento.costoEstimado)}`}
      >
        <Input
          id="costo-real-mantenimiento"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-11 md:text-base"
        />
      </Campo>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Volver
        </Button>
        <Button type="submit" disabled={error !== undefined} className={CLASE_BOTON}>
          Finalizar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoFinalizarMantenimiento({
  mantenimiento,
  abierto,
  onCambioAbierto,
  onFinalizar,
}: DialogoBase & {
  mantenimiento: Mantenimiento;
  onFinalizar: (costoReal: number) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <FormularioFinalizar
          mantenimiento={mantenimiento}
          onCerrar={() => onCambioAbierto(false)}
          onFinalizar={onFinalizar}
        />
      </DialogContent>
    </Dialog>
  );
}

// --- cancelar -------------------------------------------------------------

export function DialogoCancelarMantenimiento({
  mantenimiento,
  abierto,
  onCambioAbierto,
  onCancelar,
}: DialogoBase & { mantenimiento: Mantenimiento; onCancelar: () => void }) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar mantenimiento</DialogTitle>
          <DialogDescription>
            {mantenimiento.folio} · {mantenimiento.titulo} quedará cancelado y ya no podrá
            cambiar de estatus.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onCambioAbierto(false)}>
            Volver
          </Button>
          <Button
            onClick={() => {
              onCancelar();
              onCambioAbierto(false);
            }}
            className={CLASE_BOTON}
          >
            Cancelar mantenimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- nuevo ----------------------------------------------------------------

const SIN_LOCAL = "";

interface FormularioNuevoProps {
  plazas: readonly Plaza[];
  proveedores: readonly Proveedor[];
  /** Plaza y local precargados (y fijos) según el lugar desde donde se abre. */
  filtro: { plazaId?: string; localId?: string };
  onCerrar: () => void;
  onCrear: (nuevo: NuevoMantenimiento) => void;
}

function FormularioNuevo({
  plazas,
  proveedores,
  filtro,
  onCerrar,
  onCrear,
}: FormularioNuevoProps) {
  const [plazaId, setPlazaId] = useState(filtro.plazaId ?? plazas[0]?.id ?? "");
  const [localId, setLocalId] = useState(filtro.localId ?? SIN_LOCAL);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoMantenimiento>("CORRECTIVO");
  const [categoria, setCategoria] = useState<CategoriaMantenimiento>("PINTURA");
  const [proveedorElegido, setProveedorElegido] = useState("");
  const [origen, setOrigen] = useState<OrigenMantenimiento>("ADMINISTRACION");
  const [fecha, setFecha] = useState(sumarDias(DEMO_TODAY, 7));
  const [costoTexto, setCostoTexto] = useState("");
  const [cargoElegido, setCargoElegido] = useState<CargoMantenimiento>("PLAZA");
  const [intentado, setIntentado] = useState(false);

  const locales = useLocales(plazaId).datos;
  const local: Local | undefined = locales?.find((l) => l.id === localId);
  const proveedoresDeCategoria = useMemo(
    () => proveedores.filter((p) => p.especialidades.includes(categoria)),
    [proveedores, categoria],
  );
  // El proveedor y el cargo se derivan: cambiar de categoría o de local los reacomoda.
  const proveedorId = proveedoresDeCategoria.some((p) => p.id === proveedorElegido)
    ? proveedorElegido
    : (proveedoresDeCategoria[0]?.id ?? "");
  const puedeCobrarLocatario = local?.estatus === "OCUPADO";
  const cargoA: CargoMantenimiento = puedeCobrarLocatario ? cargoElegido : "PLAZA";
  const origenEfectivo: OrigenMantenimiento =
    tipo === "PREVENTIVO" ? "ADMINISTRACION" : origen;

  const costo = Number(costoTexto);
  const errorTitulo =
    titulo.trim() === "" ? "Escribe qué trabajo se va a hacer." : undefined;
  const errorCosto =
    costoTexto.trim() === "" || !Number.isFinite(costo) || costo < 0
      ? "Escribe el costo estimado en pesos."
      : undefined;
  const errorFecha = fecha === "" ? "Elige la fecha programada." : undefined;
  const errorDominio = erroresMantenimiento(
    {
      tipo,
      origen: origenEfectivo,
      estatus: "PROGRAMADO",
      cargoA,
      localId: localId === SIN_LOCAL ? undefined : localId,
      categoria,
    },
    { local, proveedor: proveedores.find((p) => p.id === proveedorId) },
  )[0];
  const invalido = Boolean(errorTitulo || errorCosto || errorFecha || errorDominio);

  // Aviso (no error): pasar del presupuesto de la plaza deja el trabajo pendiente de Dirección.
  const presupuestos = usePresupuestosMantenimiento();
  const todos = useMantenimientos().datos;
  const excedente = useMemo(() => {
    if (errorCosto || fecha === "") return 0;
    const año = Number(fecha.slice(0, 4));
    const presupuesto = presupuestos.find((p) => p.plazaId === plazaId && p.año === año);
    if (!presupuesto) return 0;
    const consumo = consumoPresupuesto(plazaId, año, todos);
    const m = { costoEstimado: Math.round(costo), costoReal: undefined };
    return requiereAutorizacion(m, presupuesto, consumo)
      ? excedenteSobregiro(m, presupuesto, consumo)
      : 0;
  }, [errorCosto, fecha, presupuestos, plazaId, todos, costo]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setIntentado(true);
        if (invalido) return;
        onCrear({
          plazaId,
          localId: localId === SIN_LOCAL ? undefined : localId,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          tipo,
          categoria,
          origen: origenEfectivo,
          proveedorId,
          fechaProgramada: fecha,
          costoEstimado: Math.round(costo),
          cargoA,
        });
        onCerrar();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Nuevo mantenimiento</DialogTitle>
        <DialogDescription>
          Nace programado; desde su detalle se inicia, se finaliza o se cancela.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Plaza" htmlFor="mnt-plaza">
          <select
            id="mnt-plaza"
            value={plazaId}
            disabled={filtro.plazaId !== undefined}
            onChange={(e) => {
              setPlazaId(e.target.value);
              setLocalId(SIN_LOCAL);
            }}
            className={CLASE_SELECT}
          >
            {plazas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Local" htmlFor="mnt-local">
          <select
            id="mnt-local"
            value={localId}
            disabled={filtro.localId !== undefined}
            onChange={(e) => setLocalId(e.target.value)}
            className={CLASE_SELECT}
          >
            <option value={SIN_LOCAL}>Áreas comunes (sin local)</option>
            {(locales ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        etiqueta="Trabajo"
        htmlFor="mnt-titulo"
        error={intentado ? errorTitulo : undefined}
      >
        <Input
          id="mnt-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Reparación de fuga en baño"
          aria-invalid={intentado && errorTitulo ? true : undefined}
        />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="mnt-descripcion">
        <Textarea
          id="mnt-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tipo" htmlFor="mnt-tipo">
          <select
            id="mnt-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMantenimiento)}
            className={CLASE_SELECT}
          >
            {TIPOS_MANTENIMIENTO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_MANTENIMIENTO[t]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Solicitado por"
          htmlFor="mnt-origen"
          ayuda={
            tipo === "PREVENTIVO"
              ? "Un preventivo siempre lo programa la administración."
              : undefined
          }
        >
          <select
            id="mnt-origen"
            value={origenEfectivo}
            disabled={tipo === "PREVENTIVO"}
            onChange={(e) => setOrigen(e.target.value as OrigenMantenimiento)}
            className={CLASE_SELECT}
          >
            <option value="ADMINISTRACION">Administración</option>
            <option value="LOCATARIO">Locatario</option>
          </select>
        </Campo>
        <Campo etiqueta="Categoría" htmlFor="mnt-categoria">
          <select
            id="mnt-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaMantenimiento)}
            className={CLASE_SELECT}
          >
            {CATEGORIAS_MANTENIMIENTO.map((c) => (
              <option key={c} value={c}>
                {ETIQUETA_CATEGORIA_MANTENIMIENTO[c]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Proveedor"
          htmlFor="mnt-proveedor"
          ayuda="Solo los que atienden la categoría elegida."
        >
          <select
            id="mnt-proveedor"
            value={proveedorId}
            onChange={(e) => setProveedorElegido(e.target.value)}
            className={CLASE_SELECT}
          >
            {proveedoresDeCategoria.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          etiqueta="Fecha programada"
          htmlFor="mnt-fecha"
          error={intentado ? errorFecha : undefined}
        >
          <Input
            id="mnt-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Costo estimado (MXN)"
          htmlFor="mnt-costo"
          error={intentado ? errorCosto : undefined}
        >
          <Input
            id="mnt-costo"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={costoTexto}
            onChange={(e) => setCostoTexto(e.target.value)}
            aria-invalid={intentado && errorCosto ? true : undefined}
            className="h-11 md:text-base"
          />
        </Campo>
      </div>

      <Campo
        etiqueta="Cargo a"
        htmlFor="mnt-cargo"
        ayuda={
          puedeCobrarLocatario
            ? undefined
            : "Cargo a Locatario solo está disponible en un local ocupado."
        }
      >
        <select
          id="mnt-cargo"
          value={cargoA}
          onChange={(e) => setCargoElegido(e.target.value as CargoMantenimiento)}
          className={CLASE_SELECT}
        >
          <option value="PLAZA">Plaza</option>
          <option value="LOCATARIO" disabled={!puedeCobrarLocatario}>
            Locatario
          </option>
        </select>
      </Campo>

      {excedente > 0 ? (
        <p
          role="status"
          className="rounded-lg bg-brand-cream px-3 py-2 text-sm text-brand-text ring-1 ring-brand-cta"
        >
          Este trabajo pasa del presupuesto de la plaza por {formatMoneda(excedente)}.
          Quedará pendiente de autorización de Dirección y no podrá iniciarse antes.
        </p>
      ) : null}

      {intentado && errorDominio ? (
        <p role="alert" className="text-xs text-brand-danger">
          {errorDominio}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="submit" className={CLASE_BOTON}>
          Crear mantenimiento
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DialogoNuevoMantenimiento({
  abierto,
  onCambioAbierto,
  onCrear,
  ...resto
}: DialogoBase &
  Omit<FormularioNuevoProps, "onCerrar" | "onCrear"> & {
    onCrear: (nuevo: NuevoMantenimiento) => void;
  }) {
  return (
    <Dialog open={abierto} onOpenChange={onCambioAbierto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <FormularioNuevo
          {...resto}
          onCerrar={() => onCambioAbierto(false)}
          onCrear={(nuevo) => {
            onCrear(nuevo);
            toast.success("Mantenimiento creado y programado");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
