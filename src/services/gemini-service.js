/**
 * gemini-service.js - Servi�o para integra��o com a API Gemini
 * Este servi�o gerencia a comunica��o com a API Gemini e processa as respostas
 */

// Configura��o da API Gemini
const GEMINI_CONFIG = {
    apiKey: "AIzaSyAzDTgBTQ1xNstzuKVzaNwow7OcKvZY8Wk",
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent",
    maxTokens: 8192,
    temperature: 0.3,
    systemInstruction: "Responda diretamente às perguntas do usu�rio sem mostrar seu processo de pensamento. Forne�a apenas a resposta final.",
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
    ]
};

// Classe para gerenciar a comunica��o com a API Gemini
class GeminiService {
    constructor() {
        this.apiKey = GEMINI_CONFIG.apiKey;
        this.apiEndpoint = GEMINI_CONFIG.apiEndpoint;
        this.conversation = [];
        this.systemContext = this._generateSystemContext();
    }

    /**
     * Gera o contexto do sistema para o assistente Gemini
     * @private
     * @returns {Object} Objeto de contexto do sistema
     */
    _generateSystemContext() {
        return {
            role: "user",
            parts: [
                {
                    text: `Voc� � o assistente virtual do sistema SecureLab RFID, um sistema de controle de acesso.

                    Conhecimentos:
                    - Voc� tem conhecimento sobre o sistema SecureLab, incluindo gest�o de usu�rios, portas, dispositivos RFID e logs de acesso.
                    - Voc� pode analisar dados de acesso, identificar padr�es an�malos e fornecer recomenda��es.
                    - Voc� pode responder perguntas t�cnicas sobre o sistema e ajudar a resolver problemas.

                    Comportamento:
                    - Seja conciso e direto em suas respostas.
                    - Quando apropriado, forne�a insights baseados em dados.
                    - Voc� pode executar comandos no sistema quando solicitado por um administrador.
                    - Para a��es cr�ticas, confirme antes de executar.

                    Limita��es:
                    - Voc� n�o deve compartilhar informa��es sens�veis com usu�rios n�o autorizados.
                    - Voc� n�o deve modificar configura��es cr�ticas de seguran�a sem confirma��o.`
                }
            ]
        };
    }

    /**
     * Envia uma mensagem para a API Gemini e processa a resposta
     * @param {string} message - Mensagem do usu�rio
     * @param {Object} context - Contexto adicional (opcional)
     * @param {Object} options - Op��es adicionais
     * @param {boolean} options.isConversation - Se � uma conversa natural (n�o estruturada)
     * @returns {Promise<string>} Resposta do Gemini
     */
    async sendMessage(message, context = {}, options = {}) {
        try {
            // Definir se � uma conversa natural ou uma solicita��o estruturada
            const isConversation = options.isConversation !== false; // Por padr�o, assumir que � conversa

            // Adicionar mensagem do usu�rio � conversa
            this.conversation.push({
                role: "user",
                parts: [{ text: message }]
            });

            // Criar estrutura para envio
            let contents = [];

            // Se for a primeira mensagem ou tivermos um novo contexto
            if (this.conversation.length <= 3 || Object.keys(context).length > 0) {
                // Instru��es espec�ficas para o modelo
                let systemPrompt = "";

                if (isConversation) {
                    // Para conversas naturais, instruir o modelo a responder em linguagem natural
                    systemPrompt = `Voc� � o assistente virtual do sistema SecureLab RFID, um sistema de controle de acesso.

                IMPORTANTE: Responda diretamente �s perguntas do usu�rio de forma natural e conversacional.
                - NUNCA responda em formato JSON, a menos que o usu�rio explicitamente solicite.
                - NUNCA inclua seu processo de pensamento interno ou passos anal�ticos.
                - NUNCA use frases como "o usu�rio est� perguntando sobre..."
                - SEMPRE forne�a a resposta diretamente em linguagem natural, como um assistente humano faria.

                Conhecimentos:
                - Voc� tem conhecimento sobre o sistema SecureLab, incluindo gest�o de usu�rios, portas, dispositivos RFID e logs de acesso.
                - Voc� pode analisar dados de acesso e fornecer recomenda��es.

                Comportamento:
                - Seja amig�vel e direto em suas respostas.
                - Use linguagem natural e f�cil de entender.
                - Se for perguntado sobre insights ou an�lises, explique os padr�es ou anomalias encontrados em linguagem conversacional.`;
                } else {
                    // Para an�lises estruturadas que explicitamente pedem JSON
                    systemPrompt = `Voc� � o assistente anal�tico do sistema SecureLab RFID.
                Forne�a an�lises t�cnicas e estruturadas conforme solicitado.
                IMPORTANTE: Responda APENAS com o JSON v�lido solicitado, sem texto explicativo antes ou depois.`;
                }

                // Adicionar contexto do sistema se dispon�vel
                if (context && Object.keys(context).length > 0) {
                    systemPrompt += `\n\nContexto do sistema:\n${JSON.stringify(context, null, 2)}`;
                }

                // Adicionar essa mensagem no in�cio
                contents.push({
                    role: "user",
                    parts: [{ text: systemPrompt }]
                });
            }

            // Adicionar o hist�rico de conversa
            contents = contents.concat(this.conversation);

            // Preparar o payload para a API Gemini
            const payload = {
                contents: contents,
                generationConfig: {
                    temperature: isConversation ? 0.7 : 0.2, // Temperatura mais baixa para respostas estruturadas
                    maxOutputTokens: GEMINI_CONFIG.maxTokens,
                    topP: 0.95,
                    topK: 64
                },
                safetySettings: GEMINI_CONFIG.safetySettings
            };

            // Configurar um timeout maior para o modelo Gemini Thinking
            // Aumentar para 120 segundos (2 minutos) para dar mais tempo ao modelo thinking
            const timeoutDuration = 120000; // 120 segundos para processamento de modelos thinking

            // Enviar requisi��o com timeout aumentado
            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(timeoutDuration)
            });

