# Documentação do Projeto: activity-logbook-hub

## 1. Visão Geral do Projeto

O "activity-logbook-hub" é um sistema web desenvolvido para auxiliar no registro, acompanhamento e gerenciamento de atividades, clientes e colaboradores. Ele oferece uma interface centralizada para visualizar agendas, cadastrar novas atividades e gerenciar informações de clientes e da equipe. O sistema é projetado para ser intuitivo e eficiente, facilitando a organização e o controle das operações diárias.

## 2. Tecnologias Utilizadas

Este projeto foi construído utilizando uma stack moderna e robusta, focando em performance, escalabilidade e manutenibilidade.

*   **Frontend:**
    *   **Linguagem:** TypeScript
    *   **Framework/Biblioteca:** React
    *   **Build Tool:** Vite
    *   **Gerenciador de Pacotes:** Bun
    *   **Estilização:** Tailwind CSS
    *   **Componentes UI:** Shadcn UI (construído sobre Radix UI)
    *   **Gerenciamento de Estado:** React Context API (utilizado para o contexto de autenticação)
    *   **Roteamento:** React Router DOM
    *   **Validação de Formulários:** React Hook Form com Zod
    *   **Manipulação de Datas:** date-fns
    *   **Geração de IDs Únicos:** uuid
    *   **Gráficos:** Recharts (identificado no `package.json`, verificar uso em componentes específicos)
    *   **Exportação de Dados:** xlsx (identificado no `package.json`, utilizado para exportar listas)

*   **Backend/Banco de Dados:**
    *   **Plataforma:** Firebase
    *   **Serviços Utilizados:**
        *   **Firebase Authentication:** Gerenciamento de usuários e autenticação por email/senha.
        *   **Firebase Realtime Database:** Armazenamento e sincronização em tempo real dos dados da aplicação (usuários, clientes, atividades).

## 3. Estrutura do Banco de Dados (Firebase Realtime Database)

O Firebase Realtime Database armazena os dados do projeto em uma estrutura de árvore JSON. Os nós principais representam as entidades do sistema: `users`, `clients` e `activities`.

### Nós Principais:

*   **`users`**: Armazena as informações dos colaboradores do sistema. Cada chave sob `users` é o UID único gerado pelo Firebase Authentication para cada usuário.
    *   `[UID do Usuário]` (Objeto):
        *   `uid` (string): UID único do usuário (redundante, mas armazenado).
        *   `name` (string): Nome completo do colaborador.
        *   `email` (string): Endereço de email (vinculado ao Firebase Auth).
        *   `cpf` (string): CPF do colaborador.
        *   `phone` (string): Número de telefone.
        *   `birthDate` (string): Data de nascimento (formato string, ex: "YYYY-MM-DD").
        *   `admissionDate` (string): Data de admissão (formato string, ex: "YYYY-MM-DD").
        *   `role` (string): Papel do usuário no sistema ("admin", "manager", "collaborator").
        *   `active` (boolean): Indica se o usuário está ativo no sistema.
        *   `status` (string, opcional): Status do colaborador ("active", "inactive", "pending").
        *   `photoURL` (string, opcional): URL da foto de perfil.
        *   `createdAt` (string): Timestamp de criação (formato ISO 8601).
        *   `updatedAt` (string): Timestamp da última atualização (formato ISO 8601).
        *   `createdBy` (string): UID do usuário que criou este registro.

*   **`clients`**: Armazena as informações dos clientes. Cada chave sob `clients` é um ID único gerado pela função `push` do Realtime Database.
    *   `[ID do Cliente]` (Objeto):
        *   `id` (string): ID único do cliente (redundante, mas armazenado).
        *   `name` (string): Nome do cliente (para Pessoa Física) ou nome fantasia (para Pessoa Jurídica).
        *   `type` (string): Tipo de cliente ("fisica" ou "juridica").
        *   `email` (string): Endereço de email do cliente.
        *   `phone` (string): Número de telefone do cliente.
        *   `address` (string, opcional): Endereço completo.
        *   `active` (boolean): Indica se o cliente está ativo.
        *   `createdAt` (string): Timestamp de criação (formato ISO 8601).
        *   `updatedAt` (string): Timestamp da última atualização (formato ISO 8601).
        *   `createdBy` (string): UID do usuário que criou este registro.
        *   **Campos Específicos por Tipo:**
            *   Se `type` for "fisica":
                *   `cpf` (string): CPF da pessoa física.
                *   `rg` (string, opcional): RG da pessoa física.
            *   Se `type` for "juridica":
                *   `companyName` (string): Razão social da empresa.
                *   `cnpj` (string): CNPJ da empresa.
                *   `responsibleName` (string, opcional): Nome do responsável pela empresa.

