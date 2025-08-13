# Plano de Ação: Melhoria do Relatório em Excel (Atividades)

## 1) Objetivo
Deixar o relatório Excel de atividades mais bonito e funcional: cabeçalho destacado, listras alternadas (zebra), bordas, larguras de coluna adequadas, datas como tipo Date (não texto), AutoFilter e congelamento das linhas superiores.

## 2) Estado Atual (src/utils/exportUtils.ts)
- `exportActivitiesToExcel` gera planilha a partir de `json_to_sheet`.
- Título é inserido via `addTitleToSheet`, empurrando as células 2 linhas para baixo.
- `applyCellStyles` atual:
  - Larguras fixas (25)
  - Cabeçalho com fundo laranja e definido como linha 0 (inconsistente pois há título acima)
  - Sem zebra, sem bordas, sem filtro, sem congelamento
  - Datas exportadas como texto (via `formatDate`), perdendo recursos nativos do Excel.

## 3) Problemas
- Cabeçalho estilizado na linha errada após inserir o título.
- Visual pouco agradável (fundo laranja, sem zebra/bordas).
- Datas como texto dificultam filtro/ordenar.
- Usabilidade: ausência de AutoFilter e congelamento.

## 4) Proposta Detalhada (Design/Usabilidade)
- Título: "RELATÓRIO DE ATIVIDADES - ACTIVITY HUB" (linha 1), mesclado e centralizado.
- Linha 2: vazia (respiro).
- Cabeçalho (linha 3, índice 2):
  - Negrito, centralizado, fundo azul claro (FFE8EEF7), bordas finas.
- Corpo:
  - Bordas finas em todas as células.
  - Zebra stripes (FFF7F9FC) em linhas alternadas.
  - Quebra de linha automática (wrapText) para textos longos.
- Largura dinâmica de colunas baseada no conteúdo (limites: 12 a 50 caracteres aprox.).
- Datas como Date (não texto) e formatação no Excel:
  - Início/Término: dd/mm/yyyy hh:mm
  - Demais datas: dd/mm/yyyy
- Usabilidade: AutoFilter em toda a grade; Freeze panes (3 linhas: título + espaço + cabeçalho).
- Paleta:
  - Cabeçalho: FFE8EEF7
  - Zebra: FFF7F9FC
  - Bordas: FFDDDDDD

## 5) Escopo da Implementação
- Focar na função `exportActivitiesToExcel`.
- Ampliar `applyCellStyles` para aceitar opções:
  - `headerRowIndex`, `zebra`, `autofilter`, `freezeRows`, `palette`.
- Converter datas para Date antes de gerar a sheet e aplicar formatos de exibição.
- Manter `exportClientsToExcel` e `exportCollaboratorsToExcel` como estão (podem ser atualizadas depois).

## 6) Passos Técnicos
1. Criar helper interno `toExcelDate` para converter string → Date (ou vazio se inválida).
2. Em `dataForSheet`, passar objetos Date nas colunas de data.
3. Após `json_to_sheet` + `addTitleToSheet`:
   - Determinar o índice do cabeçalho (2), mapear nomes de colunas → índice.
   - Percorrer linhas de dados e marcar células de data com `t = 'd'` e `z` apropriado.
4. Substituir/estender `applyCellStyles` para:
   - Calcular largura de colunas pelo maior conteúdo (12–50).
   - Aplicar estilos no cabeçalho (linha 2) e bordas em todas as células.
   - Zebra stripes nas linhas de dados.
   - `!autofilter` no intervalo (cabeçalho → última linha).
   - Congelar 3 linhas (título/espaço/cabeçalho) via metadado suportado pela lib.
5. Salvar workbook normalmente.

## 7) Critérios de Aceite
- Cabeçalho azul claro na linha correta (3ª linha), centralizado e negrito.
- Linhas alternadas com zebra, bordas finas em todas as células.
- Datas como Date, ordenáveis/filtráveis, com formatos exibidos conforme descrito.
- AutoFilter habilitado e congelamento das três primeiras linhas.
- Colunas com larguras condizentes com o conteúdo (sem cortes severos).

## 8) Testes
- Exportar pela página de atividades com conteúdos variados:
  - Descrições longas (ver wrapText).
  - Datas válidas/ausentes.
  - Muitos registros (validar performance de largura dinâmica e autofiltro).
- Abrir em Excel e validar sorteio/filtragem por datas.

## 9) Riscos e Mitigações
- Alguns visualizadores podem ignorar `!freeze` (varia por app). Mitigação: foco no Excel desktop.
- Datas inválidas permanecerem vazias: comportamento esperado e seguro.

## 10) Rollback
- Reverter para `applyCellStyles` antigo e voltar a usar `formatDate` como string nas colunas, se necessário.
