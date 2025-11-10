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
