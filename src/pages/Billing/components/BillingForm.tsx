import { CustomerCombobox } from "@/components/ComboBox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { FileDown, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, IndianRupee, Loader2 } from "lucide-react";
import { invoiceTemplate } from "./printInvoiceTemplate";
type LineItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  fullItem?: any; // ✅ optional, full product data
};

type BillingFormValues = {
  id: string;
  name: string;
  number: string;
  note?: string;
  gstEnabled: boolean;
  gstPercent: number;
  lineItems: LineItem[];
  paymentMode: string;
  exisitingCustomerData: {
    id: string;
    name: string;
    phone: string;
  };
};

const BillingForm = () => {
  const {
    addDocument,
    readDocuments,
    readDocById,
    updateDocument,
    loading,
    subscribeToCollection,
  } = useFirestoreCRUD();
  const [values, setValues] = useState<BillingFormValues>({
    id: "",
    name: "",
    number: "",
    note: "",
    gstEnabled: false,
    gstPercent: 18,
    paymentMode: "",
    lineItems: [],
    exisitingCustomerData: {
      id: "",
      name: "",
      phone: "",
    },
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [modes, setModes] = useState<string[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(false);
  const [showNewModeInput, setShowNewModeInput] = useState(false);
  const [newModeName, setNewModeName] = useState("");
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [idLocked, setIdLocked] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [custData, setCustData] = useState<any>([]);
  const [Loading, setLoading] = useState<boolean>(false);
  const todayKey = useMemo(() => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }, []);

  // get customer data

  const fetchCustomreData = async () => {
    const custData = await readDocuments("customers");
    setCustData(custData);
  };
  useEffect(() => {
    fetchCustomreData();
  }, []);
  const modeItems = useMemo(
    () => modes.sort((a, b) => a.localeCompare(b)),
    [modes]
  );
  const getMostRecentBill = useCallback(async () => {
    const bills = await readDocuments("bills");

    if (!bills || bills.length === 0) return null;

    // Find most recent by createdAt
    const mostRecent = bills.reduce((prev, curr) => {
      const prevTime = prev?.createdAt?.seconds || 0;
      const currTime = curr?.createdAt?.seconds || 0;
      return currTime > prevTime ? curr : prev;
    });

    return mostRecent;
  }, []);

  const generateInvoiceId = useCallback(
    async (recentBillId?: string) => {
      let newSequence = "0001";

      if (recentBillId) {
        try {
          const parts = recentBillId.split("/");
          const lastSeq = parseInt(parts[2], 10);
          newSequence = String(lastSeq + 1).padStart(4, "0");
        } catch (err) {
          console.error("Failed to parse last invoice ID:", err);
        }
      }
console.log("newSequence", newSequence);
      return `INV/${todayKey}/${newSequence}`;
    },
    [todayKey]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);

      const mostRecentBill = await getMostRecentBill();
      const recentInvoiceId = mostRecentBill?.invoiceId;

      const newInvoiceId = await generateInvoiceId(recentInvoiceId);

      // Set invoice id into form values
      setValues((v) => ({ ...v, id: newInvoiceId }));

      // Fetch inventory (optional)
      const inv = await readDocuments("inventory", { limit: 100 });
      const updatedInventory = inv.map((item: any) =>
        item.quantity === 0 ? { ...item, name: "No Items Left" } : item
      );

      setInventory(updatedInventory);
      setLoading(false);
    })();
  }, [getMostRecentBill, generateInvoiceId]);
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      setIsLoadingModes(true);
      const initial = await readDocuments<{ name: string }>("paymentModes");
      setModes(initial.map((m) => String((m as any).name)).filter(Boolean));
      setIsLoadingModes(false);

      unsub = subscribeToCollection("paymentModes", {
        onUpdate: (data: Array<{ name: string }>) => {
          setModes(data.map((d) => String(d.name)).filter(Boolean));
        },
      } as any);
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [readDocuments, subscribeToCollection]);

  // Add items in invoice
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

  // handdle submit
  const test = generateInvoiceId();
