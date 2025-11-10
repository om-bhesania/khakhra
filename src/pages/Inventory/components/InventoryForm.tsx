import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useForm } from "@tanstack/react-form";
import { IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function InventoryForm() {
  const { addDocument, subscribeToCollection, readDocuments } =
    useFirestoreCRUD();
  const [inventory, setInventory] = useState<string[]>([]);

  // Load and subscribe payment modes
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const initial = await readDocuments<{ name: string }>("inventory");
      setInventory(
        initial.map((m) => String((m as any).price)).filter(Boolean)
      );

      unsub = subscribeToCollection("inventory", {
        onUpdate: (data: Array<{ name: string }>) => {
          setInventory(data.map((d) => String(d.name)).filter(Boolean));
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
      price: 0,
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      // Hidden/optional (for future usage)
      flavour: "",
      minStockAlertLevel: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      try {
        const payload: Record<string, any> = {
          name: value.name.trim(),
          price: Number(value.price) || 0,
          quantity: Number(value.quantity) || 0,
          costPrice: Number(value.costPrice) || 0,
          sellingPrice: Number(value.sellingPrice) || 0,
        };

        const trimmedFlavour = value.flavour?.trim();
        if (trimmedFlavour) {
          payload.flavour = trimmedFlavour;
        }

        if (
          value.minStockAlertLevel !== undefined &&
          value.minStockAlertLevel !== null &&
          value.minStockAlertLevel !== ("" as any)
        ) {
          payload.minStockAlertLevel = Number(value.minStockAlertLevel);
        }

        await addDocument("inventory", payload);
        `                                                                                                                               `;
        toast.success("Inventory item saved");
        form.reset();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save inventory item");
      }
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <form
          className="space-y-4 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 mt-12 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {/* Price */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                value.trim().length > 0 ? undefined : "Enter a valid name",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Name
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  inputMode="text"
                  placeholder="name"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Price */}
          <form.Field
            name="price"
            validators={{
              onChange: ({ value }) =>
                Number(value) > 0 ? undefined : "Enter a valid price",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Category
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

          {/* Quantity */}
          <form.Field
            name="quantity"
            validators={{
              onChange: ({ value }) =>
                Number(value) >= 0 ? undefined : "Enter a valid quantity",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Quantity
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                  inputMode="numeric"
                  placeholder="0"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Cost Price */}
          <form.Field
            name="costPrice"
            validators={{
              onChange: ({ value }) =>
                Number(value) >= 0 ? undefined : "Enter a valid cost price",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Cost Price
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

          {/* Selling Price */}
          <form.Field
            name="sellingPrice"
            validators={{
              onChange: ({ value }) =>
                Number(value) >= 0 ? undefined : "Enter a valid selling price",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Selling Price
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

          {/* Hidden future fields: flavour, minStockAlertLevel */}
          <form.Field name="flavour">
            {(field) => (
              <input type="hidden" value={field.state.value} readOnly />
            )}
          </form.Field>
          <form.Field name="minStockAlertLevel">
            {(field) => (
              <input
                type="hidden"
                value={String(field.state.value ?? "")}
                readOnly
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isSubmitting ? "Saving..." : "Save Stock"}
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
                        {values.price
                          ? values.name
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Price</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.price
                          ? Number(values.price).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Quantity</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.quantity
                          ? Number(values.quantity).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Cost Price</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.costPrice
                          ? Number(values.costPrice).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Selling Price</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.sellingPrice
                          ? Number(values.sellingPrice).toLocaleString()
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

export default InventoryForm;
