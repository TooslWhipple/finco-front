"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileSignature,
  Layers,
  Search,
  Store,
  User,
  Users,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useContratosVivos,
  useCotizaciones,
  useLocales,
  useLocatarios,
  usePlazas,
  useProspectos,
  useTerrenos,
} from "@/hooks";
import { formatMoneda } from "@/lib/format";
import { buscarGlobal } from "./busqueda";

/** Contenido del buscador; solo se monta con el diálogo abierto para no cargar ~2,000 filas de más. */
function ResultadosBusqueda({
  consulta,
  cerrar,
}: {
  consulta: string;
  cerrar: () => void;
}) {
  const router = useRouter();
  const plazas = usePlazas().datos;
  const locales = useLocales().datos;
  const locatarios = useLocatarios().datos;
  const contratos = useContratosVivos().datos;
  const prospectos = useProspectos().datos;
  const cotizaciones = useCotizaciones();
  const terrenos = useTerrenos().datos;

  const resultados = useMemo(
    () =>
      buscarGlobal(
        {
          plazas: plazas ?? [],
          locales: locales ?? [],
          locatarios: locatarios ?? [],
          contratos: contratos ?? [],
          prospectos,
          cotizaciones,
          terrenos,
        },
        consulta,
      ),
    [
      plazas,
      locales,
      locatarios,
      contratos,
      prospectos,
      cotizaciones,
      terrenos,
      consulta,
    ],
  );

  const ir = (ruta: string) => {
    cerrar();
    router.push(ruta);
  };

  return (
    <CommandList>
      <CommandEmpty>Sin resultados para “{consulta}”.</CommandEmpty>
      {resultados.plazas.length > 0 ? (
        <CommandGroup heading="Plazas">
          {resultados.plazas.map((p) => (
            <CommandItem key={p.id} value={p.id} onSelect={() => ir(`/plazas/${p.id}`)}>
              <Building2 aria-hidden />
              {p.nombre}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {resultados.locales.length > 0 ? (
        <CommandGroup heading="Locales">
          {resultados.locales.map(({ local, plaza }) => (
            <CommandItem
              key={local.id}
              value={local.id}
              onSelect={() => ir(`/plazas/${local.plazaId}/locales/${local.id}`)}
            >
              <Store aria-hidden />
              <span>Local {local.codigo}</span>
              <span className="text-brand-text-muted">{plaza}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {resultados.locatarios.length > 0 ? (
        <CommandGroup heading="Locatarios">
          {resultados.locatarios.map((l) => (
            <CommandItem key={l.id} value={l.id} onSelect={() => ir("/contratos")}>
              <User aria-hidden />
              {l.nombre}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {resultados.contratos.length > 0 ? (
        <CommandGroup heading="Contratos">
          {resultados.contratos.map(({ contrato, folio, codigoLocal, locatario }) => (
            <CommandItem
              key={contrato.id}
              value={contrato.id}
              onSelect={() => ir(`/contratos?contrato=${contrato.id}`)}
            >
              <FileSignature aria-hidden />
              <span>{folio}</span>
              <span className="text-brand-text-muted">
                {codigoLocal ? `Local ${codigoLocal} · ` : ""}
                {locatario ? `${locatario} · ` : ""}
                {formatMoneda(contrato.rentaMensual)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {resultados.prospectos.length > 0 ? (
        <CommandGroup heading="Prospectos">
          {resultados.prospectos.map((p) => (
            <CommandItem
              key={p.id}
              value={p.id}
              onSelect={() => ir(`/prospectos?prospecto=${p.id}`)}
            >
              <Users aria-hidden />
              <span>{p.nombre}</span>
              <span className="text-brand-text-muted">{p.giro}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {resultados.terrenos.length > 0 ? (
        <CommandGroup heading="Terrenos y proyectos">
          {resultados.terrenos.map((t) => (
            <CommandItem
              key={t.id}
              value={t.id}
              onSelect={() => ir(`/terrenos-y-proyectos?terreno=${t.id}`)}
            >
              <Layers aria-hidden />
              {t.nombre}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
    </CommandList>
  );
}

/** Buscador global ⌘K sobre plazas, locales, locatarios, contratos, prospectos y terrenos. */
export function Buscador() {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const cambiarAbierto = (valor: boolean) => {
    setAbierto(valor);
    if (!valor) setConsulta("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-10 w-56 items-center gap-2 rounded-lg border border-brand-line bg-brand-cream px-3 text-sm text-brand-text-muted transition-colors outline-none hover:border-brand-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">
          Buscar plaza, local, locatario o contrato…
        </span>
        <kbd className="rounded border border-brand-line bg-white px-1.5 text-xs">⌘K</kbd>
      </button>
      <CommandDialog
        open={abierto}
        onOpenChange={cambiarAbierto}
        title="Buscar"
        description="Busca plazas, locales, locatarios, contratos, prospectos y terrenos"
      >
        {/* El filtrado lo hace `ResultadosBusqueda`, que además acota cada grupo. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={consulta}
            onValueChange={setConsulta}
            placeholder="Buscar plaza, local, locatario o contrato…"
          />
          {abierto ? (
            <ResultadosBusqueda
              consulta={consulta}
              cerrar={() => cambiarAbierto(false)}
            />
          ) : null}
        </Command>
      </CommandDialog>
    </>
  );
}
