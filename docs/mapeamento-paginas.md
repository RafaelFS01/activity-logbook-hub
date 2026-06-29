# 🗺️ Mapeamento de Páginas e Comunicação com o Banco de Dados

Este documento mapeia todas as páginas e rotas da aplicação React, detalhando suas responsabilidades e como elas interagem com o Firebase (Authentication e Realtime Database).

---

## 🔐 Autenticação, Entrada e Telas de Status

### 1. `src/pages/Login.tsx` (Página de Login)
*   **Propósito:** Portal de entrada e autenticação do usuário.
*   **Funcionalidades:** Exibição do formulário de credenciais, alternador de temas visuais (Light, Dark, H12, H12-Alt), controle de visibilidade da senha e redirecionamento de usuário autenticado.
*   **Comunicação com o Banco:**
    *   **Autenticação:** Interage exclusivamente com o **Firebase Authentication** (`signInWithEmailAndPassword`) para autenticar o usuário.

### 2. `src/pages/AdminSetup.tsx` (Configuração Inicial)
*   **Propósito:** Criação do primeiro usuário com papel de Administrador (`admin`).
*   **Funcionalidades:** Impede o uso de credenciais vazias, solicita CPF, telefone, data de nascimento e salva o administrador padrão do sistema.
*   **Comunicação com o Banco:**
    *   **Escrita:** Cria o login no **Firebase Auth** e insere os metadados em `users/[UID]`.

### 3. `src/pages/Unauthorized.tsx` (Acesso Negado)
*   **Propósito:** Tela de status apresentada quando o colaborador tenta forçar o acesso a uma rota para a qual ele não tem privilégios.
*   **Funcionalidades:** Mensagem de erro amigável e botão para retornar ao Dashboard principal.
*   **Comunicação com o Banco:** Não acessa o banco.

### 4. `src/pages/NotFound.tsx` (Erro 404)
*   **Propósito:** Rota de fallback apresentada quando a URL digitada não corresponde a nenhuma rota interna declarada.
*   **Funcionalidades:** Redirecionamento amigável para a página inicial.
*   **Comunicação com o Banco:** Não acessa o banco.

---

## 📊 Dashboard e Configurações Administrativas

### 5. `src/pages/Index.tsx` (Dashboard Operacional)
*   **Propósito:** Painel central de controle e produtividade.
*   **Funcionalidades:** Exibição de gráficos de rosca e barras (Recharts) consolidados por status de atividades, painel de atividades recentes, listagem rápida de atividades em atraso e abas de filtro temporal (Hoje, Semana, Mês, Geral).
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê o nó `activities` (todas as atividades do colaborador ou da equipe, conforme papel de permissão) e lê o nó `users` para carregar nomes dos responsáveis.

### 6. `src/pages/Settings.tsx` (Configurações e Ferramentas)
*   **Propósito:** Central de ferramentas administrativas para o Administrador e Gerente.
*   **Funcionalidades:** Abas de configuração de sistema, usuários e a ferramenta de migração de dados de clientes por meio do componente `ClientMigration`.
*   **Comunicação com o Banco:**
    *   **Escrita/Migração:** Executa a migração no nó de clientes para adicionar o campo padrão de introdução de relatório (`reportIntroduction`).

---

## 📄 Relatórios e Exportação Inteligente

### 7. `src/pages/reports/ReportsPage.tsx` e `ReportConfigCard.tsx` (Geração de Relatórios)
*   **Propósito:** Central de download e geração de relatórios formais.
*   **Funcionalidades:** Seleção de cliente, filtro de período e botão para geração de relatórios individuais ou em lote.
*   **Comunicação com o Banco:**
    *   **Leitura:** Consulta os clientes ativos no nó `clients` e lê as atividades do cliente associadas no período selecionado.
    *   **IA Gemini:** Envia as atividades para geração de resumos em lote por requisição única.
    *   **Geração:** Mescla as atividades com o arquivo do Word (`/templates/template - Nova Estrutura.docx`) usando Docxtemplater e PizZip. Quando em lote, compacta e exporta como `.zip` via JSZip.

---

## 📋 Módulo de Atividades

### 8. `src/pages/activities/ActivitiesPage.tsx` (Lista de Atividades)
*   **Propósito:** Painel administrativo das atividades da empresa.
*   **Funcionalidades:** Busca de atividades por texto, filtros avançados, alteração pontual e rápida de status na tabela de registros e botão de exportação formatada para planilha Excel.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê `activities`, `clients` e `users`.
    *   **Escrita:** Atualiza pontualmente o status de uma atividade em `activities/[ActivityId]/status`.

### 9. `src/pages/activities/NewActivityPage.tsx` (Nova Atividade)
*   **Propósito:** Cadastro de tarefas.
*   **Funcionalidades:** Formulário com validação Zod para cadastrar dados de atividades com opção de criar novas tags de categorias.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê `clients` ativos e tipos de atividades cadastrados.
    *   **Escrita:** Adiciona novo nó filho sob `activities`.

