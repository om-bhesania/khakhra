import Navigator from "../components/Navigator";
import { SidebarProvider } from "../components/ui/sidebar";
import { PasswordChangePrompt } from "@/components/PasswordChangePrompt";
import { LowStockAlert } from "@/components/LowStockAlert";

function Layout() {
  return (
    <SidebarProvider> 
      <Navigator />
      <PasswordChangePrompt />
      <LowStockAlert />
    </SidebarProvider>
  );
}

export default Layout;
