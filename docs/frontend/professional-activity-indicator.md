# Planejamento Estratégico: Indicador de Profissionais Ativos nas Páginas

## Objetivo
Implementar um sistema visual que indique quando profissionais estão ativos em páginas específicas da aplicação, melhorando a consciência situacional e facilitando a coordenação entre usuários.

## Contexto Atual
- Sistema de navegação com múltiplas páginas (Dashboard, Home, Atividades, Clientes, etc.)
- Usuários com diferentes papéis (admin, manager, professional)
- Necessidade de visualizar onde os profissionais estão ativos

## Requisitos Funcionais

### 1. Sistema de Gerenciamento de Atividade
- **Contexto de Atividade**: Gerenciar status de atividade dos usuários em tempo real
- **Persistência**: Manter estado durante a sessão do usuário
- **Sincronização**: Possibilidade de sincronização entre múltiplos usuários

### 2. Indicadores Visuais
- **Badge/Ponto Colorido**: Indicador visual discreto mas visível
- **Posicionamento**: Localizado no canto superior direito de cada botão da sidebar
- **Cores Semânticas**:
  - Verde: Profissionais ativos
  - Laranja: Profissionais ociosos
  - Cinza: Nenhum profissional ativo

### 3. Integração com Páginas
- **Mapeamento Página-Profissional**: Cada página deve mostrar profissionais ativos nela
- **Atualização Dinâmica**: Indicadores devem atualizar em tempo real
- **Compatibilidade**: Funcionar com diferentes temas

## Implementações Planejadas

### 1. Contexto de Atividade
- Criar `ActivityContext` para gerenciar estado global de atividade
- Hooks customizados para registrar/desregistrar atividade
- Simulação de dados para desenvolvimento

### 2. Componente Indicador
- Componente `ActivityIndicator` reutilizável
- Badge com contagem de profissionais ativos
- Animação de pulso para atividade recente

### 3. Integração na Sidebar
- Adicionar indicador em cada botão de navegação
- Posicionamento absoluto no canto superior direito
- Responsivo para modo colapsado

## Tarefas Detalhadas

- [x] Criar arquivo de planejamento estratégico
- [x] Implementar contexto para gerenciar status de atividade
- [x] Criar componente indicador visual
- [x] Integrar indicador na sidebar
- [x] Testar e ajustar feedback visual

## Implementações Realizadas

### 1. Contexto de Atividade ✅
- **ActivityContext**: Gerenciamento global do estado de atividade dos profissionais
- **Dados Mockados**: 4 profissionais simulados para desenvolvimento
- **Funcionalidades**: Registro, atualização e remoção de profissionais ativos
- **Hook Customizado**: `useActivity()` para acesso fácil ao contexto

### 2. Componente Indicador Visual ✅
- **ActivityIndicator**: Componente reutilizável com múltiplas variantes
- **SidebarActivityIndicator**: Versão específica para sidebar com posicionamento fixo
- **Variantes**: Dot (ponto), Badge (selo) e Pulse (pulso)
- **Tooltip Interativo**: Mostra detalhes dos profissionais ativos

### 3. Integração na Sidebar ✅
- **Indicadores em todos os botões**: Dashboard, Home, Atividades, Clientes, Colaboradores, Relatórios, Configurações
- **Posicionamento**: Canto superior direito de cada item do menu
- **Responsividade**: Funciona no modo colapsado da sidebar
- **Animação de Pulso**: Indicador verde pulsante para atividade recente

### 4. Estilos e Animações ✅
- **CSS Personalizado**: 70+ linhas de estilos no `index.css`
- **Animação de Pulso**: `activity-pulse` com escala e opacidade
- **Compatibilidade**: Funciona com todos os temas (light, dark, h12, h12-alt)
- **Hover Effects**: Interação suave ao passar o mouse

## Critérios de Sucesso ✅
- [x] Indicadores visuais claros e não intrusivos
- [x] Animação de pulso para atividade recente
- [x] Compatibilidade com diferentes temas
- [x] Performance otimizada
- [x] Facilita coordenação entre profissionais

## Funcionalidades Implementadas

### 🎯 Indicadores Visuais
- **Ponto Verde Pulsante**: Indica profissionais ativos na página
- **Contador Numérico**: Mostra quantidade de profissionais (ex: "3")
- **Tooltip Informativo**: Lista nomes e cargos dos profissionais ativos
- **Posicionamento Estratégico**: Canto superior direito de cada botão

### 📊 Dados de Exemplo
- **Ana Silva** (Enfermeira) - Ativa em `/home`
- **Carlos Santos** (Médico) - Ativo em `/activities`
- **Maria Oliveira** (Técnica) - Inativa em `/clients`
- **João Pereira** (Administrador) - Ativo em `/reports`

### 🎨 Experiência Visual
- **Animação Suave**: Pulso de 2s com escala de 1.1x
- **Cores Semânticas**: Verde para atividade ativa
- **Bordas Temáticas**: Adaptadas para cada tema
- **Hover Effects**: Pausa animação e aumenta escala
- **Responsividade**: Adapta-se ao modo colapsado

### 🔧 Aspectos Técnicos
- **Context API**: Gerenciamento de estado global
- **TypeScript**: Tipagem completa e segura
- **Componentes Reutilizáveis**: Fácil manutenção e extensão
- **CSS-in-JS + Classes**: Estilos otimizados e performáticos
- **Acessibilidade**: Tooltips informativos para screen readers

## Arquivos Afetados
- `src/contexts/ActivityContext.tsx` - Novo contexto
- `src/components/ui/ActivityIndicator.tsx` - Novo componente
- `src/components/layout/MainSidebar.tsx` - Integração
- `src/hooks/useActivity.ts` - Hook customizado

## Considerações Técnicas
- Utilizar React Context para estado global
- WebSocket ou polling para sincronização em tempo real (fase futura)
- Dados mockados inicialmente para desenvolvimento
- Design system consistente com o existente
- Acessibilidade mantida