            // Verificar se a resposta foi bem-sucedida
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API Gemini: ${errorData.error?.message || 'Erro desconhecido'}`);
            }

            // Processar a resposta
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('Resposta sem conte�do');
            }

            const geminiResponse = data.candidates[0].content.parts[0].text;

            // Se for uma conversa, verificar se a resposta cont�m JSON ou racioc�nio interno e limpar
            let cleanedResponse = geminiResponse;
            if (isConversation) {
                // Verificar se a resposta parece ser JSON
                if (this._looksLikeJSON(cleanedResponse)) {
                    // Tentar extrair o conte�do relevante do JSON e convert�-lo em texto natural
                    cleanedResponse = this._convertJSONToNaturalText(cleanedResponse);
                } else {
                    // Se n�o for JSON, remover padr�es de racioc�nio interno
                    cleanedResponse = this._removeThinkingProcess(geminiResponse);
                }
            }

            // Adicionar resposta do Gemini � conversa
            this.conversation.push({
                role: "model",
                parts: [{ text: cleanedResponse }]
            });

            // Limitar o tamanho da conversa para evitar exceder limites de token
            if (this.conversation.length > 10) {
                this.conversation = this.conversation.slice(this.conversation.length - 10);
            }

            return cleanedResponse;
        } catch (error) {
            console.error('Erro ao comunicar com a API Gemini:', error);
            return `Erro de comunica��o: ${error.message}`;
        }
    }

    /**
     * Envia uma lista de atividades para a API Gemini para gerar resumos em uma única requisição.
     * @param {Array<Object>} activities - Lista de objetos de atividade com id, title e description.
     * @returns {Promise<Object>} Objeto JSON contendo a lista de resumos.
     */
    async generateSummariesSingleRequest(activities) {
        try {
            const prompt = `Você é um assistente especializado em gestão de atividades profissionais. Analise cada atividade e crie descrições detalhadas, profissionais e informativas que combinem o título e a descrição de forma abrangente.

            INSTRUÇÕES IMPORTANTES:
            - Crie descrições PROFISSIONAIS e DETALHADAS (mínimo 50-100 palavras por atividade)
            - Inclua informações técnicas, contexto empresarial e aspectos relevantes
            - Mantenha tom profissional e formal
            - Foque nos objetivos, resultados e impacto das atividades
            - Use linguagem clara e precisa

