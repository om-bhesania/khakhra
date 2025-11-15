import { CustomerCombobox } from "@/components/ComboBox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { COMPANY_CONFIG } from "@/lib/utils";
import { ChevronDown, FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  generateBillHTML,
  printBill,
  type BillData,
} from "../../../lib/billGenerator";

type LineItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  fullItem?: any;
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
    lineItems: [{ itemId: "", itemName: "", quantity: 1, rate: 0 }],
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
  const [isYesterday, setIsYesterday] = useState(false);
  const [manualDate, setManualDate] = useState<string>("");

  const todayKey = useMemo(() => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }, []);

  const yesterdayKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }, []);

  const getYesterdayTimestamp = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999); // Set to end of yesterday
    return Timestamp.fromDate(yesterday);
  }, []);

  const getManualDateTimestamp = useCallback((dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    date.setHours(18, 0, 0, 0); // Set to 6 PM (18:00)
    return Timestamp.fromDate(date);
  }, []);

  const getManualDateKey = useCallback((dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }, []);

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

    // Get the most recent bill overall (linear progression across all days)
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
          // Extract sequence number from the most recent bill and increment it
          // This ensures linear progression regardless of date
          if (parts.length === 3) {
            const lastSeq = parseInt(parts[2], 10);
            if (!isNaN(lastSeq) && lastSeq >= 0) {
              newSequence = String(lastSeq + 1).padStart(4, "0");
            }
          }
        } catch (err) {
          console.error("Failed to parse last invoice ID:", err);
        }
      }

      // Always use today's date in the invoice ID, but sequence continues linearly
      return `INV/${todayKey}/${newSequence}`;
    },
    [todayKey]
  );

  useEffect(() => {
    (async () => {
      const mostRecentBill = await getMostRecentBill();
      const recentInvoiceId = mostRecentBill?.invoiceId;
      const newInvoiceId = await generateInvoiceId(recentInvoiceId);

      setValues((v) => ({ ...v, id: newInvoiceId }));

      const inv = await readDocuments("inventory", { limit: 100 });
      const updatedInventory = inv.map((item: any) =>
        item.quantity === 0 ? { ...item, name: "No Items Left" } : item
      );

      setInventory(updatedInventory);
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

  const submit = async (e: FormEvent, shouldPrint = false) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let seq = 0;
      let finalId: string = values.id;

      if (idLocked || !finalId) {
        // Get the most recent bill overall to generate next ID (linear progression)
        const mostRecentBill = await getMostRecentBill();
        const recentInvoiceId = mostRecentBill?.invoiceId;
        finalId = await generateInvoiceId(recentInvoiceId);
        const parts = finalId.split("/");
        seq = parseInt(parts[2], 10) || 0;
      } else {
        // If ID is manually set, extract sequence from it
        const parts = finalId.split("/");
        if (parts.length === 3) {
          seq = parseInt(parts[2], 10) || 0;
        }
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

      // Determine dateKey and createdAt based on manual date, isYesterday, or default
      let finalDateKey: string;
      let finalCreatedAt: Timestamp | undefined;
      let isManualDate = false;

      if (manualDate) {
        // Manual date takes priority
        const manualKey = getManualDateKey(manualDate);
        const manualTimestamp = getManualDateTimestamp(manualDate);
        if (manualKey && manualTimestamp) {
          finalDateKey = manualKey;
          finalCreatedAt = manualTimestamp;
          isManualDate = true;
        } else {
          // Fallback to today if manual date is invalid
          finalDateKey = todayKey;
        }
      } else if (isYesterday) {
        // Use yesterday's date
        finalDateKey = yesterdayKey;
        finalCreatedAt = getYesterdayTimestamp();
      } else {
        // Default to today
        finalDateKey = todayKey;
      }

      // Append manual date note if date was manually entered
      let finalNote = values.note || "";
      if (isManualDate) {
        const manualDateNote = "Date and time manually entered.";
        if (finalNote) {
          finalNote = `${finalNote} ${manualDateNote}`;
        } else {
          finalNote = manualDateNote;
        }
      }

      const billData = {
        invoiceId: finalId,
        sequence: seq,
        dateKey: finalDateKey,
        customerId: selectedCustomerId,
        name: customerName || values.name,
        number: customerPhone || values.number,
        note: finalNote,
        gstEnabled: values.gstEnabled,
        gstPercent: Number(values.gstPercent) || 0,
        cgst,
        sgst,
        subtotal,
        total,
        paymentMode: values.paymentMode,
        lineItems: values.lineItems,
        exisitingCustomerData: {
          id: selectedCustomerId,
          name: customerName,
          phone: customerPhone,
        },
        ...(finalCreatedAt && { createdAt: finalCreatedAt }),
        ...(isManualDate && { isManualDate: true }),
      };

      await addDocument("bills", billData);

      // Print after saving if requested
      if (shouldPrint) {
        const printData: BillData = {
          companyName: COMPANY_CONFIG.name,
          companyAddress: COMPANY_CONFIG.address,
          companyCity: COMPANY_CONFIG.city,
          companyPhone: COMPANY_CONFIG.phone,
          receiptNumber: finalId,
          date: new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          userName: customerName || values.name || "Guest",
          items: values.lineItems.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            rate: item.rate,
            discount: 0,
          })),
          cartDiscount: 0,
          cgst: values.gstEnabled ? cgst : 0,
          sgst: values.gstEnabled ? sgst : 0,
          subtotal,
          total,
          paymentMode: values.paymentMode || "Cash",
        };

        const htmlContent = generateBillHTML(printData);
        printBill(htmlContent);
      }

      const storageKey = `invoice_sequence_${todayKey}`;
      localStorage.setItem(storageKey, seq.toString());

      setSubmitting(false);
      setIdLocked(false);

      // Generate next invoice ID by incrementing from the saved bill
      const nextInvoice = await generateInvoiceId(finalId);

      setValues({
        id: nextInvoice,
        name: "",
        number: "",
        note: "",
        gstEnabled: false,
        paymentMode: "",
        gstPercent: 18,
        lineItems: [{ itemId: "", itemName: "", quantity: 1, rate: 0 }],
        exisitingCustomerData: {
          id: "",
          name: "",
          phone: "",
        },
      });

      setSelectedCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setIsYesterday(false);
      setManualDate("");

      nav("/billing/view");
      toast.success("Bill saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save bill");
      setSubmitting(false);
    }
  };

  const saveAndPrintInvoice = (e: FormEvent) => {
    submit(e, true);
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
                        fullItem: it,
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
                    disabled={true}
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
              Click to add new item
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

        {/* Manual Date Entry */}
        <div>
          <label className="mb-1 block text-sm font-medium">Manual Date (Optional)</label>
          <Input
            type="date"
            value={manualDate}
            onChange={(e) => {
              setManualDate(e.target.value);
              // Clear isYesterday when manual date is set
              if (e.target.value) {
                setIsYesterday(false);
              }
            }}
            placeholder="Select date for manual entry"
            className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            onFocus={(e) => {
              // Open calendar picker when input is focused
              if (e.target.showPicker) {
                e.target.showPicker();
              }
            }}
          />
          {manualDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Date and time will be set to {new Date(manualDate).toLocaleDateString()} at 6:00 PM
            </p>
          )}
        </div>

        {/* Is Yesterday's Checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="isYesterday"
            checked={isYesterday}
            disabled={!!manualDate}
            onCheckedChange={(checked) => {
              setIsYesterday(checked === true);
              // Clear manual date when isYesterday is checked
              if (checked) {
                setManualDate("");
              }
            }}
          />
          <label htmlFor="isYesterday" className="text-sm font-medium cursor-pointer">
            Is yesterday's {manualDate && "(disabled when manual date is set)"}
          </label>
        </div>

        {/* GST */}
        {/* <div className="flex items-center gap-2 pt-2">
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
        </div> */}

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
            onClick={saveAndPrintInvoice}
            disabled={
              submitting ||
              values.lineItems.length === 0 ||
              values.lineItems.some((li) => !li.itemId || li.quantity <= 0)
            }
          >
            <FileDown className="size-4" />
            Save & Print
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
    </Card>
  );
};

export default BillingForm;

