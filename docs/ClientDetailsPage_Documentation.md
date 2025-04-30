# Documentação Detalhada: Página de Detalhes do Cliente (`ClientDetailsPage.tsx`)

## 1. Propósito da Página

A página `ClientDetailsPage.tsx` é responsável por exibir informações completas sobre um cliente específico, identificado pelo seu ID na URL. Além dos dados cadastrais do cliente (seja Pessoa Jurídica ou Pessoa Física), a página lista todas as atividades associadas a ele.

A página oferece funcionalidades interativas para o usuário:
*   Visualização dos dados cadastrais do cliente.
*   Visualização e gerenciamento (filtragem, busca, paginação) das atividades relacionadas ao cliente.
*   Opções de exportação das atividades filtradas para formatos Excel e PDF.
*   Navegação de volta para a lista geral de clientes e para a página de edição do cliente atual.
*   Exibição de status (ativo/inativo para o cliente, pendente/em andamento/concluída/cancelada para as atividades) de forma visualmente distinta.
*   Tratamento de estados de carregamento e cliente não encontrado.
## 2. Estrutura do Arquivo (`ClientDetailsPage.tsx`)

O arquivo `ClientDetailsPage.tsx` define um componente funcional React que utiliza vários hooks para gerenciar seu estado e comportamento:

*   **`useState`**: Utilizado para gerenciar o estado do cliente (`client`), a lista completa de atividades (`activities`), as atividades filtradas (`filteredActivities`), o estado de carregamento (`loading`), os termos de busca e filtros (`searchTerm`, `statusFilters`, `dateType`, `startPeriod`, `endPeriod`, `selectedType`), a lista de colaboradores (`collaborators`), os tipos de atividade disponíveis (`activityTypes`), o estado de geração de PDF (`isGeneratingPdf`) e a página atual da lista de atividades (`currentPage`).
*   **`useEffect`**: Dois `useEffect` principais são usados:
    *   O primeiro (`useEffect` com dependências `[id, user]`) é responsável por buscar os dados do cliente e suas atividades associadas ao montar o componente ou quando o ID do cliente ou o usuário logado mudam. Ele também busca a lista de todos os usuários (colaboradores) do banco de dados.
    *   O segundo (`useEffect` com dependências `[activities, searchTerm, statusFilters, dateType, startPeriod, endPeriod, selectedType]`) é responsável por aplicar os filtros e a busca à lista de atividades sempre que qualquer uma das dependências de filtro ou a lista original de atividades mudar.
*   **`useMemo`**: Utilizado para memorizar a lista de atividades a serem exibidas na página atual (`currentActivities`), recalculando-a apenas quando a lista de atividades filtradas ou a página atual mudam. Isso otimiza a performance ao evitar recálculos desnecessários durante renderizações.
*   **`useRef`**: Utilizado para criar uma referência (`pdfReportRef`) a um elemento DOM específico (`&lt;div&gt;`) que contém o conteúdo a ser exportado como PDF.
*   **`useParams`**: Hook do `react-router-dom` para obter o parâmetro `id` da URL, que identifica o cliente a ser exibido.
*   **`useNavigate`**: Hook do `react-router-dom` para permitir a navegação programática para outras rotas da aplicação.
*   **`useAuth`**: Hook de contexto customizado (`@/contexts/AuthContext`) para acessar informações do usuário logado, como seu papel (`user?.role`) e ID (`user?.uid`), que são usados para filtrar atividades visíveis para colaboradores.
*   **`useToast`**: Hook customizado (`@/components/ui/use-toast`) para exibir notificações (toasts) ao usuário, por exemplo, em caso de erros ao carregar dados ou exportar arquivos.
## 3. Dependências (Importações)

A página `ClientDetailsPage.tsx` importa e utiliza funcionalidades de diversos outros arquivos e bibliotecas:

