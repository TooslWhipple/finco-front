import {
  avisosDelDia,
  DEMO_TODAY,
  diaSemanaDe,
  idPlantilla,
  sumarDias,
  type DisparadorAviso,
  type EnvioAviso,
  type Factura,
  type PlantillaAviso,
  type ProgramacionAvisos,
} from "@/domain";

const FIRMA_CORREO = "\n\nSaludos,\nCobranza · Plazas Finco";

interface TextoBase {
  asunto: string;
  whatsapp: string;
  correo: string;
}

const TEXTOS: Record<DisparadorAviso, TextoBase> = {
  ANTES_3: {
    asunto: "Recordatorio: tu renta de {local} vence el {vencimiento}",
    whatsapp:
      "Hola {locatario}, te escribimos de Plazas Finco. Tu factura {folio} del local {local} en {plaza} por {monto} vence el {vencimiento}. Si ya programaste el pago, ignora este mensaje. ¡Gracias!",
    correo:
      "Estimado equipo de {locatario}:\n\nLes recordamos que la factura {folio} del local {local} en {plaza}, por {monto}, vence el {vencimiento}. Si ya programaron el pago, por favor ignoren este aviso.",
  },
  DIA_PAGO: {
    asunto: "Hoy vence la factura {folio} de {local}",
    whatsapp:
      "Hola {locatario}, hoy ({vencimiento}) vence tu factura {folio} del local {local} en {plaza} por {monto}. Quedamos al pendiente de tu comprobante de pago. ¡Gracias!",
    correo:
      "Estimado equipo de {locatario}:\n\nHoy, {vencimiento}, vence la factura {folio} del local {local} en {plaza}, por {monto}. Agradeceremos su comprobante de pago una vez realizado.",
  },
  ATRASO_5: {
    asunto: "Factura {folio} con {diasAtraso} días de atraso",
    whatsapp:
      "Hola {locatario}, tu factura {folio} del local {local} en {plaza} por {monto} lleva {diasAtraso} días vencida (venció el {vencimiento}). ¿Nos compartes la fecha estimada de pago?",
    correo:
      "Estimado equipo de {locatario}:\n\nLa factura {folio} del local {local} en {plaza}, por {monto}, venció el {vencimiento} y presenta {diasAtraso} días de atraso. Les pedimos regularizar el pago o indicarnos la fecha estimada.",
  },
  ATRASO_15: {
    asunto: "Seguimiento: factura {folio} con {diasAtraso} días de atraso",
    whatsapp:
      "{locatario}, tu factura {folio} del local {local} en {plaza} acumula {diasAtraso} días de atraso por {monto}. Te pedimos regularizar el pago esta semana para evitar cargos moratorios.",
    correo:
      "Estimado equipo de {locatario}:\n\nDa seguimiento a nuestro aviso anterior: la factura {folio} del local {local} en {plaza} acumula {diasAtraso} días de atraso por {monto}. Les pedimos regularizar el pago esta semana para evitar cargos moratorios.",
  },
  ATRASO_30: {
    asunto: "Aviso formal: {diasAtraso} días de atraso en la factura {folio}",
    whatsapp:
      "{locatario}, la factura {folio} del local {local} en {plaza} por {monto} cumple {diasAtraso} días de atraso. Para evitar acciones adicionales, necesitamos tu pago o un convenio de pago de inmediato.",
    correo:
      "Estimado equipo de {locatario}:\n\nLa factura {folio} del local {local} en {plaza}, por {monto}, cumple {diasAtraso} días de atraso. Este es un aviso formal: para evitar acciones adicionales, requerimos su pago o un convenio de pago a la brevedad.",
  },
};

/** Diez plantillas: cinco disparadores por dos canales. */
export function crearPlantillasAviso(): PlantillaAviso[] {
  return (Object.keys(TEXTOS) as DisparadorAviso[]).flatMap((disparador) => {
    const t = TEXTOS[disparador];
    return [
      {
        id: idPlantilla(disparador, "WHATSAPP"),
        canal: "WHATSAPP",
        disparador,
        cuerpo: t.whatsapp,
      },
      {
        id: idPlantilla(disparador, "CORREO"),
        canal: "CORREO",
        disparador,
        asunto: t.asunto,
        cuerpo: t.correo + FIRMA_CORREO,
      },
    ];
  });
}

export function crearProgramacionAvisos(): ProgramacionAvisos {
  return { activa: true, dias: ["VIE"], hora: "07:00" };
}

const HORA_MANUAL_SEMILLA = "11:30";

/**
 * Bitácora de las dos semanas previas a la demo: los días programados sale la corrida
 * y, entre semana, Cobranza manda los avisos a mano.
 */
export function crearEnviosAviso(
  facturas: Factura[],
  programacion: ProgramacionAvisos,
): EnvioAviso[] {
  const envios: EnvioAviso[] = [];
  for (let atras = 14; atras >= 1; atras--) {
    const fecha = sumarDias(DEMO_TODAY, -atras);
    const programado = programacion.dias.includes(diaSemanaDe(fecha));
    const manual = !["SAB", "DOM"].includes(diaSemanaDe(fecha));
    if (!programado && !manual) continue;
    for (const aviso of avisosDelDia(facturas, fecha)) {
      envios.push({
        id: `env-${envios.length + 1}`,
        facturaId: aviso.factura.id,
        plantillaId: idPlantilla(aviso.disparador, aviso.canal),
        canal: aviso.canal,
        enviadoEl: fecha,
        hora: programado ? programacion.hora : HORA_MANUAL_SEMILLA,
        origen: programado ? "PROGRAMADO" : "MANUAL",
      });
    }
  }
  return envios;
}
