
import { SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "./MainSidebar";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MainSidebar />
        <div className="flex-1 overflow-auto">
          <main className="min-h-screen">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
