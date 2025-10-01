# Uso dos Arquivos de Template

## Visão Geral
Os arquivos de template localizados na pasta `public/templates/` são utilizados para gerar relatórios personalizados no sistema de controle de atividades.

## Arquivos Disponíveis

### 1. `template.docx` (Arquivo Principal)
- **Localização**: `public/templates/template.docx`
- **Status**: Arquivo ativo utilizado para geração de relatórios
- **Tamanho**: Aproximadamente 184KB

### 2. `template - Copia.docx` (Arquivo de Backup)
- **Localização**: `public/templates/template - Copia.docx`
- **Status**: Cópia de segurança do template principal
- **Tamanho**: Aproximadamente 184KB

## Procedimento de Utilização

### Arquivo Utilizado
- **Arquivo**: `src/pages/clients/ClientDetailsPage.tsx`
- **Função**: `handleGenerateDocx` (linha 142)

### Processo de Geração de Relatórios DOCX

1. **Carregamento do Template** (linha 156-163)
   ```typescript
   const templatePath = '/templates/template.docx';
   const response = await fetch(templatePath);
   const templateBlob = await response.arrayBuffer();
   ```

2. **Geração de Resumos com IA** (linha 165-172)
   - Utiliza o serviço Gemini para gerar descrições resumidas das atividades
   - Processa todas as atividades filtradas em uma única requisição
   - Adiciona campo `summaryDescription` às atividades

3. **Preparação dos Dados** (linha 175-193)
   ```typescript
      const dataForTemplate = {
            entidade_cliente: clientName,
            data_inicial: dataInicial,
            data_final: dataFinal,
            lista_servicos: filteredActivities.map(activity => ({
                descricao_servico: activity.title + (activity.description ? ` - ${activity.description}` : '')
            })),
            data_extenso_emissao: dataExtensoEmissao
        };
   ```

4. **Processamento do Template** (linha 195-212)
   - Utiliza biblioteca `PizZip` para ler o arquivo DOCX
   - Utiliza biblioteca `Docxtemplater` para processar os placeholders
   - Renderiza os dados no template

5. **Geração e Download** (linha 207-224)
   - Gera blob final do documento
   - Inicia download automático com nome personalizado

## Placeholders Disponíveis no Template

Baseado no código de preparação de dados, o template deve conter os seguintes placeholders:

- `{entidade_cliente}` - Nome do cliente
- `{data_inicial}` - Data inicial do período (formato dd/MM/yyyy)
- `{data_final}` - Data final do período (formato dd/MM/yyyy)
- `{lista_servicos}` - Lista de serviços/atividades (loop)
  - `{descricao_servico}` - Texto completo da atividade
- `{data_extenso_emissao}` - Data de emissão por extenso

## Dependências Técnicas

- **PizZip**: Para manipulação de arquivos ZIP (DOCX é baseado em ZIP)
- **Docxtemplater**: Para processamento de templates Word
- **file-saver**: Para download automático do arquivo gerado
- **Serviço Gemini**: Para geração de resumos das atividades

## Tratamento de Erros

O sistema inclui tratamento robusto de erros:

1. **Erro de carregamento do template**
2. **Erro na geração de resumos com IA**
3. **Erro no processamento do template**
4. **Erro na geração do blob final**

Todos os erros são exibidos ao usuário através do sistema de toast com mensagens específicas e detalhadas.

## Manutenção e Atualização

Para modificar o template:

1. Editar o arquivo `template - Copia.docx` com o Microsoft Word ou similar
2. Manter os placeholders conforme especificado acima:
   - `{entidade_cliente}`, `{data_inicial}`, `{data_final}`, `{lista_servicos}`, `{data_extenso_emissao}`
3. Testar a geração de relatórios após alterações
4. Manter a cópia de segurança atualizada se necessário

## Considerações de Segurança

- O arquivo template é carregado diretamente do servidor público
- Não há processamento de conteúdo potencialmente malicioso
- Os dados inseridos são sanitizados antes do processamento

