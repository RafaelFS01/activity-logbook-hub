
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import MainSidebar from "./MainSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelRightClose } from "lucide-react";

// This is a separate component to be able to use the useSidebar hook
const SidebarToggleButton = () => {
  const { toggleSidebar, state } = useSidebar();
  
  return (
    <Button
      onClick={toggleSidebar}
      variant="outline"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-md bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground transition-all duration-200"
      title={state === "expanded" ? "Retrair barra lateral" : "Expandir barra lateral"}
    >
      {state === "expanded" ? (
        <PanelRightClose className="h-5 w-5 transition-transform duration-200" />
      ) : (
        <PanelLeft className="h-5 w-5 transition-transform duration-200" />
      )}
      <span className="sr-only">
        {state === "expanded" ? "Retrair barra lateral" : "Expandir barra lateral"}
      </span>
    </Button>
  );
};

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
        <SidebarToggleButton />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
