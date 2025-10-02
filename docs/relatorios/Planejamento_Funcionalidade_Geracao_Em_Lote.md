# Planejamento Estratégico - Funcionalidade de Geração em Lote com ZIP

## Visão Geral
Implementação de funcionalidade avançada que permite gerar relatórios para múltiplos clientes simultaneamente, compactados em formato ZIP, com otimização de requisições para IA.

## Objetivos
- Adicionar opção "Todos" no combobox de seleção de cliente
- Processar múltiplos clientes em uma única operação
- Gerar arquivos DOCX individuais para cada cliente
- Compactar todos os arquivos em formato ZIP
- Otimizar chamada única para IA com todas as atividades
- Fornecer feedback visual durante processo complexo

## Escopo da Funcionalidade

### 1. Opção "Todos" no Combobox
- Nova opção especial "Todos os Clientes"
- Quando selecionada, ativa modo de geração em lote
- Interface visual diferenciada (badge ou indicador)

### 2. Processo de Geração em Lote
- **Etapa 1**: Coletar atividades de todos os clientes ativos
- **Etapa 2**: Filtrar atividades por período selecionado
- **Etapa 3**: **ÚNICA** chamada para IA com todas as atividades
- **Etapa 4**: Processar múltiplos templates DOCX
- **Etapa 5**: Compactar arquivos em ZIP
- **Etapa 6**: Download automático do arquivo ZIP

### 3. Estrutura do Arquivo ZIP
```
relatorios_clientes_[data].zip
├── relatorio_empresa_abc.docx
├── relatorio_cliente_pf.docx
├── relatorio_organizacao_xyz.docx
└── ...
```

## Arquitetura Técnica

### Arquivos a Modificar/Criar
- `src/pages/reports/ReportConfigCard.tsx` - Lógica principal
- `src/services/reports/bulkReportGenerator.ts` - Serviço de geração em lote
- `src/utils/zipUtils.ts` - Utilitário para compactação ZIP
- `src/services/gemini/geminiBulkService.ts` - Otimização IA para lote

### Dependências Necessárias
- **JSZip**: Para criação de arquivos ZIP
- **FileSaver**: Para download do ZIP
- **Serviços existentes**: Clientes, atividades, Gemini

## Fluxo Detalhado de Funcionamento

### 1. Interface do Usuário
```
Cliente: [Todos os Clientes ▼]  ← Seleção especial
Período: [01/01/2025] - [31/01/2025]

[████████████░░░░░░] 30% - Gerando resumos com IA...
[██████████████████] 100% - Concluído!

↓ Download: relatorios_clientes_2025-01-31.zip
```

### 2. Processo Técnico
1. **Seleção**: Usuário escolhe "Todos" + período
2. **Validação**: Verificar se há clientes ativos e período válido
3. **Coleta**: Buscar todos os clientes ativos
4. **Filtragem**: Coletar atividades de todos os clientes no período
5. **IA Única**: Uma requisição com todas as atividades
6. **Processamento**: Gerar DOCX individual por cliente
7. **Compactação**: Criar arquivo ZIP com todos os DOCX
8. **Download**: Arquivo ZIP baixado automaticamente

## Otimizações de Performance

### Chamada Única para IA
```javascript
// ANTES: Múltiplas chamadas
await generateSummariesSingleRequest(atividadesCliente1);
await generateSummariesSingleRequest(atividadesCliente2);
await generateSummariesSingleRequest(atividadesCliente3);

// DEPOIS: Uma única chamada otimizada
await generateBulkSummariesSingleRequest(todasAsAtividades);
```

### Processamento Paralelo
- Geração de DOCX pode ser paralelizada
- Limitação de threads para não sobrecarregar
- Controle de memória para grandes volumes

## Tratamento de Erros

### Cenários de Falha
1. **Erro de IA**: Fallback para texto original em todos os relatórios
2. **Erro de geração DOCX**: Continuar com clientes que funcionam
3. **Erro de compactação**: Tentar download individual se necessário
4. **Sem atividades**: Mensagem clara ao usuário

