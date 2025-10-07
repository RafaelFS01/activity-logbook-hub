# Planejamento Estratégico - Correção do Gráfico de Dashboard "Atividades ao Longo do Tempo"

## Objetivos
Corrigir o gráfico da dashboard que exibe atividades ao longo do tempo para mostrar as atividades corretas de acordo com os horários adequados, considerando que algumas atividades podem não ter horário específico definido.

## Análise do Problema
Baseado no arquivo `database-example.txt`, identificamos que:
- Algumas atividades têm `startDate` com horário completo (ex: "2025-04-02T15:00:00.000Z")
- Outras atividades têm apenas a data sem horário (ex: "2025-04-03")
- O gráfico atual pode não estar tratando corretamente atividades sem horário definido

## Estrutura de Diretórios
```
docs/dashboard/
└── grafico-atividades-tempo.md
```

## Tarefas Definidas

- [x] Analisar dados do database-example.txt para identificar problemas com horários das atividades
- [x] Criar arquivo de planejamento estratégico em formato Markdown para a correção
- [x] Corrigir a função getBarChartData() para lidar com atividades sem horário definido
- [x] Implementar lógica para agrupar atividades sem horário em categoria específica
- [x] Testar o gráfico com diferentes períodos (hoje, semana, mês) para verificar correção

## Arquivos Impactados
- `src/pages/Index.tsx` - Arquivo principal do dashboard com o gráfico
- `src/services/firebase/activities.ts` - Serviço de atividades (se necessário)

## Implementação Realizada

### Correções Implementadas:
1. **Filtro de role consistente**: Aplicado mesmo filtro de role (admin/manager/collaborator) usado na página Home
2. **Lógica de distribuição unificada**: Usa mesma função `isActivityActiveOnDate` da página Home
3. **Horários específicos para Hoje**: Implementados slots de horário de 8h às 18h para o período "Hoje"
4. **Dias completos da semana**: Para "Esta Semana", todos os dias (segunda a domingo) são exibidos mesmo sem atividades
5. **Dias completos do mês**: Para "Este Mês", todos os dias do mês são exibidos
6. **Tratamento de períodos de atividades**: Se uma atividade vai do dia 1 ao dia 10, ela aparece em todos esses dias

### Melhorias Técnicas:
- Integração com contexto de autenticação para obter dados do usuário atual
- Aplicação consistente de filtro de role baseado no papel do usuário
- Lógica de distribuição que verifica cada dia individualmente dentro do período
- Inicialização prévia de todas as estruturas de dados (horários/dias) para garantir exibição completa
- Tratamento robusto de datas usando `isNaN()` e try-catch
- Conversão adequada de domingo (0) para 7 no sistema de dias da semana
- Filtragem de horários fora do range (8h-18h) para categoria "sem horário"

## Critérios de Sucesso
- [x] Gráfico exibe corretamente atividades com horário definido
- [x] Gráfico agrupa adequadamente atividades sem horário em categoria específica
- [x] Gráfico funciona corretamente para todos os períodos (hoje, semana, mês)
- [x] Atividades aparecem em todos os dias que cobrem dentro do período selecionado
- [x] Período "Hoje" mostra horários específicos de 8h às 18h
- [x] Período "Esta Semana" mostra todos os dias (segunda a domingo)
- [x] Período "Este Mês" mostra todos os dias do mês
- [x] Filtro de role consistente com a página Home (admin/manager/collaborator)
- [x] Não há erros de JavaScript relacionados ao processamento de datas

## Status Final
✅ **Correção completa implementada**. O gráfico agora está totalmente consistente com a página Home, aplicando o mesmo filtro de role do usuário atual e usando a mesma lógica de distribuição de atividades. Todas as funcionalidades solicitadas foram implementadas com sucesso.
