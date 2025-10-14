import NotFound from "@/layout/NotFound";
import { CustomerAdd, CustomerView } from "@/pages/Customer/Customer";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import {
  Home as HomeIcon,
  LucideBoxes,
  Settings as SettingIcon,
  User,
  UserPlus,
  UserRoundSearch,
  Users,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import Home from "./../pages/Home";
import Settings from "./../pages/Settings";
import { InventoryAdd, InventoryView } from "@/pages/Inventory/Inventory";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export type AppRoute = {
  name: string;
  path: string;
  type: "public" | "private";
  icon?: IconType;
  element?: any;
  hideSidebar?: boolean;
  submenu?: Array<{
    name: string;
    path: string;
    icon?: IconType;
    hideSidebar?: boolean;
    element?: any;
  }>;
};

export const sidebarTitle = "Inventory Management System";

export const appRoutes: AppRoute[] = [
  { name: "Home", path: "/", type: "private", icon: HomeIcon, element: Home },
  {
    name: "Home",
    path: "/home",
    type: "private",
    icon: HomeIcon,
    element: Home,
    hideSidebar: true,
  },
  {
    name: "Settings",
    path: "/settings",
    type: "private",
    icon: SettingIcon,
    element: Settings,
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
      },
      {
        name: "Add Inventory",
        path: "/inventoory/add",
        element: InventoryAdd,
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
      },
      {
        name: "Add Customer",
        path: "/customer/add",
        icon: UserPlus,
        element: CustomerAdd,
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
