import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

function CustomerForm() {
  const { addDocument, readDocuments, subscribeToCollection } =
    useFirestoreCRUD();
  //@ts-ignore
  const [modes, setModes] = useState<string[]>([]);

  const [nameFromUrl, setNameFromUrl] = useState<string>("");
  const location = useLocation();
  // Get name from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const name = urlParams.get("name");
    setNameFromUrl(name || "");
  }, []);

  // Load and subscribe payment modes
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const initial = await readDocuments<{ name: string }>("paymentModes");
      setModes(initial.map((m) => String((m as any).name)).filter(Boolean));

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
      packets: "",
    },
    onSubmit: async ({ value }) => {
      try {
        // Add customer
        const customerData: any = {
          name: value.name.trim(),
          number: value.number.trim(),
        };

        // Add packets if provided
        if (value.packets && value.packets.trim()) {
          const packetsNum = parseInt(value.packets.trim(), 10);
          if (!isNaN(packetsNum) && packetsNum > 0) {
            customerData.manuallyAddedPackets = packetsNum;
          }
        }

        await addDocument("customers", customerData);

        // Reset form after submit
        toast.success("Customer created successfully");
        form.reset();
      } catch (error: any) {
        toast.error(error.message);
      }
    },
  });

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
                  value={field.state.value || nameFromUrl}
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
                  : /\d{10,}/.test(value)
                  ? undefined
                  : "Enter a valid number",
              onChangeAsync: async ({ value }) => {
                const trimmedValue = value?.trim();
                if (!trimmedValue || !/\d{10,}/.test(trimmedValue)) {
                  return undefined; // Let the sync validator handle format errors
                }

                try {
                  const existingCustomers = await readDocuments<any>("customers", {
                    where: [
                      {
                        field: "number",
                        operator: "==",
                        value: trimmedValue,
                      },
                    ],
                  });

                  if (existingCustomers && existingCustomers.length > 0) {
                    return "This phone number is already registered";
                  }
                  return undefined;
                } catch (error) {
                  console.error("Error checking duplicate number:", error);
                  // Don't block submission if check fails, but log it
                  return undefined;
                }
              },
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
                  inputMode="tel"
                  maxLength={10}
                  minLength={10}
                  pattern="[0-9]*"
                  title="Please enter a valid number"
                  required
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

          {/* Packets (Optional - for backfilling) */}
          <form.Field
            name="packets"
            validators={{
              onChange: ({ value }) => {
                if (value && value.trim()) {
                  const num = parseInt(value.trim(), 10);
                  if (isNaN(num) || num < 0) {
                    return "Please enter a valid number";
                  }
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Packets (Optional)
                  <span className="text-xs text-zinc-400 ml-1">
                    - For backfilling previous data
                  </span>
                </label>
                <Input
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  inputMode="numeric"
                  min="0"
                  placeholder="Enter number of packets"
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
                      <div className="text-zinc-500">Packets</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.packets?.trim() || "—"}
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
