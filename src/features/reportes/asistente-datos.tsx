"use client";

import { useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { EmptyState, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PREGUNTAS_ASISTENTE, buscarPregunta, type PreguntaAsistente } from "./asistente";
import { GraficaBarras } from "./grafica-barras";
import type { DatosReporte } from "./tipos";

type Turno =
  | { tipo: "respuesta"; pregunta: string; id: string }
  | { tipo: "sin-coincidencia"; pregunta: string };

/**
 * Asistente simulado: las respuestas salen de un catálogo declarativo y se
 * calculan al momento sobre el estado actual de la demo. No hay IA.
 */
export function AsistenteDatos({ datos }: { datos: DatosReporte }) {
  const [texto, setTexto] = useState("");
  const [turno, setTurno] = useState<Turno | null>(null);

  const preguntar = (pregunta: PreguntaAsistente | null, original: string) => {
    setTurno(
      pregunta
        ? { tipo: "respuesta", pregunta: original, id: pregunta.id }
        : { tipo: "sin-coincidencia", pregunta: original },
    );
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    preguntar(buscarPregunta(limpio), limpio);
  };

  const elegida =
    turno?.tipo === "respuesta"
      ? PREGUNTAS_ASISTENTE.find((p) => p.id === turno.id)
      : undefined;
  const respuesta = elegida?.responder(datos);

  return (
    <div className="space-y-4">
      <SectionCard titulo="Pregúntale a tus datos">
        <form onSubmit={enviar} className="flex gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej. ¿Cómo va la cobranza este mes?"
            aria-label="Pregunta sobre tus datos"
          />
          <Button type="submit" disabled={texto.trim() === ""}>
            <Send aria-hidden /> Preguntar
          </Button>
        </form>
        <div className="mt-4">
          <p className="mb-2 text-sm text-brand-text-muted">Preguntas sugeridas</p>
          <ul className="flex flex-wrap gap-2">
            {PREGUNTAS_ASISTENTE.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTexto(p.texto);
                    preguntar(p, p.texto);
                  }}
                  className="rounded-full border border-brand-line bg-card px-4 py-1.5 text-sm font-medium text-brand-text transition-colors outline-none hover:bg-brand-cream focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {p.texto}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>

      {turno === null ? (
        <SectionCard>
          <EmptyState
            icono={Sparkles}
            titulo="Pregunta lo que quieras saber"
            descripcion="Elige una pregunta sugerida o escribe la tuya. Las respuestas se calculan con los datos actuales de la demo."
          />
        </SectionCard>
      ) : turno.tipo === "sin-coincidencia" ? (
        <SectionCard>
          <EmptyState
            icono={MessageCircleQuestion}
            titulo="Aún no sé responder eso"
            descripcion="Esta demo contesta sobre ocupación, cobranza, contratos, prospectos, proyectos y precios. Prueba con una de las preguntas sugeridas."
          />
        </SectionCard>
      ) : respuesta ? (
        <SectionCard titulo={turno.pregunta}>
          <div aria-live="polite" className="space-y-4">
            <p className="text-sm text-brand-text">{respuesta.texto}</p>
            <GraficaBarras
              grafica={respuesta.grafica}
              etiqueta={`Gráfica: ${turno.pregunta}`}
            />
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
