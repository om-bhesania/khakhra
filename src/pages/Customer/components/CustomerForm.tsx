import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useForm } from "@tanstack/react-form";
import { ChevronDown, IndianRupee, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function CustomerForm() {
  const { addDocument, readDocuments, subscribeToCollection } =
    useFirestoreCRUD();
  const [modes, setModes] = useState<string[]>([]);
  const [isLoadingModes, setIsLoadingModes] = useState(false);
  const [showNewModeInput, setShowNewModeInput] = useState(false);
  const [newModeName, setNewModeName] = useState("");
  const [isAddingMode, setIsAddingMode] = useState(false);

  // Load and subscribe payment modes
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

  const form = useForm({
    defaultValues: {
      name: "",
      number: "",
      paymentMode: "",
      paymentAmount: 0,
    },
    onSubmit: async ({ value }) => {
      try {
        const trimmedMode = value.paymentMode.trim();

        // Add customer
        await addDocument("customers", {
          name: value.name.trim(),
          number: value.number.trim(),
          paymentMode: trimmedMode,
          paymentAmount: Number(value.paymentAmount) || 0,
        });

        // If new mode, add to paymentModes
        if (trimmedMode && !modes.includes(trimmedMode)) {
          await addDocument("paymentModes", { name: trimmedMode });
        }

        // Reset form after submit
        toast.success("Customer created successfully");
        form.reset();
      } catch (error: any) {
        toast.error(error.message);
      }
    },
  });

  const modeItems = useMemo(
    () => modes.sort((a, b) => a.localeCompare(b)),
    [modes]
  );

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <form
          className="space-y-4 rounded-lg p-4 mt-12 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {/* Name */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Name is required" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Name
                </label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Customer name"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Number */}
          <form.Field
            name="number"
            validators={{
              onChange: ({ value }) =>
                !value.trim()
                  ? "Number is required"
                  : /\d{7,}/.test(value)
                  ? undefined
                  : "Enter a valid number",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Number
                </label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Contact number"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Payment Mode with dropdown + inline add-new UI */}
          <form.Field
            name="paymentMode"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Payment mode is required" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Payment Mode
                </label>
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
                            {field.state.value ||
                              (isLoadingModes
                                ? "Loading modes..."
                                : "Select mode")}
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
                          <DropdownMenuItem disabled>
                            No modes yet
                          </DropdownMenuItem>
                        )}
                        {modeItems.map((m) => (
                          <DropdownMenuItem
                            key={m}
                            onClick={() => field.handleChange(m)}
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
                                field.handleChange(trimmed);
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
                                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                Adding...
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
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Payment Amount */}
          <form.Field
            name="paymentAmount"
            validators={{
              onChange: ({ value }) =>
                Number(value) > 0 ? undefined : "Amount must be greater than 0",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Payment Amount
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                  inputMode="decimal"
                  placeholder="0.00"
                  contentLeft={<IndianRupee className="h-3.5 w-3.5" />}
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? "Saving..." : "Save Customer"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick View</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-zinc-500">Name</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.name?.trim() || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Number</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.number?.trim() || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Payment Mode</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.paymentMode?.trim() || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Payment Amount</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.paymentAmount
                          ? Number(values.paymentAmount).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </form.Subscribe>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CustomerForm;
