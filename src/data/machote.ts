/**
 * Machote del contrato de arrendamiento: texto predefinido con variables
 * `{nombre}` que `renderContrato` sustituye por los datos del contrato.
 * Es un dato (no código) para que se pueda ajustar a las necesidades de Finco.
 */

export const VARIABLES_MACHOTE = [
  "arrendatario",
  "rfc",
  "local",
  "plaza",
  "m2",
  "rentaMensual",
  "rentaLetra",
  "plazoMeses",
  "inicio",
  "fin",
  "deposito",
  "mesesGracia",
  "regla",
  "folio",
] as const;

export type VariableMachote = (typeof VARIABLES_MACHOTE)[number];

export interface ClausulaMachote {
  titulo: string;
  texto: string;
}

export interface FirmaMachote {
  rol: string;
  /** Texto con variables; aparece bajo la línea de firma. */
  nombre: string;
}

export interface Machote {
  titulo: string;
  proemio: string;
  clausulas: ClausulaMachote[];
  firmas: FirmaMachote[];
}

export const MACHOTE_ARRENDAMIENTO: Machote = {
  titulo: "Contrato de arrendamiento de local comercial",
  proemio:
    'Contrato {folio} de arrendamiento que celebran, por una parte, Finco Desarrollos, S.A. de C.V. (en adelante, "el Arrendador") y, por la otra, {arrendatario}, con RFC {rfc} (en adelante, "el Arrendatario"), al tenor de las siguientes cláusulas.',
  clausulas: [
    {
      titulo: "Objeto",
      texto:
        "El Arrendador concede al Arrendatario el uso temporal del Local {local}, de {m2} m², ubicado en la plaza {plaza}, para su operación comercial conforme al giro autorizado.",
    },
    {
      titulo: "Renta",
      texto:
        "El Arrendatario pagará una renta mensual de {rentaMensual} ({rentaLetra}), más el impuesto aplicable, por mes adelantado y dentro de los primeros cinco días de cada mes.",
    },
    {
      titulo: "Plazo",
      texto:
        "El contrato tendrá una vigencia forzosa de {plazoMeses} meses, del {inicio} al {fin}.",
    },
    {
      titulo: "Depósito en garantía",
      texto:
        "A la firma, el Arrendatario entregará un depósito en garantía de {deposito}, que se devolverá al término del contrato, descontando los adeudos y daños que, en su caso, existan.",
    },
    {
      titulo: "Meses de gracia",
      texto:
        "El Arrendatario gozará de {mesesGracia} mes(es) de gracia sin renta al inicio de la vigencia, para adecuar y acondicionar el local.",
    },
    {
      titulo: "Actualización anual",
      texto: "La renta se actualizará cada año conforme a la regla pactada: {regla}.",
    },
    {
      titulo: "Mantenimiento",
      texto:
        "El Arrendatario conservará el local en buen estado y cubrirá la cuota de mantenimiento de áreas comunes que fije el Arrendador para la plaza. El Arrendador atenderá el mantenimiento de las áreas comunes.",
    },
    {
      titulo: "Causas de rescisión",
      texto:
        "Será causa de rescisión sin responsabilidad para el Arrendador la falta de pago de dos rentas consecutivas, el cambio de giro sin autorización por escrito, el subarrendamiento total o parcial y el incumplimiento grave de cualquiera de las obligaciones de este contrato.",
    },
    {
      titulo: "Jurisdicción",
      texto:
        "Para la interpretación y el cumplimiento de este contrato, las partes se someten a los tribunales competentes de la ciudad donde se ubica la plaza {plaza}, renunciando a cualquier otro fuero que pudiera corresponderles.",
    },
  ],
  firmas: [
    { rol: "El Arrendador", nombre: "Finco Desarrollos, S.A. de C.V." },
    { rol: "El Arrendatario", nombre: "{arrendatario}" },
  ],
};
