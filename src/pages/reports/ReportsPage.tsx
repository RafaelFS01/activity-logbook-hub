import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings } from "lucide-react";
import { ReportConfigCard } from "./ReportConfigCard";

const ReportsPage = () => {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Relatórios
        </h1>
        <p className="text-muted-foreground mt-2">
          Gere relatórios personalizados de atividades por cliente e período
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração de Relatório
            </CardTitle>
            <CardDescription>
              Configure os parâmetros do relatório antes de gerar o documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportConfigCard />
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ReportsPage;

