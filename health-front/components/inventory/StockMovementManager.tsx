"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";

type Movement = {
  id: string;
  createdAt: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  medicine: { name: string };
  batch: { batchNo: string };
  transferredBy: { fullName: string };
};

type BatchOption = { id: string; batchNo: string; medicine: { name: string } };
type BatchWithLocation = BatchOption & {
  locationType?: string | null;
  locationId?: string | null;
  quantity?: number;
};

export function StockMovementManager({
  initialRows,
  batches,
}: {
  initialRows: Movement[];
  batches: BatchWithLocation[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [movementType, setMovementType] = useState<"GENERAL_TRANSFER" | "RETURN_TO_MAIN">(
    "GENERAL_TRANSFER",
  );
  const [values, setValues] = useState({
    batchId: "",
    quantity: "1",
    toLocationType: "WAREHOUSE",
    toLocationId: "",
  });

  const sourceBatches =
    movementType === "RETURN_TO_MAIN"
      ? batches.filter(
          (b) =>
            (b.locationType === "NURSE" || b.locationType === "USER") &&
            Boolean(b.locationId) &&
            (b.quantity ?? 0) > 0,
        )
      : batches;

  async function refresh() {
    const res = await fetch("/api/inventory/stock-movements", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh");
    setRows((await res.json()) as Movement[]);
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudToolbar title="Stock Movements" description="Transfer stock and monitor movement history." />
      <form
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const destinationType =
            movementType === "RETURN_TO_MAIN" ? "WAREHOUSE" : values.toLocationType;
          const destinationId = movementType === "RETURN_TO_MAIN" ? null : values.toLocationId || null;
          const res = await fetch("/api/inventory/stock-movements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batchId: values.batchId,
              quantity: Number(values.quantity),
              toLocationType: destinationType,
              toLocationId: destinationId,
            }),
          });
          if (!res.ok) {
            toast.error((await res.text().catch(() => "")) || "Transfer failed");
            return;
          }
          await refresh();
          setValues((v) => ({
            ...v,
            batchId: sourceBatches[0]?.id ?? "",
            quantity: "1",
            toLocationId: movementType === "RETURN_TO_MAIN" ? "" : v.toLocationId,
          }));
          toast.success("Transfer completed");
        }}
      >
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Movement Type</span>
          <SelectBase
            value={movementType}
            onChange={(e) => {
              const next = e.target.value as "GENERAL_TRANSFER" | "RETURN_TO_MAIN";
              setMovementType(next);
              setValues((v) => ({
                ...v,
                batchId:
                  next === "RETURN_TO_MAIN"
                    ? batches.find(
                        (b) =>
                          (b.locationType === "NURSE" || b.locationType === "USER") &&
                          Boolean(b.locationId) &&
                          (b.quantity ?? 0) > 0,
                      )?.id ?? ""
                    : batches[0]?.id ?? "",
                toLocationType: next === "RETURN_TO_MAIN" ? "WAREHOUSE" : v.toLocationType,
                toLocationId: next === "RETURN_TO_MAIN" ? "" : v.toLocationId,
              }));
            }}
          >
            <option value="GENERAL_TRANSFER">General transfer</option>
            <option value="RETURN_TO_MAIN">Return from user sub-store to main store</option>
          </SelectBase>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Source Batch</span>
          <SelectBase
            value={values.batchId}
            onChange={(e) => setValues((v) => ({ ...v, batchId: e.target.value }))}
          >
            <option value="">
              {sourceBatches.length === 0 ? "No eligible source batches" : "Select source batch"}
            </option>
            {sourceBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.medicine.name} - {b.batchNo}
                {b.locationType ? ` [${b.locationType}${b.locationId ? `:${b.locationId}` : ""}]` : ""}
                {typeof b.quantity === "number" ? ` (qty ${b.quantity})` : ""}
              </option>
            ))}
          </SelectBase>
        </label>
        <Input label="Quantity" name="quantity" type="number" value={values.quantity} onChange={(e) => setValues((v) => ({ ...v, quantity: e.target.value }))} required />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Destination Type</span>
          <SelectBase
            value={movementType === "RETURN_TO_MAIN" ? "WAREHOUSE" : values.toLocationType}
            disabled={movementType === "RETURN_TO_MAIN"}
            onChange={(e) => setValues((v) => ({ ...v, toLocationType: e.target.value }))}
          >
            <option value="WAREHOUSE">Warehouse</option>
            <option value="NURSE">Nurse</option>
            <option value="VEHICLE">Vehicle</option>
          </SelectBase>
        </label>
        <Input
          label={movementType === "RETURN_TO_MAIN" ? "Destination" : "Destination Id (optional)"}
          name="toLocationId"
          value={movementType === "RETURN_TO_MAIN" ? "MAIN_STORE" : values.toLocationId}
          disabled={movementType === "RETURN_TO_MAIN"}
          onChange={(e) => setValues((v) => ({ ...v, toLocationId: e.target.value }))}
        />
        <div className="sm:col-span-4 flex justify-end">
          <Button type="submit" variant="create" disabled={!values.batchId}>
            {movementType === "RETURN_TO_MAIN" ? "Return to Main Store" : "Transfer"}
          </Button>
        </div>
      </form>
      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{row.medicine?.name ?? "—"}</TableCell>
                <TableCell>{row.batch?.batchNo ?? "—"}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.fromLocationId}</TableCell>
                <TableCell>{row.toLocationId}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.transferredBy?.fullName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
