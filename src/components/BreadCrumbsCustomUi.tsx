import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { appRoutes } from "@/constants/appRoutes";
import React from "react";
import { Link, useLocation } from "react-router-dom";

function titleCase(input: string) {
  return input
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getNameForPath(path: string): string {
  // search top-level and submenu entries
  for (const r of appRoutes) {
    if (r.path === path) return r.name;
    if (r.submenu) {
      for (const s of r.submenu) {
        if (s.path === path) return s.name;
      }
    }
  }
  return titleCase(path.split("/").pop() || "");
}

const CustomBreadCrumbs: React.FC = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const items = segments.map((_, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return { href, label: getNameForPath(href) };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link to="/">Home</Link>
        </BreadcrumbItem>
        {items.map((item) => (
          <React.Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link to={item.href}>{item.label}</Link>
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default CustomBreadCrumbs;
