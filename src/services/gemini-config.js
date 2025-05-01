/**
 * gemini-config.js - Configurações para a integração com a API Gemini
 */

// Configuração da API Gemini
const GEMINI_CONFIG = {
    // Sua chave API do Gemini - https://aistudio.google.com/app/apikey
    apiKey: "AIzaSyAzDTgBTQ1xNstzuKVzaNwow7OcKvZY8Wk",

    // Endpoint para o modelo Gemini Pro
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent",

    // Configurações padrão
    maxTokens: 8192,           // Tamanho máximo da resposta
    temperature: 0.3,          // Criatividade da resposta (0.0 a 1.0)

    // Configurações de segurança
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
    ],

    // Configurações da UI
    assistant: {
        initiallyOpen: false,      // Assistente aberto ao carregar a página
        autoInitialize: true,      // Inicializar automaticamente
        initialDelay: 1500,        // Atraso para inicialização (ms)
        mobileMinimized: true      // Minimizado em dispositivos móveis
    },

    // Configurações de insights
    insights: {
        autoRefresh: true,         // Atualizar insights automaticamente
        refreshInterval: 900000,   // Intervalo de atualização (15 min em ms)
        maxInsights: 4             // Número máximo de insights exibidos
    }
};

// Exportar a configuração
export default GEMINI_CONFIG;

// Para uso com scripts regulares
window.GEMINI_CONFIG = GEMINI_CONFIG;