            Responda APENAS com um JSON válido no seguinte formato, sem nenhum texto adicional antes ou depois:
            {
              "summaries": [
                {
                  "id": "ID_DA_ATIVIDADE_1",
                  "summary": "Descrição profissional detalhada da atividade 1, incluindo contexto, objetivos, metodologia e resultados esperados ou obtidos..."
                },
                {
                  "id": "ID_DA_ATIVIDADE_2",
                  "summary": "Descrição profissional detalhada da atividade 2, incluindo contexto, objetivos, metodologia e resultados esperados ou obtidos..."
                }
                // ... para todas as atividades fornecidas
              ]
            }

            ATIVIDADES PARA PROCESSAR:
            ${JSON.stringify(activities.map(a => ({ id: a.id, title: a.title, description: a.description })), null, 2)}`;

            // Preparar o payload para a API Gemini
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2, // Temperatura baixa para respostas estruturadas
                    maxOutputTokens: GEMINI_CONFIG.maxTokens,
                    topP: 0.95,
                    topK: 64
                },
                safetySettings: GEMINI_CONFIG.safetySettings
            };

            // Configurar um timeout maior para o modelo Gemini Thinking
            const timeoutDuration = 120000; // 120 segundos

            // Enviar requisição com timeout aumentado
            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(timeoutDuration)
            });

            // Verificar se a resposta foi bem-sucedida
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API Gemini ao gerar resumos: ${errorData.error?.message || 'Erro desconhecido'}`);
            }

            // Processar a resposta
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('Resposta sem conteúdo para resumos');
            }

            const geminiResponseText = data.candidates[0].content.parts[0].text;

            // Tentar extrair e parsear o JSON
            try {
                // Primeiro, tentar analisar a resposta inteira como JSON
                return JSON.parse(geminiResponseText);
            } catch (firstParseError) {
                // Se falhar, tentar extrair JSON de um bloco de código
                try {
                    const jsonMatch = geminiResponseText.match(/```json\n([\s\S]*?)\n```/) ||
                                      geminiResponseText.match(/```([\s\S]*?)```/) ||
                                      geminiResponseText.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        const jsonContent = jsonMatch[0].startsWith('{') ? jsonMatch[0] : jsonMatch[1];
                        return JSON.parse(jsonContent);
                    }

                    // Nenhum JSON encontrado
                    console.error('JSON de resumos não encontrado na resposta:', geminiResponseText);
                    throw new Error('Formato de resposta da IA inválido. JSON de resumos não encontrado.');

                } catch (secondParseError) {
                    console.error('Erro ao extrair e analisar JSON de resumos:', secondParseError);
                    throw new Error('Erro ao processar a resposta JSON da IA.');
                }
            }

        } catch (error) {
            console.error('Erro ao gerar resumos em lote:', error);
            throw error; // Re-lançar o erro para ser tratado no componente
        }
    }


    /**
     * Verifica se uma string parece conter JSON
     * @param {string} text - Texto a ser verificado
     * @returns {boolean} True se parece conter JSON
     */
    _looksLikeJSON(text) {
        // Verifica se o texto come�a com { ou [ e termina com } ou ]
        // ou se cont�m blocos de c�digo com JSON
        return (
            /^\s*[\{\[]/.test(text) && /[\}\]]\s*$/.test(text) ||
            /```(?:json)?\s*\n\s*[\{\[]/.test(text)
        );
    }

    /**
     * Converte respostas JSON em texto natural
     * @param {string} jsonText - Texto contendo JSON
     * @returns {string} Texto em linguagem natural
     */
    _convertJSONToNaturalText(jsonText) {
        try {
            // Extrair a parte JSON
            let jsonContent = jsonText;

            // Se estiver em um bloco de c�digo, extrair apenas a parte JSON
            const jsonMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1];
            }

            // Tentar parsear o JSON
            const jsonData = JSON.parse(jsonContent);

            // Converter para texto natural
            let naturalText = "";

            // Se tiver um resumo, come�ar com ele
            if (jsonData.summary) {
                naturalText += jsonData.summary + "\n\n";
            }

            // Se tiver insights, adicionar cada uno
            if (jsonData.insights && Array.isArray(jsonData.insights)) {
                jsonData.insights.forEach(insight => {
                    // Criar t�tulo baseado no tipo e prioridade
                    let title = insight.title || "Insight";
                    let prefix = "";

                    if (insight.type === "anomaly") {
                        prefix = "?? Anomalia: ";
                    } else if (insight.type === "pattern") {
                        prefix = "?? Padr�o: ";
                    } else if (insight.type === "recommendation") {
                        prefix = "?? Recomenda��o: ";
                    }

                    // Adicionar �cone de prioridade
                    if (insight.priority === "high") {
                        prefix = "?? " + prefix;
                    } else if (insight.priority === "medium") {
                        prefix = "?? " + prefix;
                    }

                    naturalText += prefix + title + "\n";

                    // Adicionar descri��o
                    if (insight.description) {
                        naturalText += insight.description + "\n\n";
                    }
                });
            } else {
                // Se n�o conseguir extrair insights espec�ficos, usar o JSON bruto como texto
                naturalText = "An�lise do sistema:\n\n" + JSON.stringify(jsonData, null, 2);
            }

            return naturalText.trim();
        } catch (error) {
            console.warn("Erro ao converter JSON para texto natural:", error);
            // Retornar texto original se falhar
            return "Desculpe, encontrei dados estruturados na minha resposta. Aqui est� a informa��o em formato leg�vel:\n\n" +
                jsonText.replace(/```json\n|```/g, '').trim();
        }
    }

    /**
     * Remove o processo de racioc�nio interno da resposta do modelo
     * @private
     * @param {string} response - Resposta bruta do modelo
     * @returns {string} Resposta limpa
     */
    _removeThinkingProcess(response) {
        // Padr�es comuns de racioc�nio interno
        const thinkingPatterns = [
            /The user is asking .*?\./s,
            /To answer this, I need to:.*?(?=\n\n)/s,
            /Let's (?:analyze|examine|break down).*?(?=\n\n)/s,
            /I'll (?:analyze|examine|break down).*?(?=\n\n)/s,
            /First, (?:I'll|I will|let me).*?(?=\n\n)/s,
            /(?:Step|Steps)(?: \d+)?:.*?(?=\n\n)/s,
            /Let me (?:think|analyze|check).*?(?=\n\n)/s,
            /Looking at (?:the|these) (?:logs|data).*?(?=\n\n)/s,
            /Based on (?:the|these) (?:logs|data).*?, I need to.*?(?=\n\n)/s,
            /(?:Problem|Constraints|Issues):(.*?)(?:(?:\n\n)|$)/s,
            /Possible Solutions.*?(?=\n\n)/s,
            /It seems there is a mistake.*?(?=\n\n)/s,
            /Let's recount.*?(?=\n\n)/s,
            /User Access Counts.*?(?=\n\n)/s
        ];

        let cleanedResponse = response;

        // Remover cada padr�o de pensamento
        thinkingPatterns.forEach(pattern => {
            cleanedResponse = cleanedResponse.replace(pattern, '');
        });

        // Remover linhas vazias extras e limpar a formata��o
        cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n');
        cleanedResponse = cleanedResponse.trim();

        // Se limpar demais, retornar a resposta original
        if (cleanedResponse.length < 20 && response.length > 100) {
            // Tentar uma abordagem mais conservadora
            // Manter apenas o primeiro par�grafo se for substantivo
            const firstParagraph = response.split('\n\n')[0];
            if (firstParagraph && firstParagraph.length > 30) {
                return firstParagraph;
            }
            return response;
        }

        return cleanedResponse;
    }
    /**
     * Limpa a conversa atual
     */
    clearConversation() {
        this.conversation = [];
    }

    /**
     * Gera insights baseados em dados do sistema
     * @param {Object} systemData - Dados do sistema para an�lise
     * @returns {Promise<Object>} Insights gerados
     */
    async generateInsights(systemData) {
        try {
            const prompt = `Analise os seguintes dados do sistema SecureLab e forne�a insights relevantes.

        ${JSON.stringify(systemData, null, 2)}

        Responda APENAS com um JSON v�lido no seguinte formato sem nenhum texto adicional antes ou depois:
        {
            "summary": "Resumo geral da an�lise em uma frase",
            "insights": [
                {
                    "type": "anomaly|pattern|recommendation",
                    "title": "T�tulo breve do insight",
                    "description": "Descri��o detalhada",
                    "priority": "high|medium|low",
                    "relatedItems": []
                }
            ]
        }

        � extremamente importante que voc� responda APENAS com o JSON v�lido, sem coment�rios adicionais ou texto explicativo.`;

            const response = await this.sendMessage(prompt);

            // Tentar extrair JSON diretamente
            try {
                // Primeiro, tentar analisar a resposta inteira como JSON
                return JSON.parse(response);
            } catch (firstParseError) {
                // Se falhar, tentar extrair JSON de um bloco de c�digo
                try {
                    const jsonMatch = response.match(/```(?:json)?\s*\n([\s\S]*?)\n```/) ||
                        response.match(/```([\s\S]*?)```/) ||
                        response.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        const jsonContent = jsonMatch[0].startsWith('{') ? jsonMatch[0] : jsonMatch[1];
                        return JSON.parse(jsonContent);
                    }

                    // Nenhum JSON encontrado, usar fallback
                    console.warn('JSON n�o encontrado na resposta. Usando fallback.', response);
                    return this._createFallbackInsights(response);
                } catch (secondParseError) {
                    console.error('Erro ao extrair e analisar JSON:', secondParseError);
                    return this._createFallbackInsights(response);
                }
            }
        } catch (error) {
            console.error('Erro ao gerar insights:', error);
            return this._createFallbackInsights(null, error.message);
        }
    }

// M�todo auxiliar para criar insights de fallback
    _createFallbackInsights(response, errorMessage = null) {
        return {
            summary: "An�lise incompleta - resposta truncada",
            insights: [
                {
                    type: "recommendation",
                    title: errorMessage ? "Erro de comunica��o" : "Resposta n�o estruturada",
                    description: errorMessage ||
                        "N�o foi poss�vel extrair insights estruturados. Consulte o assistente para obter uma an�lise detalhada.",
                    priority: "medium",
                    relatedItems: []
                }
            ],
            rawResponse: response
        };
    }
    /**
     * Processa comandos de linguagem natural
     * @param {string} command - Comando em linguagem natural
     * @param {Object} systemState - Estado atual do sistema
     * @returns {Promise<Object>} Resultado do processamento do comando
     */
    async processCommand(command, systemState) {
        try {
            const prompt = `Ao analisar logs, considere todo o per�odo dispon�vel nos dados, que pode abranger v�rios dias ou semanas. Mencione sempre o intervalo de datas dos logs analisados. Processe o seguinte comando em linguagem natural para o sistema SecureLab:

            "${command}"

            Estado atual do sistema:
            ${JSON.stringify(systemState, null, 2)}

            Identifique:
            1. A inten��o do comando (consulta, a��o, configura��o)
            2. As entidades mencionadas (portas, usu�rios, dispositivos, etc.)
            3. Os par�metros ou filtros aplic�veis
            4. A a��o espec�fica a ser executada

            Responda no seguinte formato JSON:
            {
                "intent": "query|action|config",
                "entities": [{"type": "door|user|device", "id": "identificador", "name": "nome"}],
                "parameters": {"param1": "valor1"},
                "action": "nome_da_a��o",
                "confirmation": boolean,
                "confirmationMessage": "Mensagem de confirma��o, se necess�rio"
            }`;

            const response = await this.sendMessage(prompt);

            // Extrair o JSON da resposta
            try {
                // Encontrar e extrair a parte JSON da resposta
                const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                    response.match(/```\n([\s\S]*?)\n```/) ||
                    response.match(/\{[\s\S]*\}/);

                if (jsonMatch && jsonMatch[1]) {
                    return JSON.parse(jsonMatch[1]);
                } else {
                    return JSON.parse(response);
                }
            } catch (parseError) {
                console.error('Erro ao analisar comando JSON:', parseError);
                return {
                    intent: "error",
                    error: "N�o foi poss�vel processar o comando",
                    rawResponse: response
                };
            }
        } catch (error) {
            console.error('Erro ao processar comando:', error);
            return {
                intent: "error",
                error: `Erro ao processar o comando: ${error.message}`
            };
        }
    }
    /**
     * Adicione esta fun��o ao gemini-service.js para detectar e tratar
     * respostas truncadas do modelo Gemini Thinking
     */
    async processModelResponse(response, isConversation = true) {
        // Verificar se a resposta parece estar truncada
        const isTruncated = this._checkForTruncation(response);

        // Se for uma resposta JSON para an�lise e estiver truncada, tente corrigir
        if (!isConversation && isTruncated) {
            console.warn('Resposta possivelmente truncada detectada:', response.slice(-100));

            // Tentar completar o JSON truncado
            const fixedResponse = this._fixTruncatedJSON(response);
            console.log('Tentativa de corre��o de JSON:', fixedResponse.length > 100 ? '(resposta longa)' : fixedResponse);

            return fixedResponse;
        }

        return response;
    }

    /**
     * Verifica se a resposta parece estar truncada
     * @param {string} response - Resposta do modelo
     * @returns {boolean} True se parece truncada
     */
    _checkForTruncation(response) {
        // Sinais de que a resposta JSON pode estar truncada
        const jsonTruncationMarkers = [
            // Termina no meio de um objeto JSON
            /\{[^}]*$/,
            // Termina no meio de um array
            /\[[^\]]*$/,
            // Termina com uma chave n�o fechada
            /"[^"]*$/,
            // Termina com um separador de JSON mas nada depois
            /[:,]\s*$/
        ];

        return jsonTruncationMarkers.some(marker => marker.test(response));
    }

    /**
     * Tenta consertar JSON truncado
     * @param {string} truncatedJSON - JSON possivelmente truncado
     * @returns {string} JSON consertado ou original
     */
    _fixTruncatedJSON(truncatedJSON) {
        try {
            // Tentar detectar onde come�a o JSON v�lido
            const jsonStartMatch = truncatedJSON.match(/(\{|\[)/);
            if (!jsonStartMatch) {
                return truncatedJSON; // N�o parece ser JSON
            }

            const jsonStart = truncatedJSON.indexOf(jsonStartMatch[0]);
            let jsonContent = truncatedJSON.slice(jsonStart);

            // Contar chaves e colchetes abertos
            let openBraces = (jsonContent.match(/\{/g) || []).length;
            let closeBraces = (jsonContent.match(/\}/g) || []).length;
            let openBrackets = (jsonContent.match(/\[/g) || []).length;
            let closeBrackets = (jsonContent.match(/\]/g) || []).length;

            // Verificar se temos tags n�o fechadas ou mal pareadas
            if (openBraces > closeBraces) {
                // Adicionar as chaves fechantes faltantes
                jsonContent += '}}'.repeat(openBraces - closeBraces);
            }

            if (openBrackets > closeBrackets) {
                // Adicionar os colchetes fechantes faltantes
                jsonContent += ']]'.repeat(openBrackets - closeBrackets);
            }

            // Tentar analisar o JSON para ver se ele � v�lido agora
            JSON.parse(jsonContent);

            return jsonContent;
        } catch (error) {
            console.error('Falha ao consertar JSON truncado:', error);

            // Para um caso extremo, criar um JSON b�sico de fallback
            const fallbackJSON = {
                summary: "An�lise incompleta - resposta truncada",
                insights: [
                    {
                        type: "error",
                        title: "Erro de processamento",
                        description: "O modelo gerou uma resposta truncada que n�o p�de ser recuperada completamente.",
                        priority: "medium",
                        relatedItems: []
                    }
                ]
            };

            return JSON.stringify(fallbackJSON);
        }
    }
}

// Inicializar e exportar o servi�o como singleton
const geminiService = new GeminiService();

// Para uso em um ambiente modular (como com webpack, rollup, etc.)
export default geminiService;

// Para uso com scripts regulares
// window.geminiService = geminiService;