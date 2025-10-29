import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function EmployeesForm() {
  const { addDocument, subscribeToCollection, readDocuments } = useFirestoreCRUD();
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const initial = await readDocuments<{ name: string }>("employees");
      setEmployees(initial.map((m) => String((m as any).name)).filter(Boolean));

      unsub = subscribeToCollection("employees", {
        onUpdate: (data: Array<{ name: string }>) => {
          setEmployees(data.map((d) => String(d.name)).filter(Boolean));
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
      phoneNumber: "",
      address: "",
      timingsStart: "",
      timingsEnd: "",
      dateOfJoining: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const payload: Record<string, any> = {
          name: value.name.trim(),
          phoneNumber: value.phoneNumber.trim(),
          dateOfJoining: value.dateOfJoining,
          role: "employee",
          timings: {
            start: value.timingsStart,
            end: value.timingsEnd,
            tz: "Asia/Kolkata",
          },
        };
        if (value.address.trim()) payload.address = value.address.trim();

        await addDocument("employees", payload);
        toast.success("Employee saved");
        form.reset();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save employee");
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
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => (value?.trim() ? undefined : "Enter a name"),
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">Name</label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Employee name"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="phoneNumber"
            validators={{
              onChange: ({ value }) => (String(value).trim() ? undefined : "Enter phone number"),
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">Phone Number</label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  inputMode="tel"
                  placeholder="98765 43210"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">Address (optional)</label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Address"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="timingsStart">
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm text-zinc-600 dark:text-zinc-300">Shift Start (IST)</label>
                  <Input
                    type="time"
                    value={String(field.state.value ?? "")}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="timingsEnd">
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm text-zinc-600 dark:text-zinc-300">Shift End (IST)</label>
                  <Input
                    type="time"
                    value={String(field.state.value ?? "")}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="dateOfJoining">
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">Date of Joining</label>
                <Input
                  type="date"
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit} className="bg-rose-600 text-white hover:bg-rose-700">
                {isSubmitting ? "Saving..." : "Save Employee"}
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
                        {values.name || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Phone</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.phoneNumber || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Timings (IST)</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.timingsStart && values.timingsEnd ? `${values.timingsStart} - ${values.timingsEnd}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Date of Joining</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.dateOfJoining || "—"}
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

export default EmployeesForm;