*   **`activities`**: Armazena as informações das atividades. Cada chave sob `activities` é um ID único gerado pela função `push` do Realtime Database.
    *   `[ID da Atividade]` (Objeto):
        *   `id` (string): ID único da atividade (redundante, mas armazenado).
        *   `title` (string): Título da atividade.
        *   `description` (string): Descrição detalhada da atividade.
        *   `clientId` (string): ID do cliente associado a esta atividade.
        *   `assignedTo` (array de strings): Array de UIDs dos colaboradores atribuídos a esta atividade.
        *   `status` (string): Status atual da atividade ("pending", "in-progress", "completed", "cancelled").
        *   `priority` (string): Nível de prioridade ("low", "medium", "high").
        *   `startDate` (string): Data e hora de início (formato ISO 8601).
        *   `endDate` (string): Data e hora de término prevista (formato ISO 8601).
        *   `completedDate` (string, opcional): Data e hora de conclusão (formato ISO 8601), preenchido quando o status é "completed".
        *   `createdAt` (string): Timestamp de criação (formato ISO 8601).
        *   `updatedAt` (string): Timestamp da última atualização (formato ISO 8601).
        *   `createdBy` (string): UID do usuário que criou esta atividade.
        *   `type` (string, opcional): Tipo da atividade (ex: "Reunião", "Desenvolvimento").

### Organograma das Entidades:

```mermaid
graph TD
    A[Realtime Database] --> B(users);
    A --> C(clients);
    A --> D(activities);

    B --> B1(UID do Usuário);
    B1 --> B1a(name);
    B1 --> B1b(email);
    B1 --> B1c(role);
    B1 --> B1d(active);
    B1 --> B1e(status);
    B1 --> B1f(...outros campos);

    C --> C1(ID do Cliente);
    C1 --> C1a(name);
    C1 --> C1b(type);
    C1 --> C1c(email);
    C1 --> C1d(active);
    C1 --> C1e(...outros campos);
    C1 --> C1f(Campos específicos por tipo);

    D --> D1(ID da Atividade);
    D1 --> D1a(title);
    D1 --> D1b(description);
    D1 --> D1c(clientId);
    D1 --> D1d(assignedTo);
    D1 --> D1e(status);
    D1 --> D1f(priority);
    D1 --> D1g(startDate);
    D1 --> D1h(endDate);
    D1 --> D1i(type);
    D1 --> D1j(createdBy);
    D1 --> D1k(...outros campos de data/auditoria);

    D1c --> C;
    D1d --> B;
    D1j --> B;

    subgraph Status Atividade
        E1(pending)
        E2(in-progress)
        E3(completed)
        E4(cancelled)
    end

    subgraph Prioridade Atividade
        F1(low)
        F2(medium)
        F3(high)
    end

    D1e --> Status Atividade;
    D1f --> Prioridade Atividade;
```

## 4. Funcionalidades por Página e Comunicação com o Banco de Dados

### `src/pages/Index.tsx` (Página Inicial/Login)

*   **Propósito:** Página de entrada da aplicação, responsável pela autenticação do usuário.
*   **Funcionalidades:** Exibe formulário de login.
*   **Comunicação com DB:**
    *   **Leitura:** Não lê dados diretamente do Realtime Database.
    *   **Escrita/Atualização/Remoção:** Não escreve dados diretamente no Realtime Database. Interage com **Firebase Authentication** para realizar o login (`signInWithEmailAndPassword`).

### `src/pages/Home.tsx` (Agenda de Atividades)

*   **Propósito:** Exibir as atividades em formato de calendário (dia, semana, mês) com filtros.
*   **Funcionalidades:** Visualização de atividades por período, navegação entre datas/períodos, filtragem por status, cliente e colaborador, navegação para detalhes da atividade.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê **todas as atividades** do nó `activities` (`getActivities`).
        *   Lê **todos os clientes ativos** do nó `clients` (`getClients`).
        *   Lê **todos os usuários/colaboradores** do nó `users` (leitura direta com `get(ref(db, 'users'))`) para aplicar filtros baseados no papel do usuário logado e exibir nomes de responsáveis.
    *   **Escrita/Atualização/Remoção:** Não escreve dados diretamente.

### `src/pages/activities/ActivitiesPage.tsx` (Lista de Atividades)

