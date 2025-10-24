import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { FilePen, Trash2 } from "lucide-react";
import React, { useEffect } from "react";
import Swal from "sweetalert2";

interface EditDeleteProps {
  type: "edit" | "delete";
  id: string;
  module: string;
}

function EditDelete({ type, id, module }: EditDeleteProps) {
  const { readDocuments, deleteDocumentsbyId, updateDocument, loading } =
    useFirestoreCRUD();
  const getDoc = async () => {
    const res = await readDocuments(module);
    console.log("res in editdelete feature", res);
  };

  useEffect(() => {
    getDoc();
  }, []);
  return (
    <>
      {type === "edit" && (
        <>
          <FilePen
            onClick={() => {}}
            className="cursor-pointer hover:text-primary h-4 w-4"
          />
        </>
      )}
      {type === "delete" && (
        <>
          <Trash2
            onClick={() => {}}
            className="cursor-pointer hover:text-primary h-4 w-4"
          />
        </>
      )}
    </>
  );
}

export default EditDelete;
