import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ModulePermission } from '@/types/rbac';
import { useState } from 'react';


interface PermissionMatrixProps {
  modules: Array<{ id: string; name: string }>;
  permissions: Record<string, ModulePermission>;
  onUpdatePermissions: (moduleId: string, permissions: ModulePermission) => Promise<void>;
  readOnly?: boolean;
}

export function PermissionMatrix({ modules, permissions, onUpdatePermissions, readOnly = false }: PermissionMatrixProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<ModulePermission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePermissionChange = (moduleId: string, key: keyof ModulePermission, value: boolean) => {
    const currentPermissions = permissions[moduleId] || { create: false, read: false, update: false, delete: false };
    const newPermissions = { ...currentPermissions, [key]: value };
    setSelectedModule(moduleId);
    setTempPermissions(newPermissions);
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedModule || !tempPermissions) return;

    try {
      await onUpdatePermissions(selectedModule, tempPermissions);
      setIsDialogOpen(false);
      setTempPermissions(null);
      setSelectedModule(null);
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Create</TableHead>
            <TableHead>Read</TableHead>
            <TableHead>Update</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((module) => {
            const modulePermissions = permissions[module.id] || {
              create: false,
              read: false,
              update: false,
              delete: false,
            };

            return (
              <TableRow key={module.id}>
                <TableCell className="font-medium">{module.name}</TableCell>
                {Object.entries(modulePermissions).map(([key, value]) => (
                  <TableCell key={key}>
                    <Checkbox
                      checked={value}
                      disabled={readOnly}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module.id, key as keyof ModulePermission, !!checked)
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Permission Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to update these permissions?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}