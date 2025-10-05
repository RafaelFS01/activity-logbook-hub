import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Database, Users } from "lucide-react";
import { migrateClientsWithReportIntroduction } from "@/services/firebase/clients";
import { toast } from "@/components/ui/use-toast";

interface MigrationResult {
  success: boolean;
  message: string;
}

const ClientMigration: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateClientsWithReportIntroduction();

      setMigrationResult(result);

      toast({
        title: "Migração Concluída",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });

    } catch (error: any) {
      const errorResult: MigrationResult = {
        success: false,
        message: error.message || "Erro desconhecido durante a migração"
      };

      setMigrationResult(errorResult);

      toast({
        variant: "destructive",
        title: "Erro na Migração",
        description: errorResult.message
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migração de Dados - Introdução do Relatório
        </CardTitle>
        <CardDescription>
          Atualiza todos os clientes existentes com o novo campo "Introdução do Relatório de Serviços"
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta operação adicionará o campo "Introdução do Relatório de Serviços" a todos os clientes que ainda não o possuem.
            O campo será criado vazio e poderá ser preenchido posteriormente na edição do cliente.
          </AlertDescription>
        </Alert>

        {migrationResult && (
          <Alert className={migrationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {migrationResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={migrationResult.success ? "text-green-800" : "text-red-800"}>
              {migrationResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Migração de clientes existentes
            </span>
          </div>

          <Button
            onClick={handleMigration}
            disabled={isMigrating}
            className="min-w-[120px]"
          >
            {isMigrating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Migrando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Executar Migração
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientMigration;
