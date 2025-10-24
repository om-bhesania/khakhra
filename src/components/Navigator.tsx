import { Button } from "@/components/ui/button";
import { auth } from "@/config/firebase.config";
import { appRoutes, sidebarTitle } from "@/constants/appRoutes";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown, ChevronUp, Circle, LogOut, Minus } from "lucide-react";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import CustomBreadCrumbs from "./BreadCrumbsCustomUi";
import { ModeToggle } from "./themeToggle";
import { Avatar, AvatarFallback } from "./ui/avatar";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type MenuIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
export type MenuItem = {
  name: string;
  url?: string;
  icon?: MenuIcon;
  submenu?: Array<{ name: string; url: string; icon?: MenuIcon }>;
};

const routes: MenuItem[] = appRoutes
  .filter((r) => r.type === "private" && !r.hideSidebar)
  .map((r) => ({
    name: r.name,
    url: r.path !== "#" ? r.path : undefined,
    icon: (r.icon as MenuIcon) || undefined,
    submenu: r.submenu
      ?.filter((s) => !s.hideSidebar)
      .map((s) => ({
        name: s.name,
        url: s.path,
        icon: (s.icon as MenuIcon) || undefined,
      })),
  }));

function Navigator() {
  const location = useLocation();
  const { state, setOpen, isMobile } = useSidebar();
  const [hoverExpanded, setHoverExpanded] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
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
  const userData = auth.currentUser;

  const handleResize = () => {
    const sidebarLeft =
      state === "collapsed" && !isMobile ? "left-[48px]" : "left-[257px]";

    return sidebarLeft;
  };
 

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
            <span className="inline-flex items-center justify-center  h-full px-2 text-sm font-bold border-b">
              {state === "collapsed" ? appInitials : appTitle}
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {routes.map((item) => {
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
            <ModeToggle variant="button" />
            {/* <InitButton /> */}
            <Button
              variant="outline"
              onClick={useAuth().logout}
              className="w-full flex items-center justify-start gap-4"
            >
              <LogOut className="size-4" />
              <div className="font-medium">Logout</div>
            </Button>
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
          <div className="self-end">
            <Tooltip delayDuration={500}>
              <TooltipTrigger>
                <Avatar slot="button" className="h-6 w-6">
                  <AvatarFallback>
                    <span className="text-xs font-medium">
                      {userData?.email
                        ?.split("@")[0]
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{userData?.email}</TooltipContent>
            </Tooltip>
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
