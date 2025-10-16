import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type LineItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
};

type BillingFormValues = {
  id: string;
  name: string;
  number: string;
  note?: string;
  gstEnabled: boolean;
  gstPercent: number;
  lineItems: LineItem[];
};

const BillingForm = () => {
  const { addDocument, readDocuments, readDocById, updateDocument } =
    useFirestoreCRUD();
  const [values, setValues] = useState<BillingFormValues>({
    id: "",
    name: "",
    number: "",
    note: "",
    gstEnabled: false,
    gstPercent: 18,
    lineItems: [],
  });
  const [idLocked, setIdLocked] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);

  const todayKey = useMemo(() => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }, []);

  const generateInvoiceId = useCallback(async () => {
    const items = await readDocuments<any>("bills", {
      where: [{ field: "dateKey", operator: "==", value: todayKey }],
    });
    console.log("items", items);
    const next = (items?.[0]?.sequence || 0) + 1;
    const seq = String(next).padStart(4, "0");
    return { id: `INV/${todayKey}/${seq}`, sequence: next };
  }, [readDocuments, todayKey]);
  useEffect(() => {
    (async () => {
      const { id } = await generateInvoiceId();
      setValues((v) => ({ ...v, id }));

      const inv = await readDocuments<any>("inventory", { limit: 100 });

      const updatedInventory = inv.map((item) =>
        item.quantity === 0 ? { name: "No Items Left" } : item
      );

      setInventory(updatedInventory);
    })();
  }, [generateInvoiceId, readDocuments]);
  const addLineItem = () => {
    setValues((v) => ({
      ...v,
      lineItems: [
        ...v.lineItems,
        { itemId: "", itemName: "", quantity: 1, rate: 0 },
      ],
    }));
  };

  const removeLineItem = (idx: number) => {
    setValues((v) => ({
      ...v,
      lineItems: v.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const setLineItem = (idx: number, patch: Partial<LineItem>) => {
    setValues((v) => ({
      ...v,
      lineItems: v.lineItems.map((li, i) =>
        i === idx ? { ...li, ...patch } : li
      ),
    }));
  };

  const subtotal = useMemo(
    () =>
      values.lineItems.reduce(
        (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.rate) || 0),
        0
      ),
    [values.lineItems]
  );
  const gstAmount = useMemo(
    () =>
      values.gstEnabled
        ? (subtotal * (Number(values.gstPercent) || 0)) / 100
        : 0,
    [subtotal, values.gstEnabled, values.gstPercent]
  );
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const total = subtotal + gstAmount;

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    setValues((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let seq = 0;
      let finalId = values.id;
      if (idLocked || !finalId) {
        const g = await generateInvoiceId();
        finalId = g.id;
        seq = g.sequence;
      }

      for (const li of values.lineItems) {
        if (!li.itemId || !li.quantity) continue;
        const doc = await readDocById<any>("inventory", li.itemId);
        if (doc) {
          const currentQty = Number((doc as any).quantity) || 0;
          const newQty = Math.max(0, currentQty - Number(li.quantity));
          await updateDocument("inventory", li.itemId, { quantity: newQty });
        }
      }

      await addDocument("bills", {
        invoiceId: finalId,
        sequence: seq,
        dateKey: todayKey,
        name: values.name,
        number: values.number,
        note: values.note,
        gstEnabled: values.gstEnabled,
        gstPercent: Number(values.gstPercent) || 0,
        cgst,
        sgst,
        subtotal,
        total,
        lineItems: values.lineItems,
      });

      setSubmitting(false);
      setIdLocked(true);
      setValues({
        id: "",
        name: "",
        number: "",
        note: "",
        gstEnabled: false,
        gstPercent: 18,
        lineItems: [],
      });
      toast.success("Bill saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save bill");
      setSubmitting(false);
    }
  };

  const printInvoice = () => {
    const printContent = document.getElementById("printable-invoice");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${values.id}</title><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/index.css" /></head><body>${printContent.innerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Invoice ID</label>
            <div className="flex items-center gap-2">
              <Input
                name="id"
                value={values.id}
                onChange={onChange}
                disabled={idLocked}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIdLocked((v) => !v)}
              >
                {idLocked ? "Custom ID" : "Lock"}
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              name="name"
              value={values.name}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Number</label>
            <Input name="number" value={values.number} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Note</label>
            <Input name="note" value={values.note} onChange={onChange} />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_100px_120px_140px] gap-2 border-b bg-muted/50 px-2 py-2 text-xs font-medium">
            <div>Item</div>
            <div className="text-right">Quantity</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>
          {values.lineItems.map((li, idx) => {
            const amount = (Number(li.quantity) || 0) * (Number(li.rate) || 0);
            return (
              <div
                key={idx}
                className="grid grid-cols-[1fr_100px_120px_140px] items-center gap-2 px-2 py-2 border-b last:border-b-0"
              >
                <Select
                  value={li.itemId}
                  onValueChange={(val: string) => {
                    const it = inventory.find((i) => i.id === val);
                    console.log("it", it);
                    setLineItem(idx, {
                      itemId: val,
                      itemName: it ? it.name ?? it.category ?? it.id : "",
                      rate: it ? Number(it.sellingPrice) || 0 : li.rate,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="truncate">
                            {it.name ?? it.category ?? it.id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ₹ {Number(it.sellingPrice) || 0}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Input
                    className="text-right"
                    type="number"
                    min={0}
                    value={String(li.quantity)}
                    onChange={(e) =>
                      setLineItem(idx, { quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Input
                    className="text-right"
                    type="number"
                    min={0}
                    disabled={true} // Disable manual rate editing
                    value={String(li.rate)}
                    onChange={(e) =>
                      setLineItem(idx, { rate: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex items-center justify-end text-right pr-1">
                  <span> ₹ {amount.toFixed(2)}</span>
                  <div className="col-span-4 flex justify-end py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(idx)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="px-2 py-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLineItem}
            >
              <Plus className="size-4" />
              Line item
            </Button>
          </div>
        </div>

        {/* GST */}
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="gstEnabled"
            checked={values.gstEnabled}
            onCheckedChange={(c: any) =>
              setValues((v) => ({ ...v, gstEnabled: Boolean(c) }))
            }
          />
          <label htmlFor="gstEnabled" className="text-sm">
            Apply GST
          </label>
          {values.gstEnabled ? (
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm flex-shrink-0">GST %</span>
              <Input
                className="w-20 text-right"
                name="gstPercent"
                value={String(values.gstPercent)}
                onChange={onChange}
              />
            </div>
          ) : null}
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-sm">Subtotal: ₹ {subtotal.toFixed(2)}</div>
          {values.gstEnabled ? (
            <>
              <div className="text-sm">CGST: ₹ {cgst.toFixed(2)}</div>
              <div className="text-sm">SGST: ₹ {sgst.toFixed(2)}</div>
            </>
          ) : null}
          <div className="text-sm font-medium">Total: ₹ {total.toFixed(2)}</div>
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={printInvoice}>
            <FileDown className="size-4" />
            Print Invoice
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              values.lineItems.length === 0 ||
              values.lineItems.some((li) => !li.itemId || li.quantity <= 0)
            }
          >
            {submitting ? "Saving..." : "Save Bill"}
          </Button>
        </div>
      </form>

      {/* Printable area */}
      <div id="printable-invoice" className="hidden print:block">
        <div className="p-6">
          <div className="mb-4 text-xl font-semibold">Invoice</div>
          <div className="mb-2 text-sm">Invoice ID: {values.id}</div>
          <div className="mb-2 text-sm">Name: {values.name}</div>
          <div className="mb-4 text-sm">Number: {values.number}</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Item</th>
                <th className="border px-2 py-1 text-right">Qty</th>
                <th className="border px-2 py-1 text-right">Rate</th>
                <th className="border px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {values.lineItems.map((li, idx) => {
                const amount =
                  (Number(li.quantity) || 0) * (Number(li.rate) || 0);
                return (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{li.itemName}</td>
                    <td className="border px-2 py-1 text-right">
                      {li.quantity}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      ₹ {Number(li.rate).toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      ₹ {amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 text-right">
            <div>Subtotal: ₹ {subtotal.toFixed(2)}</div>
            {values.gstEnabled ? (
              <>
                <div>CGST: ₹ {cgst.toFixed(2)}</div>
                <div>SGST: ₹ {sgst.toFixed(2)}</div>
              </>
            ) : null}
            <div className="font-semibold">Total: ₹ {total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BillingForm;