*   **Propósito:** Exibir uma lista paginada de todas as atividades com opções avançadas de filtro e busca.
*   **Funcionalidades:** Listagem de atividades, busca por termo, filtragem por status, período de data, colaborador e tipo, paginação, atualização rápida de status, exportação para Excel, navegação para criação e detalhes da atividade.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê **todas as atividades** do nó `activities` (`getActivities`).
        *   Lê **todos os clientes** do nó `clients` (`getClients`) para exibir nomes na lista e permitir busca por nome de cliente.
        *   Lê **todos os usuários/colaboradores** do nó `users` (leitura direta com `get(ref(db, 'users'))`) para exibir nomes de responsáveis e permitir busca/filtro por responsável.
        *   Lê os **tipos de atividade existentes** (`getActivityTypes`).
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o status de uma atividade no nó `activities` (`updateActivityStatus`).

### `src/pages/activities/NewActivityPage.tsx` (Nova Atividade)

*   **Propósito:** Permitir o cadastro de uma nova atividade.
*   **Funcionalidades:** Formulário para inserir dados da atividade (título, descrição, cliente, prioridade, status, datas, tipo), seleção de cliente e tipo (com opção de criar novo tipo), validação de formulário.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê a lista de **clientes ativos** do nó `clients` (`getClients`) para popular o campo de seleção.
        *   Lê os **tipos de atividade existentes** (`getActivityTypes`) para popular o campo de seleção/criação.
    *   **Escrita/Atualização/Remoção:**
        *   **Cria** um novo registro no nó `activities` (`createActivity`).

### `src/pages/activities/ActivityDetailsPage.tsx` (Detalhes da Atividade)

*   **Propósito:** Exibir informações detalhadas de uma atividade específica e seu histórico.
*   **Funcionalidades:** Visualização de todos os campos da atividade, informações do cliente associado e responsáveis, timeline de criação/atualização/conclusão, botões para editar e cancelar/remover a atividade.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados de uma **atividade específica** do nó `activities` (`getActivityById`).
        *   Lê os dados do **cliente associado** do nó `clients` (`getClientById`).
        *   Lê os dados dos **usuários/colaboradores atribuídos** do nó `users` (`getUserData`) para exibir seus nomes.
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o status da atividade no nó `activities` (`updateActivityStatus`).
        *   **Atualiza** o status da atividade para 'cancelled' no nó `activities` (`deleteActivity`).

### `src/pages/activities/EditActivityPage.tsx` (Editar Atividade)

*   **Propósito:** Permitir a edição de uma atividade existente.
*   **Funcionalidades:** Formulário preenchido com dados da atividade, edição de campos (título, descrição, cliente, prioridade, status, datas, tipo), seleção de cliente, validação de formulário.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados da **atividade a ser editada** do nó `activities` (`getActivityById`).
        *   Lê a lista de **clientes ativos** do nó `clients` (`getClients`) para popular o campo de seleção.
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o registro da atividade no nó `activities` (`updateActivity`).

### `src/pages/clients/ClientsPage.tsx` (Lista de Clientes)

*   **Propósito:** Exibir uma lista paginada de clientes com opções de filtro e busca.
*   **Funcionalidades:** Listagem de clientes (ativos), busca por termo, filtragem por tipo (Pessoa Física/Jurídica), paginação, desativação de cliente (apenas admin), exportação para Excel, navegação para criação e detalhes do cliente.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê a lista de **todos os clientes** do nó `clients` (`getClients`).
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o campo `active` de um cliente para `false` no nó `clients` (`deleteClient`).

### `src/pages/clients/NewClientPage.tsx` (Novo Cliente)

*   **Propósito:** Permitir o cadastro de um novo cliente (Pessoa Física ou Jurídica).
*   **Funcionalidades:** Formulário com abas para selecionar tipo de cliente, campos específicos para PF ou PJ, validação de formulário.
*   **Comunicação com DB:**
    *   **Leitura:** Não lê dados diretamente.
    *   **Escrita/Atualização/Remoção:**
        *   **Cria** um novo registro no nó `clients` (`createClient`).

### `src/pages/clients/ClientDetailsPage.tsx` (Detalhes do Cliente)

*   **Propósito:** Exibir informações detalhadas de um cliente específico e listar suas atividades associadas.
*   **Funcionalidades:** Visualização de dados do cliente, lista paginada de atividades relacionadas, filtragem de atividades por termo, status, período e tipo, exportação de atividades para Excel, navegação para edição do cliente e detalhes da atividade.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados de um **cliente específico** do nó `clients` (`getClientById`).
        *   Lê as **atividades associadas a este cliente** do nó `activities` (`getActivitiesByClient`).
        *   Lê os dados de **todos os usuários/colaboradores** do nó `users` (leitura direta com `get(ref(db, 'users'))`) para exibir nomes de responsáveis nas atividades e na exportação.
    *   **Escrita/Atualização/Remoção:** Não escreve dados diretamente.

