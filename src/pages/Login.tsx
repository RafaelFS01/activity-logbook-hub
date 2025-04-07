import { useState } from "react";
import { useNavigate } from "react-router-dom";
// Mantém os ícones necessários para todos os temas
import { Activity, Sun, Moon, Palette, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Lógica de tema atualizada
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        navigate("/");
      } else {
        toast({
          variant: "destructive",
          title: "Falha no login",
          description: "Credenciais inválidas. Verifique seu email e senha.",
        });
      }
    } catch (error: any) {
      console.error("Error during login:", error);
      const description = error?.response?.data?.message ||
          error?.message ||
          "Ocorreu um erro inesperado. Tente novamente.";
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: description
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para renderizar o ícone do tema - Mantém a lógica atualizada para 4 temas
  const renderThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Moon className="h-5 w-5" />; // Próximo: dark
      case 'dark':
        return <Palette className="h-5 w-5" />; // Próximo: h12
      case 'h12':
        return <Contrast className="h-5 w-5" />; // Próximo: h12-alt
      case 'h12-alt':
        return <Sun className="h-5 w-5" />; // Próximo: light
      default:
        return <Moon className="h-5 w-5" />;
    }
  };

  // Função para obter o título do botão de tema (para acessibilidade) - Mantém atualizada
  const getThemeButtonTitle = () => {
    switch (theme) {
      case 'light': return 'Ativar modo escuro';
      case 'dark': return 'Ativar modo H12';
      case 'h12': return 'Ativar modo H12 Alternativo';
      case 'h12-alt': return 'Ativar modo claro';
      default: return 'Alternar tema';
    }
  };

  return (
      // Volta para a estrutura de background original. A classe login-container e o CSS cuidam dos temas.
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors login-container">
        {/* Volta para a estrutura original do container do Card e botão */}
        <div className="w-full max-w-md p-4">
          {/* Volta para o posicionamento original do botão de tema */}
          <div className="absolute top-4 right-4">
            <Button
                variant="outline" // Volta para a variante original
                size="icon"
                onClick={toggleTheme} // Mantém o onClick atualizado
                className="rounded-full"
                title={getThemeButtonTitle()} // Mantém o title atualizado
            >
              {renderThemeIcon()} {/* Mantém a renderização do ícone atualizada */}
              <span className="sr-only">Alternar tema</span>
            </Button>
          </div>

          <Card> {/* Estrutura do Card restaurada */}
            <CardHeader className="space-y-1 flex flex-col items-center">
              {/* Volta para a logo original com Activity e texto */}
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Activity Hub</h2>
              </div>
              <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
              <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              {/* Conteúdo do Card restaurado (sem padding extra) */}
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      placeholder="Digite seu email" // Placeholder original
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email" // Mantido por usabilidade
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    {/* Link "Esqueceu a senha?" original */}
                    <a href="#" className="text-sm text-primary hover:underline">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha" // Placeholder original
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password" // Mantido por usabilidade
                  />
                </div>
              </CardContent>

              {/* Footer do Card restaurado (sem padding extra) */}
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>

                {/* Restaura o texto informativo original sobre o admin */}
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Para criar o primeiro usuário administrador, utilize:
                  <br />
                  <span className="font-semibold">Email: admin@activityhub.com</span>
                  <br />
                  <span className="font-semibold">Senha: admin123</span>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
  );
};

export default Login;