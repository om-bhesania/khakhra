import Navigator from "../components/Navigator";
import { SidebarProvider } from "../components/ui/sidebar";

function Layout() {
  return (
    <SidebarProvider> 
      <Navigator />
    </SidebarProvider>
  );
}

export default Layout;