### `src/pages/collaborators/CollaboratorsPage.tsx` (Lista de Colaboradores)

*   **Propósito:** Exibir uma lista paginada de colaboradores (usuários) com opções de filtro e busca.
*   **Funcionalidades:** Listagem de colaboradores (ativos e inativos), busca por termo, visualização de papel e status, paginação, desativação/reativação de colaborador (apenas admin), exportação para Excel, navegação para criação e detalhes do colaborador.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados de **todos os usuários** do nó `users` (leitura direta com `get(ref(db, 'users'))`).
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o campo `active` de um usuário no nó `users` (`update`).

### `src/pages/collaborators/NewCollaboratorPage.tsx` (Novo Colaborador)

*   **Propósito:** Permitir o cadastro de um novo colaborador (usuário).
*   **Funcionalidades:** Formulário para inserir dados do colaborador (nome, email, senha, CPF, telefone, datas, papel), validação de formulário.
*   **Comunicação com DB:**
    *   **Leitura:** Não lê dados diretamente do Realtime Database.
    *   **Escrita/Atualização/Remoção:**
        *   **Cria** um novo usuário no **Firebase Authentication** (`createUserWithEmailAndPassword`).
        *   **Cria** um novo registro no nó `users` do **Firebase Realtime Database** (`set`) com os dados adicionais e o UID retornado pela autenticação.

### `src/pages/collaborators/CollaboratorDetailsPage.tsx` (Detalhes do Colaborador)

*   **Propósito:** Exibir informações detalhadas de um colaborador específico e listar as atividades atribuídas a ele.
*   **Funcionalidades:** Visualização de dados do colaborador, lista paginada de atividades atribuídas, filtragem de atividades por termo, status, período e tipo, atualização de status do colaborador (apenas admin), navegação para edição do colaborador e detalhes da atividade.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados de um **colaborador específico** do nó `users` (`getCollaboratorById`).
        *   Lê as **atividades atribuídas a este colaborador** do nó `activities` (`getActivitiesByAssignee`).
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o campo `status` de um usuário no nó `users` (`updateCollaboratorStatus`).

### `src/pages/collaborators/EditCollaboratorPage.tsx` (Editar Colaborador)

*   **Propósito:** Permitir a edição das informações de um colaborador existente.
*   **Funcionalidades:** Formulário preenchido com dados do colaborador, edição de campos (nome, CPF, telefone, datas, papel, status), validação de formulário.
*   **Comunicação com DB:**
    *   **Leitura:**
        *   Lê os dados do **colaborador a ser editado** do nó `users` (leitura direta com `get(ref(db, 'users'))`).
    *   **Escrita/Atualização/Remoção:**
        *   **Atualiza** o registro do usuário no nó `users` (`update`).

## 5. Considerações Adicionais

*   **Gerenciamento de Autenticação e Autorização:** O projeto utiliza o Firebase Authentication para gerenciar o login dos usuários. O `AuthContext` (`src/contexts/AuthContext.tsx`) armazena as informações do usuário logado, incluindo seu papel (`role`). Este papel é utilizado em diversas páginas para controlar a visibilidade de dados e a permissão para realizar certas ações (ex: apenas 'admin' pode criar/desativar colaboradores, 'admin' e 'manager' têm visibilidade maior de atividades).
*   **Tratamento de Erros:** O hook `useToast` (`@/components/ui/use-toast`) é amplamente utilizado em todo o projeto para exibir notificações amigáveis ao usuário em caso de sucesso ou falha nas operações.
*   **Exportação de Dados:** Funções utilitárias em `src/utils/exportUtils.ts` (utilizando a biblioteca `xlsx`) são responsáveis por formatar e exportar dados de listas (atividades, clientes, colaboradores) para arquivos Excel.
*   **Estrutura do Código:** O código segue uma estrutura modular, separando componentes de UI (`src/components/ui/`), lógica de autenticação e acesso a dados (`src/services/firebase/`), hooks customizados (`src/hooks/`), contextos (`src/contexts/`) e páginas (`src/pages/`). Isso facilita a organização e a manutenção do projeto.

Esta documentação fornece uma visão abrangente do projeto "activity-logbook-hub", cobrindo suas tecnologias, estrutura de dados e funcionalidades por página.