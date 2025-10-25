import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import Swal from "sweetalert2";

export const BillActions = ({ bill }: { bill: any }) => {
  const { deleteDocument, updateDocument, refreshData } = useFirestoreCRUD();
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState({
    name: bill.name || "",
    number: bill.number || "",
    note: bill.note || "",
  });
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the bill.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await deleteDocument("bills", bill.id);
        await refreshData("bills");
        Swal.fire("Deleted!", "Bill has been deleted.", "success");
      } catch (error: any) {
        Swal.fire("Error", error.message || "Failed to delete bill", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSave = async () => {
    try {
      setLoading(true);
      await updateDocument("bills", bill.id!, edited);
      Swal.fire("Updated!", "Bill details updated successfully.", "success");
      setOpen(false);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to update bill", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* ✏️ Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={edited.name}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Number</label>
              <Input
                value={edited.number}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, number: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Input
                value={edited.note}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};
