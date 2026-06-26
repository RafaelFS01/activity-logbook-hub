# 📝 Padrões de Código e Otimizações de Performance

Este documento descreve as convenções de desenvolvimento, estruturas padrão de código e as táticas de otimização de performance adotadas no codebase do **Activity Logbook Hub**.

---

## 🏷️ Convenções de Nomenclatura

*   **Arquivos e Diretórios:**
    *   `PascalCase`: Componentes React (ex: `Button.tsx`, `ActivityCard.tsx`).
    *   `camelCase`: Hooks customizados e utilitários (ex: `useAuth.ts`, `formatDate.ts`).
    *   `kebab-case`: Diretórios de páginas e features (ex: `activity-details/`, `collaborators/`).
    *   `UPPER_CASE`: Constantes globais (ex: `API_ENDPOINTS`, `THEME_CONFIG`).
*   **Código Interno:**
    *   `Interfaces / Types`: `PascalCase` (ex: `interface UserData`).
    *   `Componentes`: `PascalCase` (ex: `const ActivityList = () => {}`).
    *   `Hooks`: `camelCase` iniciado pelo prefixo `use` (ex: `const useActivityStats = () => {}`).
    *   `Variáveis / Funções`: `camelCase` (ex: `const [isLoading, setIsLoading] = useState()`).
    *   `Constantes`: `UPPER_SNAKE_CASE` (ex: `const MAX_ITEMS = 10`).

---

## 🏗️ Estrutura Padrão de Componente React

Todos os componentes funcionais em React seguem uma ordem padronizada de importação e declaração para manter a legibilidade:

```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail } from 'lucide-react';

// Imports de Componentes UI e Hooks
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces das Props
interface UserCardProps {
  userId: string;
  onSelect: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ userId, onSelect }) => {
  const [active, setActive] = useState(false);
  const { user } = useAuth();

  // Memoizações
  const label = useMemo(() => `User: ${user?.name}`, [user]);

  // Callbacks
  const handleClick = useCallback(() => {
    onSelect(userId);
  }, [userId, onSelect]);

  // Efeitos
  useEffect(() => {
    // Efeitos colaterais controlados
  }, []);

  return (
    <div className="p-4 border rounded">
      <span>{label}</span>
      <Button onClick={handleClick}><Mail size={16} /></Button>
    </div>
  );
};
```

---

## 🚨 Tratamento de Erros

A aplicação divide o tratamento de erros em duas responsabilidades distintas:

1.  **Camada de Serviços (Persistência):** As funções de repositório capturam os erros das APIs de rede ou banco, geram logs detalhados via `console.error` e lançam um objeto de erro customizado com mensagens amigáveis em português.
2.  **Camada de Apresentação (Interface):** Os blocos `try-catch` dentro dos manipuladores de eventos (`handlers`) nos componentes capturam os erros relançados pela camada de serviços, alteram o estado local de loading e disparam alertas visuais na tela por meio do hook `useToast` com a variante visual `destructive`.

---

## 🛡️ Validação de Dados com Zod

A validação de integridade nos formulários (como cadastro de clientes e novas atividades) é gerenciada em tempo real integrando a biblioteca **Zod** ao **React Hook Form**.

```typescript
import { z } from 'zod';

export const activitySchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.').max(100),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  clientId: z.string().min(1, 'Selecione um cliente.'),
  priority: z.enum(['low', 'medium', 'high']),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida.'),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Data inválida.'),
  assignedTo: z.array(z.string()).min(1, 'Atribua pelo menos um responsável.')
});

export type ActivityFormData = z.infer<typeof activitySchema>;
```

---

## ⚡ Estratégias de Otimização de Performance

### 1. Code Splitting e Lazy Loading
Páginas e rotas de segundo nível são carregadas de forma assíncrona sob demanda via `React.lazy` combinados a componentes `<Suspense>` contendo fallbacks visuais rápidos. Isso reduz drasticamente o tamanho do bundle principal inicial (`index.js`).

### 2. Memoização Avançada
Componentes de listas ou tabelas que sofrem renders constantes são encapsulados em `React.memo` para evitar renderizações duplicadas quando as props não mudam. Internamente, variáveis computacionais e funções passadas para filhos são tratadas com `useMemo` e `useCallback` para manter suas referências estáveis em memória.

### 3. Otimização de Queries Firebase
Consultas no Firebase Realtime Database que buscam relacionamentos (como encontrar atividades vinculadas a um cliente) utilizam as cláusulas de consulta do SDK (`orderByChild` e `equalTo`). Isso delega a filtragem dos dados para o servidor do Firebase em vez de carregar a árvore completa e filtrar no frontend da aplicação.

### 4. Debounce em Entradas de Busca
Campos de busca textual aplicam um atraso controlado de 300ms a 500ms (Debounce) antes de propagar o valor para os filtros globais. Isso reduz o número de recomputações visuais e chamadas de API a cada caractere digitado pelo usuário.
