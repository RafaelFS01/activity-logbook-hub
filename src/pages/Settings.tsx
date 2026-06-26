import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, Database, Settings as SettingsIcon, Users, FileText, 
  Sparkles, Eye, EyeOff, Loader2 
} from "lucide-react";
import ClientMigration from "@/components/settings/ClientMigration";
import { useAuth } from "@/contexts/AuthContext";
import { getGeminiSettings, saveGeminiSettings } from "@/services/firebase/settings";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [customModel, setCustomModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  // Carregar configurações do Gemini
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const config = await getGeminiSettings();
        if (config) {
          setApiKey(config.apiKey || "");
          const standardModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
          if (standardModels.includes(config.model)) {
            setModel(config.model);
            setCustomModel("");
          } else {
            setModel("custom");
            setCustomModel(config.model || "");
          }
          setLastUpdated(config.updatedAt || null);
          setUpdatedBy(config.updatedBy || null);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações do Gemini:", err);
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: "Não foi possível carregar as configurações do Gemini do banco."
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    if (user && ['admin', 'manager'].includes(user.role || '')) {
      fetchConfig();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    const targetApiKey = apiKey.trim();
    const targetModel = model === "custom" ? customModel.trim() : model;

    if (!targetApiKey) {
      toast({
        variant: "destructive",
        title: "Chave de API requerida",
        description: "Preencha a chave de API antes de salvar."
      });
      return;
    }

    if (model === "custom" && !targetModel) {
      toast({
        variant: "destructive",
        title: "Modelo customizado requerido",
        description: "Preencha o nome do modelo customizado."
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveGeminiSettings(
        {
          apiKey: targetApiKey,
          model: targetModel,
          updatedBy: user.uid
        },
        user.uid
      );

      toast({
        title: "Configurações salvas!",
        description: "A integração com o Gemini foi atualizada no banco de dados."
      });

      setLastUpdated(new Date().toISOString());
      setUpdatedBy(user.uid);
    } catch (err) {
      console.error("Erro ao salvar configurações do Gemini:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível gravar as configurações no banco."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "Chave obrigatória",
        description: "Insira uma chave de API para testar."
      });
      return;
    }

    setIsTesting(true);
    try {
      const selectedModel = model === "custom" ? customModel : model;
      const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey.trim()}`;
      
      const payload = {
        contents: [{
          role: "user",
          parts: [{ text: "Diga 'Conexão OK' em português, bem curto." }]
        }],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.1
        }
      };

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro desconhecido na API.");
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sucesso";

      toast({
        title: "Conexão estabelecida!",
        description: `Resposta da IA: "${responseText.trim()}"`
      });
    } catch (err: any) {
      console.error("Erro ao testar conexão:", err);
      toast({
        variant: "destructive",
        title: "Falha na conexão",
        description: err.message || "Erro ao conectar com a API Gemini."
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Verifica se o usuário tem permissão para acessar configurações
  if (!user || !['admin', 'manager'].includes(user.role || '')) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-10 border rounded-lg bg-card shadow-sm max-w-md">
            <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground mb-6">
              Você não tem permissão para acessar esta página.
            </p>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Início
        </Button>

        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground">
          Gerencie configurações avançadas e ferramentas administrativas do sistema.
        </p>
      </div>

      <Tabs defaultValue="migration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Migração de Dados
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="migration" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Migração do Campo "Introdução do Relatório de Serviços"
                </CardTitle>
                <CardDescription>
                  Atualize todos os clientes existentes com o novo campo de introdução para relatórios.
                </CardDescription>
              </CardHeader>
            </Card>

            <ClientMigration />
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card className="border border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg dark:bg-indigo-950/40">
                  <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Integração com o Gemini</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-0.5">
                    Configure as chaves e modelos de Inteligência Artificial para resumos, dúvidas eSocial e comandos de voz.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {isLoadingConfig ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                  <p className="text-sm text-muted-foreground">Carregando configurações...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {/* Chave de API */}
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key" className="text-sm font-semibold flex items-center gap-1.5">
                      Chave de API do Gemini
                    </Label>
                    <div className="relative">
                      <Input
                        id="gemini-key"
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Insira a chave de API AIzaSy..."
                        className="pr-10 w-full"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title={showKey ? "Ocultar chave" : "Mostrar chave"}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal mt-1">
                      A chave de API é obtida no <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">Google AI Studio</a>. Esta chave é armazenada de forma segura em nosso banco de dados.
                    </p>
                  </div>

                  {/* Modelo do Gemini */}
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model" className="text-sm font-semibold">Modelo de Linguagem</Label>
                    <Select
                      value={model}
                      onValueChange={(val) => {
                        setModel(val);
                        if (val !== "custom") {
                          setCustomModel("");
                        }
                      }}
                    >
                      <SelectTrigger id="gemini-model" className="w-full">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado/Rápido)</SelectItem>
                        <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Inteligente/Ideal para raciocínio complexo)</SelectItem>
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Legado/Rápido)</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Legado/Complexo)</SelectItem>
                        <SelectItem value="custom">Outro Modelo (Customizado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo de Modelo Customizado (mostrado apenas se selecionado custom) */}
                  {model === "custom" && (
                    <div className="space-y-2 animate-in fade-in-50 duration-200">
                      <Label htmlFor="gemini-custom-model" className="text-sm font-semibold">Nome do Modelo Customizado</Label>
                      <Input
                        id="gemini-custom-model"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="Ex: gemini-2.0-flash-thinking-exp"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground leading-normal mt-1">
                        Insira a string identificadora oficial do modelo fornecido pelo Google (ex: <code>gemini-2.5-flash</code>).
                      </p>
                    </div>
                  )}

                  {/* Historial de alteração (se houver) */}
                  {lastUpdated && (
                    <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded-lg dark:bg-slate-900/40">
                      Última atualização em <strong>{new Date(lastUpdated).toLocaleString('pt-BR')}</strong>
                      {updatedBy && <span> por <strong>ID: {updatedBy.substring(0, 8)}...</strong></span>}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {!isLoadingConfig && (
              <CardContent className="flex flex-col sm:flex-row gap-3 pt-2 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={isTesting || isSaving}
                  className="sm:w-auto w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/20"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isTesting ? "Testando..." : "Testar Conexão"}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isTesting}
                  className="sm:w-auto w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Ferramentas para gerenciamento de usuários (em desenvolvimento).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Funcionalidades de gerenciamento de usuários em desenvolvimento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
