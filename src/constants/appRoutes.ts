import NotFound from "@/layout/NotFound";
import { BillingAdd, BillingView } from "@/pages/Billing/Billing";
import {
  CustomerAdd,
  CustomerHistory,
  CustomerView,
} from "@/pages/Customer/Customer";
import { InventoryAdd, InventoryView } from "@/pages/Inventory/Inventory";
import { EmployeesAdd, EmployeesView } from "@/pages/Employees/Employees";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AdminRolesView } from "@/pages/AdminRoles/AdminRoles";
import RBACSync from "@/pages/AdminRoles/RBACSync";
import AdminOrgs from "@/pages/AdminOrgs/AdminOrgs";
import AdminOrgMembers from "@/pages/AdminOrgs/AdminOrgMembers";
import AuditLogs from "@/pages/Roles/AuditLogs";
import RoleManagement from "@/pages/Roles/RoleManagement";
import {
  FileSpreadsheet,
  Home as HomeIcon,
  LucideBoxes,
  ReceiptIndianRupee,
  ScrollText,
  Settings as SettingIcon,
  Shield,
  User,
  UserPlus,
  UserRoundSearch,
  Users,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import Home from "./../pages/Home";
import Settings from "./../pages/Settings";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type AppRoute = {
  name: string;
  path: string;
  type: "public" | "private";
  icon?: IconType;
  element?: any;
  hideSidebar?: boolean;
  rbac?: {
    module: "dashboard" | "billing" | "inventory" | "customers" | "employees";
    action: "read" | "write" | "update" | "delete";
  };
  submenu?: Array<{
    name: string;
    path: string;
    icon?: IconType;
    hideSidebar?: boolean;
    element?: any;
    rbac?: {
      module: "dashboard" | "billing" | "inventory" | "customers" | "employees";
      action: "read" | "write" | "update" | "delete";
    };
  }>;
};

export const sidebarTitle = "Inventory Management System";

export const appRoutes: AppRoute[] = [
  {
    name: "Home",
    path: "/",
    type: "private",
    icon: HomeIcon,
    element: Home,
    rbac: { module: "dashboard", action: "read" },
  },
  {
    name: "Home",
    path: "/home",
    type: "private",
    icon: HomeIcon,
    element: Home,
    rbac: { module: "dashboard", action: "read" },
    hideSidebar: true,
  },
  {
    name: "Settings",
    path: "/settings",
    type: "private",
    icon: SettingIcon,
    element: Settings,
    hideSidebar: true,
  },

  // Public routes
  {
    name: "Login",
    path: "/login",
    type: "public",
    icon: Users,
    element: Login,
  },
  {
    name: "Register",
    path: "/register",
    type: "public",
    icon: Users,
    element: Register,
  },
  //   Example
  //   {
  //     name: "Projects",
  //     path: "/projects",
  //     type: "private",
  //     icon: Folder,
  //     element: Login,
  //     submenu: [
  //       {
  //         name: "Active",
  //         path: "/projects/active",
  //         icon: Layers,
  //         element: Register,
  //       },
  //     ],
  //   },
  // Exmaple ends
  {
    name: "Inventory",
    path: "/inventory",
    type: "private",
    icon: LucideBoxes,
    submenu: [
      {
        name: "View Inventory",
        path: "/inventory/view",
        element: InventoryView,
        rbac: { module: "inventory", action: "read" },
      },
      {
        name: "Add Inventory",
        path: "/inventory/add",
        element: InventoryAdd,
        rbac: { module: "inventory", action: "write" },
      },
    ],
  },
  {
    name: "Billing",
    path: "/billing",
    type: "private",
    icon: ReceiptIndianRupee,
    submenu: [
      {
        name: "View Bills",
        path: "/billing/view",
        icon: FileSpreadsheet,
        element: BillingView,
        rbac: { module: "billing", action: "read" },
      },
      {
        name: "Add Bill",
        path: "/billing/add",
        icon: ReceiptIndianRupee,
        element: BillingAdd,
        rbac: { module: "billing", action: "write" },
      },
    ],
  },
  {
    name: "Customer",
    path: "/customer",
    type: "private",
    icon: User,
    submenu: [
      {
        name: "View Customer",
        path: "/customer/view",
        icon: UserRoundSearch,
        element: CustomerView,
        rbac: { module: "customers", action: "read" },
      },
      {
        name: "Add Customer",
        path: "/customer/add",
        icon: UserPlus,
        element: CustomerAdd,
        rbac: { module: "customers", action: "write" },
      },
    ],
  },
  {
    name: "Employees",
    path: "/employees",
    type: "private",
    icon: Users,
    submenu: [
      {
        name: "View Employees",
        path: "/employees/view",
        element: EmployeesView,
        rbac: { module: "employees", action: "read" },
      },
      {
        name: "Add Employee",
        path: "/employees/add",
        element: EmployeesAdd,
        rbac: { module: "employees", action: "write" },
      },
    ],
  },
  {
    name: "Customer",
    path: "/customer/view/:id",
    type: "private",
    icon: User,
    hideSidebar: true,
    element: CustomerHistory,
    rbac: { module: "customers", action: "read" },
  },
  {
    name: "Settings",
    path: "/settings",
    type: "private",
    icon: SettingIcon,
    hideSidebar: true,
    element: Settings,
  },
  {
    name: "Admin Roles",
    path: "/admin/roles",
    type: "private",
    icon: Shield,
    element: AdminRolesView,
    hideSidebar: true,
  },
  {
    name: "RBAC Sync",
    path: "/admin/rbac-sync",
    type: "private",
    icon: Shield,
    element: RBACSync,
    hideSidebar: true,
  },
  {
    name: "Organizations",
    path: "/admin/orgs",
    type: "private",
    icon: Shield,
    element: AdminOrgs,
    hideSidebar: true,
  },
  {
    name: "Org Members",
    path: "/admin/orgs/:id/members",
    type: "private",
    icon: Shield,
    element: AdminOrgMembers,
    hideSidebar: true,
  },
  {
    name: "Role Management",
    path: "/roles",
    type: "private",
    icon: Shield,
    hideSidebar: true,
    submenu: [
      {
        name: "Manage Roles",
        path: "/roles/manage",
        icon: Users,
        element: RoleManagement,
      },
      {
        name: "Audit Logs",
        path: "/roles/audit",
        icon: ScrollText,
        element: AuditLogs,
      },
    ],
  },
  {
    name: "404",
    path: "/404",
    type: "private",
    icon: Users,
    element: NotFound,
    hideSidebar: true,
  },
];
