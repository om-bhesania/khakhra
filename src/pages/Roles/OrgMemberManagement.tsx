import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useOrgRBAC, type OrgMember, type OrgRole } from "@/hooks/use-orgRBAC";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const OrgMemberManagement = () => {
  const {
    organizationId,
    isOwner,
    loading: rbacLoading,
    getOrgMembers,
    getOrgRoles,
    assignRoleToMember,
    reload,
  } = useOrgRBAC();

  const { readRootDocuments } = useFirestoreCRUD();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; email?: string; displayName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId && isOwner) {
      loadData();
    }
  }, [organizationId, isOwner]);

  const loadData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const [membersData, rolesData, usersData] = await Promise.all([
        getOrgMembers(organizationId),
        getOrgRoles(organizationId),
        readRootDocuments<any>("users", { limit: 500 } as any),
      ]);

      setMembers(membersData);
      setRoles(rolesData);
      setUsers(usersData.map((u: any) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
      })));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, roleId: string) => {
    if (!organizationId) return;

    setAssigningRole(memberId);
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) {
        toast.error("Member not found");
        return;
      }

      await assignRoleToMember(organizationId, member.userId, roleId);
      await loadData();
      await reload();
      toast.success("Role assigned successfully");
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    } finally {
      setAssigningRole(null);
    }
  };

  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user || { email: "Unknown", displayName: "Unknown User" };
  };

  if (rbacLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Member Management</CardTitle>
            <CardDescription>Manage organization members and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You are not part of an organization. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Member Management</CardTitle>
            <CardDescription>Manage organization members and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only organization owners can manage members.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Member Management</CardTitle>
          <CardDescription>
            Manage organization members and assign roles to control their access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const userInfo = getUserInfo(member.userId);
                const isAssigning = assigningRole === member.id;
                const memberRole = roles.find((r) => r.id === member.roleId);

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={undefined} />
                          <AvatarFallback>
                            {userInfo.displayName
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {userInfo.displayName || "Unknown User"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{userInfo.email || "No email"}</TableCell>
                    <TableCell>
                      {memberRole ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {memberRole.name}
                          {memberRole.isSystem && " (System)"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.roleId || ""}
                        onValueChange={(value) =>
                          handleRoleChange(member.id, value)
                        }
                        disabled={isAssigning}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                              {role.isSystem && " (System)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isAssigning && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No members found in this organization.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgMemberManagement;

