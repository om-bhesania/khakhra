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

type GenericActionsProps = {
  collection: string; // Firestore collection name
  record: Record<string, any>; // The current row’s data
  editableFields?: string[]; // Which fields can be edited
  labelMap?: Record<string, string>; // Optional display names for fields
  onAfterUpdate?: (updatedRecord: Record<string, any>) => void;
  onAfterDelete?: () => void; // Callback after successful delete
};

export const GenericActions = ({
  collection,
  record,
  editableFields = [],
  labelMap = {},
  onAfterUpdate,
  onAfterDelete,
}: GenericActionsProps) => {
  const { deleteDocument, updateDocument } = useFirestoreCRUD();
  const [open, setOpen] = useState(false);
  const resolvedCollection = record.__collectionPath || collection;
  const [edited, setEdited] = useState<any>(() =>
    editableFields.reduce(
      (acc, key) => ({ ...acc, [key]: record[key] || "" }),
      {}
    )
  );
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: `This will permanently delete this ${collection.slice(0, -1)}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await deleteDocument(resolvedCollection, record.id);

        // ✅ Update parent state immediately
        onAfterDelete?.();

        Swal.fire("Deleted!", "Record deleted successfully.", "success");
      } catch (error: any) {
        Swal.fire("Error", error.message || "Failed to delete record", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSave = async () => {
    try {
      setLoading(true);
      await updateDocument(resolvedCollection, record.id!, edited);

      // ✅ Update parent state immediately
      onAfterUpdate?.(edited);

      Swal.fire("Updated!", "Changes saved successfully.", "success");
      setOpen(false);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to update record", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* ✏️ Edit */}
      {editableFields.length > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit {collection.slice(0, -1)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {editableFields.map((field) => (
                <div key={field}>
                  <label className="text-sm font-medium">
                    {labelMap[field] || field}
                  </label>
                  <Input
                    value={edited[field]}
                    onChange={(e) =>
                      setEdited((prev: any) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}

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
      )}

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
