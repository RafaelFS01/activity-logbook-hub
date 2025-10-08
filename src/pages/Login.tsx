import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Ícones otimizados para todos os temas
import { Activity, Sun, Moon, Palette, Contrast, Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
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
  const { theme, toggleTheme } = useTheme();

  // Estados aprimorados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

  // Função para obter estilos específicos do tema
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          background: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
          card: 'bg-gray-800/50 border-gray-700 backdrop-blur-sm',
          glow: 'shadow-2xl shadow-blue-500/20'
        };
      case 'h12':
        return {
          background: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
          card: 'bg-white/80 border-blue-200 backdrop-blur-sm',
          glow: 'shadow-2xl shadow-blue-400/30'
        };
      case 'h12-alt':
        return {
          background: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
          card: 'bg-purple-800/50 border-purple-600 backdrop-blur-sm',
          glow: 'shadow-2xl shadow-purple-400/20'
        };
      default: // light
        return {
          background: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
          card: 'bg-white/80 border-slate-200 backdrop-blur-sm',
          glow: 'shadow-2xl shadow-blue-300/20'
        };
    }
  };

  // Função para renderizar o ícone do tema com melhor visual
  const renderThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Moon className="h-4 w-4 transition-all duration-200" />;
      case 'dark':
        return <Sun className="h-4 w-4 transition-all duration-200" />;
      case 'h12':
        return <Palette className="h-4 w-4 transition-all duration-200" />;
      case 'h12-alt':
        return <Contrast className="h-4 w-4 transition-all duration-200" />;
      default:
        return <Moon className="h-4 w-4 transition-all duration-200" />;
    }
  };

  // Função para obter o título do botão de tema
  const getThemeButtonTitle = () => {
    switch (theme) {
      case 'light': return 'Alternar para modo escuro';
      case 'dark': return 'Alternar para tema H12';
      case 'h12': return 'Alternar para tema H12 alternativo';
      case 'h12-alt': return 'Alternar para modo claro';
      default: return 'Alternar tema';
    }
  };

  // Função para obter variações de cores por tema
  const getThemeColors = () => {
    switch (theme) {
      case 'dark':
        return {
          primary: 'text-blue-400',
          accent: 'text-gray-300',
          button: 'bg-blue-600 hover:bg-blue-700',
          input: 'border-gray-600 focus:border-blue-400'
        };
      case 'h12':
        return {
          primary: 'text-blue-600',
          accent: 'text-slate-600',
          button: 'bg-blue-500 hover:bg-blue-600',
          input: 'border-blue-200 focus:border-blue-400'
        };
      case 'h12-alt':
        return {
          primary: 'text-purple-400',
          accent: 'text-purple-200',
          button: 'bg-purple-600 hover:bg-purple-700',
          input: 'border-purple-500 focus:border-purple-400'
        };
      default: // light
        return {
          primary: 'text-blue-600',
          accent: 'text-slate-600',
          button: 'bg-blue-500 hover:bg-blue-600',
          input: 'border-slate-200 focus:border-blue-400'
        };
    }
  };

  const themeStyles = getThemeStyles();
  const themeColors = getThemeColors();

  return (
    <div className={`min-h-screen flex items-center justify-center ${themeStyles.background} transition-all duration-500 login-container relative overflow-hidden`}>
      {/* Botão de alternância de tema - Canto superior direito da página */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className={`rounded-full backdrop-blur-sm border-2 transition-all duration-300 hover:scale-110 focus:ring-2 focus:ring-opacity-50 ${theme === 'dark' ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 focus:ring-blue-400' : theme === 'h12-alt' ? 'border-purple-500 bg-purple-800/50 hover:bg-purple-700/50 focus:ring-purple-400' : 'border-slate-300 bg-white/50 hover:bg-slate-50/50 focus:ring-blue-400'}`}
          title={getThemeButtonTitle()}
          aria-label={`Botão de alternância de tema. ${getThemeButtonTitle()}`}
          aria-describedby="theme-toggle-help"
        >
          {renderThemeIcon()}
          <span className="sr-only">Alternar tema da aplicação</span>
        </Button>
        {/* Screen reader help for theme toggle */}
        <div id="theme-toggle-help" className="sr-only">
          Use este botão para alternar entre os diferentes temas visuais: claro, escuro, H12 e H12 alternativo
        </div>
      </div>

      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${theme === 'dark' ? 'bg-blue-500' : theme === 'h12-alt' ? 'bg-purple-500' : 'bg-blue-300'}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${theme === 'dark' ? 'bg-purple-500' : theme === 'h12-alt' ? 'bg-blue-500' : 'bg-indigo-300'}`} />
      </div>

      {/* Container principal com animação de entrada */}
      <div className={`w-full max-w-sm p-3 relative z-10 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

        {/* Card principal com glassmorphism */}
        <Card className={`${themeStyles.card} ${themeStyles.glow} transition-all duration-500 hover:scale-[1.02]`}>
          <CardHeader className="space-y-2 pb-4">
            {/* Logo e branding aprimorados */}
            <div className="flex flex-col items-center space-y-2">
              <div className={`relative p-2 rounded-full ${theme === 'dark' ? 'bg-blue-500/20' : theme === 'h12-alt' ? 'bg-purple-500/20' : 'bg-blue-100'} transition-colors duration-300`}>
                <Activity className={`h-6 w-6 ${themeColors.primary} transition-colors duration-300`} />
                <div className={`absolute inset-0 rounded-full ${theme === 'dark' ? 'bg-blue-400/20' : theme === 'h12-alt' ? 'bg-purple-400/20' : 'bg-blue-200/20'} animate-pulse`} />
              </div>
              <div className="text-center">
                <h1 className={`text-2xl font-bold ${themeColors.primary} mb-1 transition-colors duration-300`}>
                  Activity Hub
                </h1>
                <p className={`text-xs ${themeColors.accent} transition-colors duration-300`}>
                  Sistema de Gestão de Atividades
                </p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <CardTitle className={`text-xl ${themeColors.accent} transition-colors duration-300`}>
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className={`${themeColors.accent} transition-colors duration-300`}>
                Entre com suas credenciais para continuar
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleLogin} noValidate aria-label="Formulário de login">
            <CardContent className="space-y-4">
              {/* Campo de email com ícone */}
              <div className="space-y-1">
                <Label htmlFor="email" className={`text-sm font-medium ${themeColors.accent} transition-colors duration-300`}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeColors.accent} transition-colors duration-300`} aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-label="Campo de email para login"
                    aria-describedby="email-help"
                    aria-invalid={!email.includes('@') && email.length > 0}
                    className={`pl-10 h-10 ${themeColors.input} transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${theme === 'dark' ? 'focus:ring-blue-400' : theme === 'h12-alt' ? 'focus:ring-purple-400' : 'focus:ring-blue-400'} bg-white/50 backdrop-blur-sm`}
                  />
                </div>
                {/* Screen reader help text */}
                <div id="email-help" className="sr-only">
                  Digite seu endereço de email válido para fazer login
                </div>
              </div>

              {/* Campo de senha com ícone e toggle de visibilidade */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={`text-sm font-medium ${themeColors.accent} transition-colors duration-300`}>
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`text-sm ${themeColors.primary} hover:underline transition-colors duration-200 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-opacity-50 rounded px-1 py-0.5 ${theme === 'dark' ? 'focus:ring-blue-400' : theme === 'h12-alt' ? 'focus:ring-purple-400' : 'focus:ring-blue-400'}`}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-describedby="password-toggle-help"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    <span className="sr-only">{showPassword ? 'Ocultar' : 'Mostrar'} senha</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${themeColors.accent} transition-colors duration-300`} aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-label="Campo de senha para login"
                    aria-describedby="password-help password-toggle-help"
                    className={`pl-10 pr-10 h-10 ${themeColors.input} transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${theme === 'dark' ? 'focus:ring-blue-400' : theme === 'h12-alt' ? 'focus:ring-purple-400' : 'focus:ring-blue-400'} bg-white/50 backdrop-blur-sm`}
                  />
                </div>
                {/* Screen reader help texts */}
                <div id="password-help" className="sr-only">
                  Digite sua senha. Mantenha-a segura e use uma combinação de letras, números e símbolos
                </div>
                <div id="password-toggle-help" className="sr-only">
                  Clique para mostrar ou ocultar os caracteres da senha
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-4">
              {/* Botão de login aprimorado */}
              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full h-10 text-sm font-medium ${themeColors.button} transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:ring-2 focus:ring-opacity-50 ${theme === 'dark' ? 'focus:ring-blue-400' : theme === 'h12-alt' ? 'focus:ring-purple-400' : 'focus:ring-blue-400'}`}
                aria-describedby="login-button-help"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Entrando...</span>
                  </div>
                ) : (
                  <span>Efetuar login</span>
                )}
              </Button>
              {/* Screen reader help for login button */}
              <div id="login-button-help" className="sr-only">
                Clique para fazer login com suas credenciais ou pressione Enter quando os campos estiverem preenchidos
              </div>

              {/* Informações do administrador */}
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : theme === 'h12-alt' ? 'bg-purple-700/30' : 'bg-blue-50'} backdrop-blur-sm transition-colors duration-300`}>
                <p className={`text-xs text-center ${themeColors.accent} mb-1 transition-colors duration-300`}>
                  Para criar o primeiro usuário administrador:
                </p>
                <div className={`text-xs text-center space-y-0.5 ${themeColors.primary} transition-colors duration-300`}>
                  <p><span className="font-semibold">Email:</span> admin@activityhub.com</p>
                  <p><span className="font-semibold">Senha:</span> admin123</p>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer com informações da aplicação */}
        <div className={`text-center mt-4 text-sm ${themeColors.accent} transition-colors duration-300`}>
          <p>Activity Logbook Hub - Sistema de Gestão de Atividades</p>
          <p className="mt-0.5 opacity-75 text-xs">Versão 2.0 - Interface Otimizada</p>
        </div>
      </div>
    </div>
  );
};

export default Login;