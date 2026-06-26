# 🏗️ Arquitetura e Padrões de Design

O **Activity Logbook Hub** segue uma arquitetura **Cliente-Servidor** baseada em **Single Page Application (SPA)** com separação em camadas estruturadas para facilitar a manutenção e evolução.

---

## 🏗️ Camadas do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │ Components  │  │    UI Components    │  │
│  │             │  │             │  │    (Shadcn/ui)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Hooks     │  │  Contexts   │  │     Services        │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Firebase   │  │  Realtime   │  │    Authentication   │  │
│  │   Config    │  │  Database   │  │      Service        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

1. **Presentation Layer (Camada de Apresentação):** Composta por páginas e componentes React, além dos componentes de UI (baseados em Shadcn/ui). Sua única responsabilidade é renderizar a interface gráfica e capturar a interação do usuário.
2. **Business Layer (Camada de Negócios):** Contém os contextos do React para estado global, os hooks customizados para encapsular a lógica de estado/cálculos complexos e os serviços que conectam o app às fontes de dados.
3. **Data Layer (Camada de Dados):** Configurações do Firebase, conexão direta com o Firebase Authentication e o Realtime Database.

---

## 🚀 Stack Tecnológica Detalhada

*   **Frontend Core:**
    *   **React 18.3.1:** Framework para construção da SPA e fluxo unidirecional.
    *   **TypeScript 5.5.3:** Tipagem estática, auto-complete e verificação de tipos em compilação.
    *   **Vite 5.4.1:** Build tool de última geração com suporte a HMR (Hot Module Replacement).
    *   **React Router DOM 6.26.2:** Gerenciamento declarativo de rotas internas.
*   **Gerenciamento de Estado:**
    *   **React Context API:** Armazenamento de estado compartilhado (como dados do usuário e temas).
    *   **useState / useReducer:** Estado local dos componentes.
*   **UI e Estilização:**
    *   **Tailwind CSS 3.4.11:** Utilitários CSS inline para design responsivo.
    *   **Shadcn/ui:** Componentes de interface baseados na especificação do Radix UI (headless).
    *   **Lucide React:** Biblioteca de ícones no formato SVG vetorial.
    *   **Recharts:** Geração de gráficos de dashboard.

---

## 🎨 Padrões Arquiteturais Adotados

### 1. Compound Component Pattern
Muito utilizado no design de componentes complexos de UI para expor partes menores e flexibilizar o layout sem sobrecarregar um único componente com props.

```typescript
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição do card</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteúdo principal...</p>
  </CardContent>
  <CardFooter>
    <Button>Salvar</Button>
  </CardFooter>
</Card>
```

### 2. Provider Pattern
Utilizado para injetar estados globais que precisam ser acessados de forma transversal na árvore de componentes (por exemplo, informações sobre autenticação e preferências visuais).

```typescript
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return (
    <AuthContext.Provider value={{ user, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 3. Custom Hooks Pattern
Isola a lógica complexa de negócios dos componentes de interface, facilitando o reaproveitamento de código e testes isolados.

```typescript
export const useActivityStats = () => {
  const [stats, setStats] = useState<ActivityStats>();
  const [isLoading, setIsLoading] = useState(true);
  
  // Lógica de cálculo, fetch de dados, filtros...
  
  return { stats, isLoading };
};
```

### 4. Repository Pattern
Isola o restante da aplicação do mecanismo de persistência de dados. Toda a comunicação com a API do Firebase é encapsulada em funções específicas, de modo que os componentes não sabem como os dados são guardados ou obtidos.

```typescript
// Exemplo de Repository Pattern para Atividades
export const getActivities = async (): Promise<Activity[]> => {
  // Lógica de acesso ao Firebase Realtime Database
};

export const createActivity = async (activity: Omit<Activity, 'id'>): Promise<string> => {
  // Criação e gravação no Firebase
};
```