console.log("====>0",test)
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let seq = 0;
      let finalId: string = values.id;

      if (idLocked || !finalId) {
        finalId = await generateInvoiceId(); // await here
        const parts = finalId.split("/"); // ["INV", "yyMMdd", "0001"]
        seq = parseInt(parts[2], 10) || 0;
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

      const res = await addDocument("bills", {
        invoiceId: values.id ||finalId,
        sequence: seq,
        dateKey: todayKey,
        customerId: selectedCustomerId,
        name: values.name || customerName,
        number: values.number || customerPhone,
        note: values.note,
        gstEnabled: values.gstEnabled,
        gstPercent: Number(values.gstPercent) || 0,
        cgst,
        sgst,
        subtotal,
        total,
        paymentMode: values.paymentMode, // ✅ ADD THIS LINE
        lineItems: values.lineItems,
        exisitingCustomerData: {
          id: selectedCustomerId,
          name: customerName,
          phone: customerPhone,
        },
      });

      console.log("res =====>", res);
      // ONLY update localStorage AFTER successful bill creation
      const storageKey = `invoice_sequence_${todayKey}`;
      localStorage.setItem(storageKey, seq.toString());

      setSubmitting(false);
      setIdLocked(false);

      // Generate new invoice ID for the next bill
      const nextInvoice: any = generateInvoiceId();
console.log("nextInvoice", nextInvoice);
      setValues({
        id: nextInvoice.id,
        name: "",
        number: "",
        note: "",
        gstEnabled: false,
        paymentMode: "",
        gstPercent: 18,
        lineItems: [],
        exisitingCustomerData: {
          id: "",
          name: "",
          phone: "",
        },
      });
      nav("/billing/view");
      toast.success("Bill saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save bill");
      setSubmitting(false);
    }
  };

  const printInvoice = (values: any) => {
    console.log("values", values);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = invoiceTemplate(values);

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Invoice - ${values.invoiceId}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
  const nav = useNavigate();

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Invoice ID</label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <Input
                  name="id"
                  value={values.id}
                  onChange={(e) => setValues({ ...values, id: e.target.value })}
                  disabled={idLocked || loading}
                />
              </div>
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
            {/* <Input
              name="name"
              value={values.name}
              onChange={onChange}
              required
            /> */}
            <CustomerCombobox
              customers={custData}
              value={selectedCustomerId}
              onSelect={(customer) => {
                if (customer) {
                  setSelectedCustomerId(customer.id);
                  setCustomerName(customer.name);
                  setCustomerPhone(customer.number || "");
                }
              }}
              onCreateNew={(name) => {
                setSelectedCustomerId("");
                setCustomerName(name);
                setCustomerPhone("");
                nav(`/customer/add?name=${name}`);
              }}
              placeholder="Select or search customer..."
              searchPlaceholder="Type to search..."
              allowCreateNew={true}
              createNewText="Add New Customer"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Number</label>
            <Input
              name="number"
              value={customerPhone || values.number}
              onChange={onChange}
            />
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
                    if (it) {
                      setLineItem(idx, {
                        ...li,
                        itemId: val,
                        itemName: it.name ?? it.category ?? it.id,
                        rate: Number(it.sellingPrice) || 0,
                        fullItem: it, // ✅ store full item data here
                      });
                    }
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

        {/* Payment Mode */}
        <div>
          <label className="mb-1 block text-sm font-medium">Payment Mode</label>
          {!showNewModeInput ? (
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {values.paymentMode ||
                        (isLoadingModes ? "Loading modes..." : "Select mode")}
                    </span>
                    <div className="inline-flex items-center gap-2">
                      {isAddingMode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-64 overflow-auto w-[var(--radix-dropdown-menu-trigger-width)]"
                >
                  {modeItems.length === 0 && (
                    <DropdownMenuItem disabled>No modes yet</DropdownMenuItem>
                  )}
                  {modeItems.map((m) => (
                    <DropdownMenuItem
                      key={m}
                      onClick={() =>
                        setValues((v) => ({ ...v, paymentMode: m }))
                      }
                    >
                      {m}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="text-rose-600 font-medium"
                    onClick={() => {
                      setShowNewModeInput(true);
                      setNewModeName("");
                    }}
                  >
                    + Add new Mode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={newModeName}
                onChange={(e) => setNewModeName(e.target.value)}
                placeholder="Enter new mode name"
                contentRight={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setNewModeName("");
                        setShowNewModeInput(false);
                      }}
                      disabled={isAddingMode}
                      className="h-7 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={async () => {
                        const trimmed = newModeName.trim();
                        if (!trimmed) return;
                        try {
                          setIsAddingMode(true);
                          if (!modes.includes(trimmed)) {
                            await addDocument("paymentModes", {
                              name: trimmed,
                            });
                          }
                          setValues((v) => ({ ...v, paymentMode: trimmed }));
                          setShowNewModeInput(false);
                          setNewModeName("");
                        } finally {
                          setIsAddingMode(false);
                        }
                      }}
                      disabled={isAddingMode}
                      className="h-7 px-2 text-xs"
                    >
                      {isAddingMode ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Adding...
                        </span>
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </>
                }
              />
            </div>
          )}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => printInvoice(values)}
          >
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
