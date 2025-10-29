import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { RBAC_DEFINITION } from "@/utils/Constants";
import { AdminOnlyRoute } from "@/wrappers/RBACRoute";
import { useState } from "react";

export default function RBACSync() {
  const { addDocument, updateDocument, readDocuments } = useFirestoreCRUD();
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSync = async () => {
    try {
      // roles collection
      await Promise.all(
        Object.entries(RBAC_DEFINITION).map(async ([role, def]) => {
          const existing = await readDocuments<any>("roles", {
            where: [{ field: "name", operator: "==", value: role }],
            limit: 1,
          } as any);
          if (existing.length) {
            await updateDocument("roles", existing[0].id, def as any);
          } else {
            await addDocument("roles", { name: role, ...def } as any);
          }
        })
      );

      // permissions collection (module aggregated actions)
      const modules: Record<string, string[]> = {};
      Object.values(RBAC_DEFINITION).forEach((rd: any) => {
        Object.entries(rd.module || {}).forEach(([mod, actions]) => {
          modules[mod] = Array.from(new Set([...(modules[mod] || []), ...(actions as string[])]));
        });
      });
      await Promise.all(
        Object.entries(modules).map(async ([mod, actions]) => {
          const existing = await readDocuments<any>("permissions", {
            where: [{ field: "name", operator: "==", value: mod }],
            limit: 1,
          } as any);
          if (existing.length) {
            await updateDocument("permissions", existing[0].id, { actions } as any);
          } else {
            await addDocument("permissions", { name: mod, actions } as any);
          }
        })
      );

      // RolesAndPermssions/default single doc
      const existingMerged = await readDocuments<any>("RolesAndPermssions", {
        where: [{ field: "_key", operator: "==", value: "default" }],
        limit: 1,
      } as any);
      if (existingMerged.length) {
        await updateDocument("RolesAndPermssions", existingMerged[0].id, RBAC_DEFINITION as any);
      } else {
        await addDocument("RolesAndPermssions", { _key: "default", ...RBAC_DEFINITION } as any);
      }

      toast.success("RBAC synced successfully");
    } catch (e: any) {
      toast.error(e?.message || "RBAC sync failed");
    }
  };

  const handleCreateUserDoc = async () => {
    try {
      if (!uid || !email) {
        toast.error("UID and Email are required");
        return;
      }
      const existing = await readDocuments<any>("users", {
        where: [{ field: "uid", operator: "==", value: uid }],
        limit: 1,
      } as any);
      if (existing.length) {
        toast.info("User doc already exists");
        return;
      }
      await addDocument("users", {
        uid,
        email,
        displayName: displayName || null,
        photoURL: photoURL || null,
        phoneNumber: phoneNumber || null,
        role: "user",
        provider: "manual",
        createdAt: new Date(),
      } as any);
      toast.success("User doc created");
      setUid("");
      setEmail("");
      setDisplayName("");
      setPhotoURL("");
      setPhoneNumber("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create user doc");
    }
  };

  return (
    <AdminOnlyRoute>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Sync RBAC</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSync} className="bg-rose-600 text-white hover:bg-rose-700">Sync Now</Button>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Backfill Firestore User Doc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Firebase Auth UID" value={uid} onChange={(e) => setUid(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Display Name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input placeholder="Photo URL (optional)" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} />
              <Input placeholder="Phone Number (optional)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
            <div>
              <Button onClick={handleCreateUserDoc}>Create User Doc</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminOnlyRoute>
  );
}


