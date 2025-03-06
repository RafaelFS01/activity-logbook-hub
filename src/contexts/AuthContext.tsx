
import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  ReactNode 
} from "react";
import { 
  signIn, 
  signOut, 
  getUserData,
  UserData,
  UserRole
} from "@/services/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "@/components/ui/use-toast";

type User = {
  uid: string;
  name: string;
  role: UserRole;
  email: string;
} | null;

type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configurar listener para mudanças de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Buscar dados adicionais do usuário do Realtime Database
          const userData = await getUserData(firebaseUser.uid);
          
          if (userData) {
            setUser({
              uid: firebaseUser.uid,
              name: userData.name,
              role: userData.role,
              email: userData.email
            });
            setIsAuthenticated(true);
          } else {
            // Usuário existe no Auth mas não tem dados no Database
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Erro ao obter dados do usuário:", error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // Usuário não está autenticado
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    // Limpar o listener quando o componente for desmontado
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      // Tentar fazer login com o Firebase
      const firebaseUser = await signIn(email, password);
      
      // Buscar dados adicionais do usuário
      const userData = await getUserData(firebaseUser.uid);
      
      if (userData) {
        // Verificar se o usuário está ativo
        if (!userData.active) {
          await signOut();
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Sua conta está desativada. Entre em contato com um administrador."
          });
          setIsLoading(false);
          return false;
        }
        
        setUser({
          uid: firebaseUser.uid,
          name: userData.name,
          role: userData.role,
          email: userData.email
        });
        
        setIsAuthenticated(true);
        
        toast({
          title: "Login bem-sucedido",
          description: `Bem-vindo, ${userData.name}!`
        });
        
        return true;
      } else {
        // Dados do usuário não encontrados
        await signOut();
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Não foi possível obter os dados do usuário."
        });
        return false;
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: "Credenciais inválidas ou problema no servidor."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: "Logout realizado",
        description: "Você saiu do sistema com sucesso."
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Ocorreu um problema ao tentar sair do sistema."
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
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