### 10. `src/pages/activities/ActivityDetailsPage.tsx` (Detalhes da Atividade)
*   **Propósito:** Central de informações de uma única atividade.
*   **Funcionalidades:** Timeline de progresso, visualização de responsáveis atribuídos e dados cadastrais do cliente associado.
*   **Comunicação com o Banco:**
    *   **Leitura:** Busca dados em `activities/[ActivityId]`, `clients/[ClientId]` e `users/[UID]`.
    *   **Escrita:** Permite alterar o status ou efetuar a exclusão lógica da atividade (alterando status para `cancelled`).

### 11. `src/pages/activities/EditActivityPage.tsx` (Editar Atividade)
*   **Propósito:** Alteração de dados de tarefas.
*   **Funcionalidades:** Formulário de edição de dados pré-preenchido com as informações atuais da atividade.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê `activities/[ActivityId]` e lê a lista de clientes para seleção.
    *   **Escrita:** Atualiza os dados em `activities/[ActivityId]`.

---

## 🏢 Módulo de Clientes

### 12. `src/pages/clients/ClientsPage.tsx` (Lista de Clientes)
*   **Propósito:** Gestão de clientes.
*   **Funcionalidades:** Listagem de clientes com pesquisa por termo, filtros por tipo (PF/PJ), inativação lógica de registros e exportação para Excel.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê a lista completa sob o nó `clients`.
    *   **Escrita:** Inativação lógica alterando o campo `active` de `clients/[ClientId]` para `false`.

### 13. `src/pages/clients/NewClientPage.tsx` (Novo Cliente)
*   **Propósito:** Cadastro de clientes.
*   **Funcionalidades:** Formulário com abas para PF (CPF, RG) ou PJ (CNPJ, Razão Social, Responsável).
*   **Comunicação com o Banco:**
    *   **Escrita:** Cria um novo registro sob o nó `clients`.

### 14. `src/pages/clients/EditClientPage.tsx` (Editar Cliente)
*   **Propósito:** Atualização cadastral de clientes.
*   **Funcionalidades:** Permite editar todos os dados cadastrais de PF/PJ e os campos de suporte a relatórios como `reportIntroduction` e notas administrativas.
*   **Comunicação com o Banco:**
    *   **Leitura:** Busca dados de `clients/[ClientId]`.
    *   **Escrita:** Atualiza dados cadastrais no nó `clients/[ClientId]`.

### 15. `src/pages/clients/ClientDetailsPage.tsx` (Detalhes do Cliente)
*   **Propósito:** Histórico de clientes.
*   **Funcionalidades:** Dados cadastrais do cliente e listagem de todas as atividades associadas a ele.
*   **Comunicação com o Banco:**
    *   **Leitura:** Busca dados do cliente e as atividades vinculadas a ele.

---

## 👥 Módulo de Colaboradores (Área Administrativa)

### 16. `src/pages/collaborators/CollaboratorsPage.tsx` (Lista de Colaboradores)
*   **Propósito:** Controle da equipe interna.
*   **Funcionalidades:** Listagem de colaboradores, exibição dos papéis de acesso e atalhos rápidos para desativar/reativar usuários.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê todos os usuários salvos no nó `users`.
    *   **Escrita:** Altera a flag lógica `active` de `users/[UID]`.

### 17. `src/pages/collaborators/NewCollaboratorPage.tsx` (Novo Colaborador)
*   **Propósito:** Cadastro de colaboradores.
*   **Funcionalidades:** Inserção de dados do colaborador (nome, CPF, telefone, datas) e definição do nível de permissão (Admin, Manager, Collaborator).
*   **Comunicação com o Banco:**
    *   **Escrita:**
        1. Cria a conta no **Firebase Auth** (`createUserWithEmailAndPassword`).
        2. Salva os metadados do usuário em `users/[UID]` no Realtime Database.

### 18. `src/pages/collaborators/CollaboratorDetailsPage.tsx` (Detalhes do Colaborador)
*   **Propósito:** Produtividade individual do colaborador.
*   **Funcionalidades:** Ficha do colaborador e listagem de todas as atividades atribuídas a ele.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê os dados em `users/[UID]` e faz uma consulta de atividades buscando a ocorrência do UID no array `assignedTo`.

### 19. `src/pages/collaborators/EditCollaboratorPage.tsx` (Editar Colaborador)
*   **Propósito:** Alterar cadastro do colaborador.
*   **Funcionalidades:** Formulário de edição de dados pessoais e alteração de papéis de permissão.
*   **Comunicação com o Banco:**
    *   **Leitura:** Lê o nó `users/[UID]`.
    *   **Escrita:** Executa o `update` no Realtime Database em `users/[UID]`.

---

## ❓ Módulo do eSocial (Dúvidas Técnicas)

### 20. `src/pages/ESocialQuestionsPage.tsx` (Dúvidas do eSocial)
*   **Propósito:** Base de dados interna sobre diretrizes do eSocial.
*   **Funcionalidades:** Visualização de perguntas e respostas em acordeões colapsáveis (com suporte a formatação rica estilo Markdown para negrito, itálico, links e listas de marcadores), filtragem avançada por tags, busca rápida textual por palavras-chave e tela de inclusão/edição/deleção de perguntas e criação de tags (acessível para administradores e gerentes).
*   **Comunicação com o Banco:**
    *   **Leitura:** Consome os nós `esocialQuestions` e `esocialTags`.
    *   **Escrita:** Cria, edita e remove perguntas (`esocialQuestions`) e tags (`esocialTags`).
