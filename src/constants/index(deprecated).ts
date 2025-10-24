import type { MenuItem } from "@/components/Navigator";
import { Folder, Home, Layers, Settings } from "lucide-react";

export const routes: MenuItem[] = [
  { name: "Dashboard", url: "/", icon: Home },
  {
    name: "Projects",
    icon: Folder,
    submenu: [
      { name: "Active", url: "/projects/active", icon: Layers },
      { name: "Archived", url: "/projects/archived", icon: Layers },
    ],
  },
  { name: "Settings", url: "/settings", icon: Settings },
];
