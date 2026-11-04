import type { DiferenciaConciliacion } from "@/domain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoneda } from "@/lib/format";

interface DialogoDiferenciasProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  diferencias: readonly DiferenciaConciliacion[];
  folios: ReadonlyMap<string, string>;
}

export function DialogoDiferencias({
  abierto,
  onAbiertoChange,
  diferencias,
  folios,
}: DialogoDiferenciasProps) {
  const total = diferencias.reduce((s, d) => s + d.monto, 0);
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Diferencias de conciliación</DialogTitle>
          <DialogDescription>
            Pagos que no coinciden con la póliza de EnKontrol. Total {formatMoneda(total)}
            .
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-brand-line">
          {diferencias.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text">{d.concepto}</p>
                <p className="text-xs text-brand-text-muted">
                  Factura {folios.get(d.facturaId) ?? d.facturaId}
                </p>
              </div>
              <span className="text-sm font-medium text-brand-primary tabular-nums">
                {formatMoneda(d.monto)}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
