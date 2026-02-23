import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductCombobox } from "@/components/ComboBox";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useForm } from "@tanstack/react-form";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { SchemeFormValues, SchemeProduct } from "@/types/scheme";

function SchemeForm() {
  const { addDocument, readDocuments } = useFirestoreCRUD();
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SchemeProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const navigate = useNavigate();

  // Load inventory
  useEffect(() => {
    (async () => {
      const inv = await readDocuments("inventory");
      setInventory(inv);
    })();
  }, [readDocuments]);

  // Filter out already selected products
  const availableProducts = inventory.filter(
    (product) => !selectedProducts.some(p => p.productId === product.id)
  );

  const handleProductSelect = (product: any) => {
    if (!product) return;
    
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
      },
    ]);
    setSelectedProductId(""); // Reset selection
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId));
  };

  const form = useForm({
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
    },
    onSubmit: async ({ value }: any) => {
      // Validation
      if (!value.name || value.name.trim().length === 0) {
        toast.error("Please enter scheme name");
        return;
      }

      if (!value.startDate) {
        toast.error("Please select start date");
        return;
      }

      if (!value.endDate) {
        toast.error("Please select end date");
        return;
      }

      if (selectedProducts.length === 0) {
        toast.error("Please add at least one product to the scheme");
        return;
      }

      // Validate date range
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      
      if (end < start) {
        toast.error("End date must be after start date");
        return;
      }

      try {
        const now = new Date();
        const isActive = start <= now && now <= end;

        const payload = {
          name: value.name.trim(),
          products: selectedProducts,
          startDate: Timestamp.fromDate(start),
          endDate: Timestamp.fromDate(end),
          isActive,
        };

        await addDocument("schemes", payload);
        toast.success("Scheme created successfully!");
        navigate("/schemes/view");
      } catch (err: any) {
        toast.error(err?.message || "Failed to create scheme");
        console.error("❌ Error creating scheme:", err);
      }
    },
  });

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Scheme</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            {/* Scheme Name */}
            <form.Field name="name">
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Scheme Name <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter scheme name"
                  />
                </div>
              )}
            </form.Field>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startDate">
                {(field) => (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Start Date <span className="text-rose-600">*</span>
                    </label>
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="endDate">
                {(field) => (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      End Date <span className="text-rose-600">*</span>
                    </label>
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Product Combobox */}
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Add Products <span className="text-rose-600">*</span>
              </label>
              <ProductCombobox
                products={availableProducts}
                value={selectedProductId}
                onSelect={handleProductSelect}
                placeholder="Search and select products..."
                searchPlaceholder="Search by name or barcode..."
                showBarcodes={true}
              />
              <p className="text-xs text-muted-foreground">
                Select products to add to this scheme
              </p>
            </div>

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Selected Products ({selectedProducts.length})
                </label>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                    >
                      <div>
                        <div className="font-medium">{product.productName}</div>
                        {product.barcode && (
                          <div className="text-xs text-gray-500">
                            Barcode: {product.barcode}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(product.productId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="bg-rose-600 text-white hover:bg-rose-700"
                  >
                    {isSubmitting ? "Creating..." : "Create Scheme"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/schemes/view")}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchemeForm;