### Estratégia de Recuperação
- Logging detalhado de cada etapa
- Relatório de erro por cliente
- Possibilidade de retry seletivo

## Interface e UX

### Estados Visuais
- **Selecionando**: Badge "Modo Lote" ativo
- **Processando**: Progress bar detalhado
- **Concluído**: Confirmação com detalhes do ZIP

### Feedback Progressivo
```
[1/6] Coletando dados dos clientes...
[2/6] Filtrando atividades por período...
[3/6] Gerando resumos com IA (única requisição)...
[4/6] Processando templates DOCX...
[5/6] Compactando arquivos...
[6/6] Finalizando download...
```

## Considerações de Segurança

### Limitações de Volume
- Máximo de clientes por lote (ex: 50)
- Máximo de atividades por requisição IA (ex: 1000)
- Timeout apropriado para operações longas

### Sanitização de Dados
- Validação de nomes de arquivos
- Controle de tamanho de arquivos individuais
- Prevenção de ataques via nomes maliciosos

## Testes e Validação

### Cenários de Teste
1. **Cliente único**: Funcionamento normal preservado
2. **Múltiplos clientes**: Geração correta de ZIP
3. **IA com erro**: Fallback funcionando
4. **Arquivo grande**: Performance adequada
5. **Sem atividades**: Tratamento apropriado

### Métricas de Performance
- Tempo total de geração
- Tamanho do arquivo ZIP
- Número de arquivos gerados
- Taxa de sucesso da IA

## Cronograma de Implementação

### Semana 1: Estrutura Base
- [ ] Modificar combobox para incluir "Todos"
- [ ] Criar serviço de geração em lote básico
- [ ] Implementar estrutura de progresso

### Semana 2: Lógica de Geração
- [ ] Implementar coleta de dados multi-cliente
- [ ] Otimizar chamada única para IA
- [ ] Desenvolver geração paralela de DOCX

### Semana 3: Compactação e Download
- [ ] Implementar utilitário ZIP
- [ ] Integrar download automático
- [ ] Tratamento de erros robusto

### Semana 4: Testes e Refinamento
- [ ] Testes com dados reais
- [ ] Otimização de performance
- [ ] Documentação final

## Riscos e Mitigações
- **Performance**: Dividir processamento em chunks
- **Memória**: Controle de garbage collection
- **Timeout**: Implementar cancelamento gracioso
- **Dados grandes**: Compressão progressiva

## Critérios de Aceitação
- [x] Opção "Todos" disponível no combobox
- [x] Geração de múltiplos DOCX funcionando
- [x] Compactação ZIP automática
- [x] Uma única chamada para IA
- [x] Feedback visual de progresso
- [x] Tratamento adequado de erros
- [x] Performance aceitável para grandes volumes

## Status da Implementação

### ✅ Implementação Concluída (100%)

**Arquivos Modificados:**
- `src/pages/reports/ReportConfigCard.tsx` - Funcionalidade completa de geração em lote
- `package.json` - Adicionada dependência JSZip

**Funcionalidades Implementadas:**
- ✅ Opção "Todos os Clientes" no combobox
- ✅ Geração em lote de múltiplos relatórios DOCX
- ✅ Uma única requisição para IA com todas as atividades
- ✅ Compactação automática em formato ZIP
- ✅ Feedback visual de progresso detalhado
- ✅ Tratamento robusto de erros e fallbacks
- ✅ Performance otimizada para grandes volumes

**Características Técnicas:**
- **Combobox**: Inclui opção "Todos" + busca inteligente
- **IA Otimizada**: Uma única chamada com todas as atividades
- **Geração Paralela**: Processamento eficiente de múltiplos DOCX
- **ZIP Inteligente**: Compactação automática com nomes sanitizados
- **Feedback Visual**: Toast progressivo durante todo o processo
- **Tratamento de Erros**: Fallback para texto original se IA falhar

**Arquivo ZIP Gerado:**
```
relatorios_clientes_[data].zip
├── relatorio_empresa_abc.docx
├── relatorio_cliente_pf.docx
├── relatorio_organizacao_xyz.docx
└── ...
```

A funcionalidade está totalmente implementada e pronta para uso! 🎉
