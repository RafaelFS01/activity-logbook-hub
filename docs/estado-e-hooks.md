# 🗄️ Estado Global e Hooks Customizados

A aplicação utiliza uma combinação de **React Context API** para estado global compartilhado e **Custom Hooks** para isolar lógicas reutilizáveis de controle e tratamento de dados.

---

## 🔐 AuthContext (Gerenciamento de Autenticação)

Responsável por armazenar os dados do usuário autenticado no sistema, verificar permissões baseado em níveis de acesso (`role`) e escutar as alterações do estado de login através do Firebase SDK.

### Definição do Tipo do Contexto
```typescript
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
  isAdmin: boolean;
  hasPermission: (roles: UserRole[]) => boolean;
};
```

### Funcionamento Interno
O contexto usa o listener `onAuthStateChanged` do Firebase Authentication na inicialização. Quando um usuário faz login:
1. O listener intercepta o objeto do Firebase User.
2. Faz uma consulta ao banco Realtime Database (`users/[UID]`) para obter o papel (`role`) do usuário.
3. Alimenta o estado interno e configura o flag de carregamento `isLoading` para `false`.

O método `hasPermission` facilita o bloqueio ou exibição condicional de componentes:
```typescript
const { hasPermission } = useAuth();

// Exibe apenas se o usuário logado for Admin ou Manager
{hasPermission(['admin', 'manager']) && <Button>Excluir Registro</Button>}
```

---

## 🎨 ThemeContext (Sistema de Temas Visual)

Fornece controle visual dinâmico com suporte para quatro temas distintos que alteram a paleta de cores inteira via variáveis CSS injetadas no elemento `<html>`.

### Ciclo dos Temas
Os temas são alternados sequencialmente através do método `toggleTheme`:
`light` ➡️ `dark` ➡️ `h12` ➡️ `h12-alt` ➡️ `light`

### Implementação Básica
1. O tema ativo é persistido no `localStorage`.
2. Um efeito (`useEffect`) monitora a troca de tema, remove as classes CSS antigas do documento raiz (`document.documentElement`) e aplica a classe do novo tema (`dark`, `h12` ou `h12-alt`).
3. O tema `light` funciona como fallback padrão sem classe injetada.

---

## 🪝 Hooks Customizados Principais

### 1. `useActivityStats` (Cálculo de Estatísticas)
Este hook é responsável por consumir a lista de atividades do Firebase e calcular métricas de produtividade divididas em quatro períodos de tempo: **Hoje**, **Semana**, **Mês** e **Geral**.

#### Métricas Calculadas por Período:
*   `total`: Número total de atividades no período.
*   `completed`: Quantidade de atividades concluídas.
*   `inProgress`: Atividades em progresso.
*   `future`: Atividades pendentes agendadas para datas futuras.
*   `pending`: Atividades pendentes cujo início já passou.
*   `cancelled`: Atividades canceladas.
*   `overdue`: Atividades com prazo de entrega extrapolado e status pendente/em progresso.

#### Lógica de Validação de Datas:
*   **Futura:** A data de início da atividade é posterior ao início do dia atual.
*   **Atrasada:** A data de término é anterior ao dia atual e o status não é concluído ou cancelado.

---

### 2. `useRecentActivities` (Histórico Recente)
Hook utilitário que busca e formata as atividades criadas ou modificadas recentemente na plataforma para exibição em painéis compactos de histórico de auditoria do Dashboard.

---

### 3. `useFutureAndOverdueActivities` (Gestão de Prazos)
Isola a consulta e separação lógica entre atividades futuras (planejadas) e atividades em atraso que necessitam de intervenção imediata da equipe, simplificando a renderização de listas priorizadas.

---

### 4. `useIsMobile` (Detecção de Tela Móvel)
Monitora as dimensões da janela usando media queries nativas (`window.matchMedia`) para habilitar layouts responsivos específicos no JavaScript (como comportamento de Sidebar).

```typescript
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

---

### 5. `useToast` (Sistema de Notificações Temporárias)
Gerencia alertas flutuantes utilizando um padrão baseado em `useReducer` com suporte a limites de fila (limita a exibição de múltiplos toasts simultâneos).
