# 🔥 Camada de Serviços Firebase

O projeto centraliza todas as chamadas de banco de dados e autenticação em serviços isolados, seguindo o padrão de repositórios. Isso abstrai a biblioteca SDK do Firebase do restante da aplicação.

---

## 🛠️ Configuração Inicial

A inicialização do Firebase consome variáveis de ambiente para conectar a aplicação ao projeto configurado no console.

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
```

---

## 🔐 Serviços de Autenticação e Usuários

Encapsula o registro de novos colaboradores no Firebase Auth e sincroniza os dados adicionais de permissões e perfil no banco de dados em tempo real.

### Tipagem de Usuário
```typescript
export type UserRole = 'admin' | 'manager' | 'collaborator';
export type CollaboratorStatus = 'active' | 'inactive' | 'pending';

export interface UserData {
  name: string;
  role: UserRole;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  admissionDate: string;
  active: boolean;
  status?: CollaboratorStatus;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
  uid?: string;
}
```

### Métodos Principais

*   **`createUser(email, password, userData)`**: 
    1. Registra as credenciais no *Firebase Authentication* (`createUserWithEmailAndPassword`).
    2. Atualiza o perfil do usuário configurando seu `displayName`.
    3. Cria o registro complementar em `users/[UID]` no Realtime Database contendo seu nível de acesso (`role`).
*   **`signIn(email, password)`**: Autentica o usuário no Firebase Auth utilizando e-mail e senha.
*   **`getUserData(uid)`**: Obtém as informações cadastrais e papéis (`role`) do usuário do nó `users/[UID]`.
*   **`updateCollaboratorStatus(uid, status)`**: Altera o status operacional do usuário.

---

## 📅 Serviços de Atividades

Gerencia o ciclo de vida das tarefas e agendas no nó `activities`.

### Tipagem de Atividade
```typescript
export type ActivityStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type ActivityPriority = 'low' | 'medium' | 'high';

export interface Activity {
  id: string;
  title: string;
  description: string;
  clientId: string;
  assignedTo: string[];
  status: ActivityStatus;
  priority: ActivityPriority;
  startDate: string;
  endDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  type?: string;
}
```

### Métodos Principais

*   **`getActivities()`**: Retorna todas as atividades gravadas.
*   **`getActivityById(id)`**: Obtém detalhes de uma atividade específica.
*   **`getActivitiesByClient(clientId)`**: Filtra atividades ligadas a um cliente específico (otimizado com indexação Firebase).
*   **`getActivitiesByAssignee(uid)`**: Filtra atividades delegadas a um colaborador específico.
*   **`createActivity(activity)`**: Insere um novo nó gerando um ID dinâmico via `push` e configura campos de auditoria de data.
*   **`updateActivity(id, activity)`**: Atualiza dados completos de uma atividade existente.
*   **`updateActivityStatus(id, status)`**: Atualiza o status e, caso o novo status seja `completed`, define automaticamente a propriedade `completedDate` com o timestamp atual.
*   **`deleteActivity(id)`**: Exclusão lógica da atividade mudando o status para `cancelled`.

---

## 🏢 Serviços de Clientes

Gerencia o cadastro de pessoas físicas e jurídicas no nó `clients`, bem como tarefas de manutenção de modelagem.

### Campos Recentes
*   `notes` (string): Notas informativas sobre o cliente.
*   `reportIntroduction` (string): Introdução personalizada gerada para relatórios do cliente.

### Métodos Principais

*   **`getClients()`**: Retorna a lista de clientes cadastrados.
*   **`getClientById(id)`**: Retorna as informações detalhadas de um único cliente.
*   **`createClient(client, userId)`**: Insere um novo cliente configurando automaticamente o nome fantasia como nome para tipo `juridica`.
*   **`updateClient(id, client)`**: Atualiza os dados cadastrais e injeta a data de alteração `updatedAt`.
*   **`deleteClient(id)`**: Inativa o cliente no banco configurando `active` para `false` (exclusão lógica).
*   **`migrateClientsWithReportIntroduction()`**: Varre a lista de clientes cadastrados e adiciona o campo `reportIntroduction: ""` naqueles que não o possuem, gerando auditoria em lote.
*   **`updateClientReportIntroduction(clientId, introText)`**: Atualiza pontualmente a introdução de relatório do cliente especificado.

---

## ❓ Serviços de Dúvidas do eSocial

Gerencia a base de conhecimentos cadastrada sob os nós `esocialQuestions` e `esocialTags` para auxiliar o atendimento de dúvidas técnicas dos colaboradores.

### Estruturas de Tipos
```typescript
export interface ESocialQuestion {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ESocialTag {
  id: string;
  name: string;
  createdAt: string;
}
```

### Métodos Principais

*   **`getQuestions()`**: Retorna a lista completa de dúvidas salvas ordenadas por data de criação decrescente.
*   **`getTags()`**: Retorna as tags cadastradas em ordem alfabética.
*   **`createTagIfNotExists(name)`**: Verifica se já existe uma tag cadastrada com o mesmo nome (ignorando maiúsculas/minúsculas). Caso não exista, cria o novo nó de tag normalizado.
*   **`createQuestion(data)`**: Insere uma nova dúvida no banco gerando ID dinâmico, limpando espaços em branco e indexando as tags associadas.
*   **`updateQuestion(id, data)`**: Atualiza dados parciais da dúvida e registra o horário de alteração.
*   **`deleteTag(tagId)`**:
    1. Remove o registro da tag de `esocialTags/[tagId]`.
    2. Varre a lista de dúvidas cadastros (`esocialQuestions`) e remove a string da tag associada a qualquer pergunta correspondente, atualizando seus registros.
