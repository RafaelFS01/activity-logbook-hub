# Planejamento Estratégico - Nova Funcionalidade de Relatórios

## Visão Geral
Implementação de uma nova funcionalidade de relatórios que utiliza o arquivo `template - Copia.docx` como base para geração de relatórios personalizados por cliente e período.

## Objetivos
- Criar uma página dedicada de "Relatórios" acessível pela barra lateral
- Implementar configurações flexíveis para seleção de cliente e período
- Gerar relatórios usando texto completo das atividades (sem resumos de IA)
- Utilizar o arquivo `template - Copia.docx` como template base

## Escopo da Funcionalidade

### 1. Página de Relatórios
- Nova rota `/reports` acessível pela barra lateral
- Interface limpa e intuitiva focada em geração de relatórios

### 2. Card de Configurações
- **Seleção de Cliente**: Dropdown com todos os clientes ativos
- **Período de Emissão**: Campos de data inicial e final
- **Botão de Geração**: Inicia o processo de criação do relatório

### 3. Processo de Geração
- Carrega o arquivo `template - Copia.docx` da pasta `public/templates/`
- Filtra atividades por cliente e período selecionados
- Usa IA (Gemini) para gerar resumos aprimorados das atividades
- Substitui placeholders no template com dados reais (incluindo resumos da IA)
- Gera arquivo DOCX para download
- Fallback para texto original se IA falhar

## Estrutura Técnica

### Arquivos a Criar/Modificar
- `src/pages/reports/ReportsPage.tsx` - Página principal de relatórios
- `src/pages/reports/ReportConfigCard.tsx` - Componente do card de configurações
- `src/services/reports/reportGenerator.ts` - Serviço para geração de relatórios
- Modificar `src/components/layout/MainSidebar.tsx` - Adicionar navegação

### Dependências Utilizadas
- **Docxtemplater**: Para processamento do template Word
- **PizZip**: Para manipulação de arquivos DOCX
- **file-saver**: Para download do arquivo gerado
- **Serviços existentes**: `clients.ts`, `activities.ts`

## Fluxo de Funcionamento

1. **Navegação**: Usuário clica em "Relatórios" na barra lateral
2. **Configuração**: Seleciona cliente e período desejado
3. **Validação**: Sistema verifica se existem atividades no período selecionado
4. **IA**: Gera resumos aprimorados das atividades usando Gemini
5. **Geração**: Processa template com dados das atividades (incluindo resumos da IA)
6. **Download**: Arquivo DOCX é baixado automaticamente

## Placeholders do Template
Baseado na análise do código atual, o template deve conter:
- `{entidade_cliente}` - Nome do cliente selecionado
- `{data_inicial}` - Data inicial do período (formato dd/MM/yyyy)
- `{data_final}` - Data final do período (formato dd/MM/yyyy)
- `{lista_servicos}` - Lista de atividades (com loop)
  - `{descricao_servico}` - Resumo aprimorado da atividade (gerado por IA)
- `{data_extenso_emissao}` - Data atual de geração

## Considerações de UX/UI
- Interface simples e focada na tarefa
- Feedback visual durante geração do relatório
- Tratamento adequado de estados de erro e loading
- Validação clara de campos obrigatórios

## Cronograma de Implementação

### Fase 1: Estrutura Base
- [ ] Criar página de relatórios básica
- [ ] Adicionar navegação na barra lateral
- [ ] Implementar layout inicial

### Fase 2: Componentes de Configuração
- [ ] Criar componente do card de configurações
- [ ] Implementar seleção de cliente
- [ ] Adicionar campos de período

### Fase 3: Lógica de Geração
- [ ] Implementar serviço de geração de relatórios
- [ ] Integrar processamento do template
- [ ] Adicionar tratamento de erros

### Fase 4: Testes e Refinamentos
- [ ] Testar com dados reais
- [ ] Ajustar formatação e apresentação
- [ ] Otimizar performance

## Riscos e Mitigações
- **Dependência de template externo**: Manter cópia de segurança atualizada
- **Performance com muitos dados**: Implementar paginação se necessário
- **Tratamento de erros**: Logging detalhado e mensagens claras ao usuário

## Critérios de Aceitação
- [x] Página acessível pela barra lateral
- [x] Seleção de cliente funciona corretamente
- [x] Filtros de período aplicados adequadamente
- [x] Relatório gerado com texto completo das atividades
- [x] Arquivo baixado com nome apropriado
- [x] Tratamento adequado de casos sem atividades

## Status da Implementação

### ✅ Implementação Concluída (100%)

**Arquivos Criados:**
- `src/pages/reports/ReportsPage.tsx` - Página principal com layout responsivo
- `src/pages/reports/ReportConfigCard.tsx` - Componente completo de configuração com:
  - Seleção de cliente (dropdown com clientes ativos)
  - Campos de período (datas inicial e final com validação)
  - Lógica de geração usando `template - Copia.docx`
  - Tratamento de erros robusto
  - Feedback visual durante processamento

**Arquivos Modificados:**
- `src/App.tsx` - Adicionado roteamento para `/reports` (restrito a admin/manager)

**Funcionalidades Implementadas:**
- ✅ Interface responsiva e intuitiva
- ✅ Carregamento dinâmico de clientes ativos
- ✅ Validação de período (data inicial ≤ data final)
- ✅ Filtragem de atividades por cliente e período
- ✅ Processamento do template `template - Copia.docx`
- ✅ Geração de arquivo DOCX com nome personalizado
- ✅ Tratamento de casos sem atividades
- ✅ Sistema de toast para feedback ao usuário
- ✅ Estados de loading durante geração
- ✅ Tratamento robusto de erros

**Características Técnicas:**
- Usa IA (Gemini) para melhorar as descrições das atividades
- Arquivo template carregado dinamicamente
- Placeholders utilizados: `{entidade_cliente}`, `{data_inicial}`, `{data_final}`, `{lista_servicos}`, `{data_extenso_emissao}`
- Formatação das datas: `dd/MM/yyyy` (ex: "01/01/2025")
- Nome do arquivo: `Relatorio_Atividades_{cliente}_{data-inicial}_{data-final}.docx`
- Fallback para texto original se IA falhar
