import { Button } from "@/components/ui/button";
import { auth } from "@/config/firebase.config";
import { appRoutes, sidebarTitle } from "@/constants/appRoutes";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  LogOut,
  Minus,
  Settings,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import CustomBreadCrumbs from "./BreadCrumbsCustomUi";
import { ModeToggle } from "./themeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import { useRBAC } from "@/wrappers/RBACProvider";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";

type MenuIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
export type MenuItem = {
  name: string;
  url?: string;
  icon?: MenuIcon;
  submenu?: Array<{ name: string; url: string; icon?: MenuIcon }>;
};

function Navigator() {
  const location = useLocation();
  const { state, setOpen, isMobile } = useSidebar();
  const [hoverExpanded, setHoverExpanded] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>();
  const appTitle = sidebarTitle;
  const getInitials = (value: string) =>
    value
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  const appInitials = React.useMemo(() => getInitials(appTitle), [appTitle]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
    setIsDropdownOpen(!isDropdownOpen);
  };

  const isActive = (url?: string) => !!url && location.pathname === url;
  const isGroupActive = (item: MenuItem) =>
    !!item.submenu?.some((s) => isActive(s.url));
  const userData: any = auth.currentUser;
  console.log("userData", userData);
  const handleResize = () => {
    const sidebarLeft =
      state === "collapsed" && isMobile
        ? "md:left-[48px] !left-0"
        : "left-[257px] max-md:left-0";

    return sidebarLeft;
  };
  const nav = useNavigate();
  const { isAdminEmail, can } = useRBAC();

  const adminItems: { name: string; url: string; icon?: MenuIcon }[] =
    isAdminEmail
      ? [
          { name: "Admin Roles", url: "/admin/roles" },
          { name: "RBAC Sync", url: "/admin/rbac-sync" },
          {
            name: "Organizations",
            url: "/admin/orgs",
          },
          {
            name: "Org Members",
            url: "/admin/orgs/:id/members",
          },
        ]
      : [];

  const baseRoutes: MenuItem[] = useMemo(() => {
    return appRoutes
      .filter((r) => r.type === "private" && !r.hideSidebar)
      .map((r) => {
        const icon = (r.icon as MenuIcon) || undefined;
        // Filter submenu by RBAC if present
        const rawSubs = (r.submenu || []).filter((s) => !s.hideSidebar);
        const filteredSubs = rawSubs
          .filter((s) => {
            const meta = (s as any).rbac as
              | { module?: string; action?: any }
              | undefined;
            if (!meta) return true;
            return can(meta.module!, meta.action);
          })
          .map((s) => ({
            name: s.name,
            url: s.path,
            icon: (s.icon as MenuIcon) || undefined,
          }));

        if (filteredSubs.length > 0) {
          return { name: r.name, icon, submenu: filteredSubs } as MenuItem;
        }

        // If route originally had submenu but none are allowed now, hide the parent entirely
        if ((r.submenu || []).length > 0) {
          return null;
        }

        // No submenu originally: gate top-level by RBAC if metadata exists
        const meta = (r as any).rbac as
          | { module?: string; action?: any }
          | undefined;
        const allowed = !meta || can(meta.module!, meta.action);
        return allowed
          ? ({
              name: r.name,
              url: r.path !== "#" ? r.path : undefined,
              icon,
            } as MenuItem)
          : null;
      })
      .filter(Boolean) as MenuItem[];
  }, [can]);

  const displayRoutes = React.useMemo(() => {
    // Merge RBAC-filtered routes and admin-only items
    const base = [...baseRoutes];
    if (adminItems.length) {
      base.push({ name: "Admin", submenu: adminItems });
    }
    return base;
  }, [isAdminEmail, baseRoutes]);
  // Usage example
  const { getCurrentUserProfile } = useFirestoreCRUD();

  async function test() {
    const userProfileData = await getCurrentUserProfile();
    console.log("userProfile", userProfileData); // "admin", "user", etc.
    console.log("=====>", userProfileData?.role); // "admin", "user", etc.
    console.log("=====>", userProfileData?.displayName); // Custom fields
    setUserProfile(userProfileData);
  }
  useEffect(() => {
    test();
  }, []);

  return (
    <>
      <nav>
        <Sidebar
          collapsible="icon"
          onMouseEnter={() => {
            if (!isMobile && state === "collapsed") {
              setOpen(true);
              setHoverExpanded(true);
            }
          }}
          onMouseLeave={() => {
            if (!isMobile && hoverExpanded) {
              setOpen(false);
              setHoverExpanded(false);
            }
          }}
        >
          <SidebarHeader className="min-h-[45px] p-0 !border-b dark:border-gray-700">
            <span className="inline-flex items-center justify-center  h-full px-2 py-4 text-sm font-bold border-b">
              {state === "collapsed" ? appInitials : appTitle}
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {displayRoutes.map((item) => {
                    const active = isActive(item.url) || isGroupActive(item);
                    const Icon = item.icon || Circle;
                    return (
                      <SidebarMenuItem key={item.name}>
                        {item.submenu ? (
                          <>
                            <SidebarMenuButton
                              isActive={active}
                              onClick={() => toggleGroup(item.name)}
                              aria-expanded={!!openGroups[item.name]}
                              className="!justify-between w-full"
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Icon className="!w-[16px] !h-[16px]" />
                                <span className=" !text-sm font-normal">
                                  {item.name}
                                </span>
                              </div>
                              {item.submenu.length > 0 && !isDropdownOpen ? (
                                <ChevronDown />
                              ) : (
                                <ChevronUp />
                              )}
                            </SidebarMenuButton>
                            {openGroups[item.name] && (
                              <SidebarMenuSub className="pl-0">
                                {item.submenu.map((sub) => {
                                  // const SubIcon = sub.icon || Circle;
                                  return (
                                    <li key={sub.name}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isActive(sub.url)}
                                        className="pl-0"
                                      >
                                        <Link to={sub.url}>
                                          <Minus className="!w-2 !h-2" />
                                          <span>{sub.name}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </li>
                                  );
                                })}
                              </SidebarMenuSub>
                            )}
                          </>
                        ) : (
                          <SidebarMenuButton asChild isActive={active}>
                            <Link to={item.url || "#"}>
                              <Icon />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            {state === "collapsed" ? (
              <Button
                variant="outline"
                onClick={() => nav("/settings")}
                className="w-full flex items-center justify-start gap-4 !p-2"
              >
                <Settings className="size-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => nav("/settings")}
                className="w-full flex items-center justify-start gap-4"
              >
                <Settings className="size-4" />
                <div className="font-medium">Settings</div>
              </Button>
            )}
            {state === "collapsed" ? (
              <Button
                variant="destructive"
                onClick={useAuth().logout}
                className="w-full flex items-center justify-start gap-4 !p-2"
              >
                <LogOut className="size-4" />
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={useAuth().logout}
                className="w-full flex items-center justify-start gap-4"
              >
                <LogOut className="size-4" />
                <div className="font-medium">Logout</div>
              </Button>
            )}
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
      </nav>
      <SidebarInset className=" transition duration-300 ease-in-out">
        <div
          className={`flex items-center justify-between gap-2 p-2 border-b transition duration-300 ease-in-out fixed top-0 ${handleResize()} right-0 bg-white dark:bg-[#18181B] z-[10]`}
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="text-sm font-medium">
              <CustomBreadCrumbs />
            </div>
          </div>
          <div className="flex gap-2 self-end">
            <ModeToggle variant="switch" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 p-0 rounded-full hover:bg-muted transition-colors"
                >
                  <Avatar className="h-9 w-9 border border-muted">
                    <AvatarImage
                      src={userProfile?.photoURL || userData?.photoURL}
                      alt={userData?.displayName}
                    />
                    <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                      {userData?.displayName
                        ? userData.displayName.slice(0, 2).toUpperCase()
                        : userData?.email
                            ?.split("@")[0]
                            ?.slice(0, 2)
                            .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-60 rounded-xl shadow-lg border border-border bg-background p-1"
                align="end"
                sideOffset={6}
              >
                <DropdownMenuLabel className="font-normal px-3 py-2 border-b border-muted/40">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">
                      {userProfile?.displayName ||
                        userData?.displayName ||
                        "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userProfile?.email || userData?.email}
                    </p>

                    <p className="text-xs  text-muted-foreground truncate">
                      {userProfile?.phoneNumber || userData?.phoneNumber}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {userProfile?.role || userData?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1 border-t" />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => nav("/settings")}
                    className="flex items-center px-3 py-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={useAuth().logout}
                  className="flex items-center px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer mb-2"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span className="text-sm">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="container mt-[50px]">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}

export default Navigator;