*   **Hooks do React**: `useState`, `useEffect`, `useMemo`, `useRef` (do pacote `react`).
*   **Hooks de Roteamento**: `useParams`, `useNavigate` (do pacote `react-router-dom`).
*   **Serviços Firebase**:
    *   `getClientById`, `Client`, `PessoaJuridicaClient`, `PessoaFisicaClient` (de `@/services/firebase/clients`): Funções e tipos para buscar dados de clientes.
    *   `getActivitiesByClient`, `Activity`, `ActivityStatus` (de `@/services/firebase/activities`): Funções e tipos para buscar dados de atividades.
    *   `UserData` (de `@/services/firebase/auth`): Tipo para dados de usuário/colaborador.
*   **Componentes de UI (Shadcn UI)**: Uma vasta gama de componentes estilizados é importada de `@/components/ui/...` para construir a interface do usuário, incluindo `Button`, `Card`, `Badge`, `Skeleton`, `Tabs`, `Input`, `Popover`, `Calendar`, `Label`, `RadioGroup`, `Checkbox`, `Combobox`, entre outros.
*   **Ícones**: Vários ícones são importados de `lucide-react` para melhorar a representação visual de informações e ações.
*   **Bibliotecas de Data**:
    *   `formatDistanceToNow`, `format` (do pacote `date-fns`): Para formatar datas de forma amigável e para nomes de arquivo.
    *   `ptBR` (do pacote `date-fns/locale`): Para localização das funções de data para Português do Brasil.
*   **Utilitários**:
    *   `cn` (de `@/lib/utils`): Função utilitária para concatenar classes CSS condicionalmente.
    *   `exportActivitiesToExcel` (de `@/utils/exportUtils`): Função para exportar dados de atividades para um arquivo Excel.
*   **Firebase SDK**:
    *   `get`, `ref` (do pacote `firebase/database`): Funções para interagir diretamente com o Realtime Database do Firebase (usado para buscar a lista de usuários).
    *   `db` (de `@/lib/firebase`): Instância inicializada do banco de dados Firebase.
*   **Biblioteca de Exportação PDF**: `html2pdf` (do pacote `html2pdf.js`): Biblioteca para gerar arquivos PDF a partir de conteúdo HTML.
*   **Componente de Relatório PDF**: `PdfReportTemplate` (de `@/components/reports/PdfReportTemplate`): Um componente React que formata os dados das atividades para a visualização e exportação em PDF.
*   **Estilos do Relatório PDF**: `@/components/reports/PdfReportTemplate.css`: Arquivo CSS específico para estilizar o componente de relatório PDF.
## 4. Fluxo de Dados e Lógica

O fluxo de dados e a lógica da página `ClientDetailsPage.tsx` seguem os seguintes passos:

1.  **Carregamento Inicial (`useEffect` [id, user])**:
    *   Ao carregar a página ou quando o `id` do cliente na URL ou o `user` logado mudam, o primeiro `useEffect` é acionado.
    *   O estado `loading` é definido como `true`.
    *   A função `getClientById(id)` é chamada para buscar os dados do cliente no Firebase.
    *   A função `getActivitiesByClient(id)` é chamada para buscar todas as atividades relacionadas a este cliente.
    *   Os tipos únicos de atividades são extraídos e armazenados no estado `activityTypes`.
    *   Se o usuário logado for um 'collaborator', a lista de atividades é filtrada para incluir apenas aquelas onde o usuário está atribuído (`activity.assignedTo` inclui `user.uid`).
    *   As listas de atividades (`activities`) e atividades filtradas (`filteredActivities`) são atualizadas.
    *   A página atual (`currentPage`) é resetada para 1.
    *   Uma chamada direta ao Firebase Realtime Database (`get(ref(db, 'users'))`) é feita para obter a lista completa de usuários, que é usada posteriormente para exibir os nomes dos colaboradores atribuídos às atividades e na exportação.
    *   O estado `loading` é definido como `false` após a conclusão (sucesso ou falha) das operações de busca.
    *   Em caso de erro durante a busca, uma mensagem de erro é exibida usando `useToast`.

