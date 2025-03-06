
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type User = {
  name: string;
  role: "admin" | "manager" | "collaborator";
} | null;

type AuthContextType = {
  user: User;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar se há um usuário no localStorage ao iniciar
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simulação de login - em uma aplicação real, isso seria uma chamada de API
    try {
      // Simulação básica de autenticação
      if (username && password) {
        const mockUser = {
          name: "Usuário Demo",
          role: "admin" as const
        };
        
        localStorage.setItem("user", JSON.stringify(mockUser));
        setUser(mockUser);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
