import Navigator from "../components/Navigator";
import { SidebarProvider } from "../components/ui/sidebar";
import { PasswordChangePrompt } from "@/components/PasswordChangePrompt";

function Layout() {
  return (
    <SidebarProvider> 
      <Navigator />
      <PasswordChangePrompt />
    </SidebarProvider>
  );
}

export default Layout;