2.  **Filtragem de Atividades (`useEffect` [activities, searchTerm, statusFilters, dateType, startPeriod, endPeriod, selectedType])**:
    *   Este `useEffect` é acionado sempre que a lista original de atividades (`activities`) ou qualquer um dos estados de filtro (`searchTerm`, `statusFilters`, `dateType`, `startPeriod`, `endPeriod`, `selectedType`) mudam.
    *   Uma cópia da lista original de atividades é criada.
    *   Os filtros são aplicados sequencialmente:
        *   **Busca por Termo**: Filtra atividades cujo título ou descrição incluem o `searchTerm` (case-insensitive).
        *   **Filtro por Status**: Filtra atividades cujo status está incluído na lista `statusFilters`.
        *   **Filtro por Tipo**: Filtra atividades cujo tipo corresponde ao `selectedType`.
        *   **Filtro por Período de Data**: Filtra atividades com base nas datas `startPeriod` e `endPeriod`, considerando se o filtro é aplicado à data de início (`startDate`) ou data de término (`endDate`) da atividade, conforme definido por `dateType`.
    *   A lista `filteredActivities` é atualizada com o resultado da filtragem.
    *   A página atual (`currentPage`) é resetada para 1 para garantir que o usuário veja os resultados filtrados desde o início.

3.  **Paginação (`useMemo` e `handlePageChange`)**:
    *   O hook `useMemo` calcula a sublista de atividades a serem exibidas na página atual (`currentActivities`) com base em `filteredActivities` e `currentPage`. Isso garante que a lista paginada seja recalculada apenas quando necessário.
    *   A função `handlePageChange` atualiza o estado `currentPage` e rola a visualização para o topo da lista de atividades paginada.

4.  **Exibição Condicional**:
    *   Enquanto `loading` for `true`, um estado de carregamento (esqueleto) é exibido.
    *   Se, após o carregamento, o estado `client` for `null`, uma mensagem indicando que o cliente não foi encontrado é exibida.
    *   Caso contrário, os detalhes do cliente e a lista de atividades (paginada e filtrada) são exibidos.

5.  **Exportação (`handleExport` e `handleExportPdf`)**:
    *   `handleExport`: Prepara os dados das atividades filtradas, incluindo o nome do cliente e o nome dos colaboradores atribuídos (usando o mapa `collaborators`), e chama a função utilitária `exportActivitiesToExcel` para gerar um arquivo Excel. Exibe toasts de sucesso ou erro.
    *   `handleExportPdf`: Verifica se há dados de cliente e atividades filtradas e se a referência `pdfReportRef` está disponível. Define o estado `isGeneratingPdf` como `true`. Configura as opções para a biblioteca `html2pdf.js` e chama a função `html2pdf().from(element).set(options).save()` para gerar e baixar o PDF do conteúdo referenciado por `pdfReportRef`. Exibe toasts de sucesso ou erro e define `isGeneratingPdf` como `false` ao finalizar.

6.  **Funções Auxiliares**:
    *   `getClientTypeIcon`: Retorna o ícone apropriado (usuário ou prédio) com base no tipo de cliente (Pessoa Física ou Jurídica).
    *   `getStatusBadge`: Retorna um componente `Badge` estilizado com base no status do cliente (ativo/inativo) ou no status da atividade.
    *   `formatDate`: Formata uma string de data para o formato 'dd/MM/yyyy'.
    *   `toggleStatusFilter`: Adiciona ou remove um status da lista de filtros de status.
    *   `resetFilters`: Limpa todos os filtros aplicados às atividades.
## 5. Interações com o Banco de Dados (Firebase)

A página `ClientDetailsPage.tsx` interage com o Firebase Realtime Database principalmente através das funções de serviço definidas em `@/services/firebase/clients.ts`, `@/services/firebase/activities.ts` e diretamente com o SDK para buscar usuários.

As principais interações são:

