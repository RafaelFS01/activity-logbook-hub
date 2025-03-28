
import { SidebarProvider } from "@/components/ui/sidebar";
import MainSidebar from "./MainSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// Componente de botão para controlar a barra lateral
const SidebarControlButton = () => {
  const { toggleSidebar, state } = useSidebar();
  
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
      onClick={toggleSidebar}
      title={state === "expanded" ? "Retrair barra lateral" : "Estender barra lateral"}
    >
      <PanelLeft className={`h-4 w-4 transition-transform ${state === "expanded" ? "rotate-180" : ""}`} />
      <span className="sr-only">
        {state === "expanded" ? "Retrair barra lateral" : "Estender barra lateral"}
      </span>
    </Button>
  );
};

const AppLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <MainSidebar />
        <div className="flex-1 overflow-auto">
          <main className="min-h-screen p-4">
            <Outlet />
          </main>
          <SidebarControlButton />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
