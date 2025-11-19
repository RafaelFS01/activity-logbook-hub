/**
 * gemini-config.js - Configura��es para a integra��o com a API Gemini
 */

// Configura��o da API Gemini
const GEMINI_CONFIG = {
    // Sua chave API do Gemini - https://aistudio.google.com/app/apikey
    apiKey: "AIzaSyAzDTgBTQ1xNstzuKVzaNwow7OcKvZY8Wk",

    // Endpoint para o modelo Gemini Pro
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

    // Configura��es padr�o
    maxTokens: 8192,           // Tamanho m�ximo da resposta
    temperature: 0.3,          // Criatividade da resposta (0.0 a 1.0)

    // Configura��es de seguran�a
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

    // Configura��es da UI
    assistant: {
        initiallyOpen: false,      // Assistente aberto ao carregar a p�gina
        autoInitialize: true,      // Inicializar automaticamente
        initialDelay: 1500,        // Atraso para inicializa��o (ms)
        mobileMinimized: true      // Minimizado em dispositivos m�veis
    },

    // Configura��es de insights
    insights: {
        autoRefresh: true,         // Atualizar insights automaticamente
        refreshInterval: 900000,   // Intervalo de atualiza��o (15 min em ms)
        maxInsights: 4             // N�mero m�ximo de insights exibidos
    }
};

// Exportar a configura��o
export default GEMINI_CONFIG;

// Para uso com scripts regulares
window.GEMINI_CONFIG = GEMINI_CONFIG;