*   **Busca de Dados do Cliente**:
    *   Utiliza a função assíncrona `getClientById(id: string): Promise&lt;Client | null&gt;` do serviço de clientes.
    *   Esta função busca no nó `clients` do banco de dados pelo cliente com o ID fornecido.
    *   Retorna um objeto `Client` (que pode ser `PessoaJuridicaClient` ou `PessoaFisicaClient`) se encontrado, ou `null` caso contrário.
    *   O resultado é armazenado no estado `client`.

*   **Busca de Atividades do Cliente**:
    *   Utiliza a função assíncrona `getActivitiesByClient(clientId: string): Promise&lt;Activity[]&gt;` do serviço de atividades.
    *   Esta função busca no nó `activities` do banco de dados, filtrando as atividades onde o campo `clientId` corresponde ao ID do cliente atual.
    *   Retorna um array de objetos `Activity`.
    *   O resultado é armazenado no estado `activities` (após possível filtragem por usuário colaborador) e `filteredActivities`.

*   **Busca da Lista de Usuários (Colaboradores)**:
    *   Realiza uma chamada direta ao Firebase SDK: `get(ref(db, 'users'))`.
    *   Busca todos os dados presentes no nó `users` do banco de dados.
    *   Os dados são processados para criar um mapa (`collaborators`) onde a chave é o UID do usuário e o valor é o objeto `UserData` do usuário, incluindo o UID.
    *   Este mapa é usado para exibir os nomes dos colaboradores atribuídos às atividades e na função de exportação para Excel.

Todas essas operações são realizadas dentro do primeiro `useEffect` da página, garantindo que os dados sejam carregados ao montar o componente. O tratamento de erros é implementado para capturar falhas nas operações do Firebase e notificar o usuário via toast.
## 6. Componentes Filhos Utilizados

A página `ClientDetailsPage.tsx` compõe sua interface utilizando uma variedade de componentes da biblioteca Shadcn UI e um componente customizado para relatórios:

*   **`Button`**: Usado para ações como voltar para a lista de clientes, editar cliente, exportar atividades (Excel e PDF), resetar filtros e navegação entre páginas da lista de atividades.
*   **`Card`**: Utilizado para agrupar visualmente seções de conteúdo, como os dados cadastrais do cliente e a lista de atividades. `CardHeader`, `CardContent` e `CardFooter` são usados para estruturar o conteúdo dentro dos cards.
*   **`Badge`**: Usado para exibir o status do cliente (Ativo/Inativo) e o status de cada atividade (Concluída, Em andamento, Cancelada, Pendente) de forma visualmente distinta.
*   **`Skeleton`**: Exibido condicionalmente enquanto os dados estão sendo carregados para fornecer feedback visual ao usuário.
*   **`Tabs`**: Permite alternar entre a visualização das "Informações do Cliente" e a lista de "Atividades". `TabsList` e `TabsTrigger` definem os cabeçalhos das abas, e `TabsContent` contém o conteúdo de cada aba.
*   **`Input`**: Usado para o campo de busca textual nas atividades.
*   **`Popover`**: Utilizado para exibir o calendário (`Calendar`) para seleção de períodos de data para filtragem.
*   **`Calendar`**: Componente de seleção de data, usado dentro de um `Popover` para definir os períodos de início e fim dos filtros de data.
*   **`Label`**: Usado para associar rótulos aos elementos de formulário, como os Radio Groups e Checkboxes.
*   **`RadioGroup`**: Usado para selecionar o tipo de data a ser filtrada (Data de Início ou Data de Término). `RadioGroupItem` representa cada opção.
*   **`Checkbox`**: Usado para selecionar múltiplos status de atividade para filtragem.
*   **`Combobox`**: Usado para selecionar o tipo de atividade para filtragem a partir de uma lista de tipos únicos encontrados nas atividades do cliente.
*   **`PdfReportTemplate`**: Um componente customizado (`@/components/reports/PdfReportTemplate`) que recebe os dados do cliente, atividades filtradas e informações dos colaboradores e renderiza o layout do relatório PDF. Este componente é referenciado por `pdfReportRef` para ser utilizado pela biblioteca `html2pdf.js`.