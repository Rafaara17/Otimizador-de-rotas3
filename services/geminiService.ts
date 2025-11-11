
import { GoogleGenAI, Type } from "@google/genai";
import { Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const visionModel = 'gemini-2.5-flash';
const textModel = 'gemini-2.5-flash';

export async function extractAddressFromImage(base64: string, mimeType: string): Promise<string | null> {
    const prompt = `
        Analise esta imagem de um pedido de compra. Sua tarefa é extrair o endereço de entrega.
        Siga estas regras precisamente:
        1.  Primeiro, procure por um "endereço de entrega", "endereço de envio" explícito, ou um endereço em uma seção como "observações" ou "notas", geralmente na parte inferior do documento. Esta é a maior prioridade.
        2.  Se nenhum endereço de entrega explícito for encontrado, encontre o endereço principal da empresa, que geralmente fica na parte superior.
        3.  Retorne apenas o endereço completo como uma única string. Não inclua nomes de empresas ou qualquer outro texto.
        4.  Se não conseguir encontrar nenhum endereço, retorne nulo.
    `;

    const imagePart = {
        inlineData: {
            data: base64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    try {
        const response = await ai.models.generateContent({
            model: visionModel,
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        address: {
                            type: Type.STRING,
                            nullable: true,
                            description: "O endereço de entrega extraído ou nulo se não for encontrado.",
                        },
                    },
                },
            },
        });
        
        const jsonString = response.text;
        const result = JSON.parse(jsonString);
        return result.address || null;

    } catch (error) {
        console.error("Erro ao extrair endereço da imagem:", error);
        throw new Error("A API Gemini falhou ao processar a imagem.");
    }
}

export async function getTravelTime(origin: string, destination: string): Promise<number> {
    const prompt = `Qual é o tempo estimado de viagem de carro em minutos entre "${origin}" e "${destination}"? Forneça apenas o valor numérico em minutos. Por exemplo: 25. Se não for possível determinar o tempo, retorne 0.`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
        });

        const text = response.text.trim();
        const time = parseInt(text, 10);
        
        if (isNaN(time)) {
             console.warn(`Não foi possível analisar o tempo de viagem para: ${origin} -> ${destination}. Recebido: "${text}"`);
             return 0; // Retorna 0 ou um valor alto para indicar um problema
        }
        
        return time;

    } catch (error) {
        console.error(`Erro ao obter o tempo de viagem entre ${origin} e ${destination}:`, error);
        throw new Error("A API Gemini falhou ao calcular o tempo de viagem.");
    }
}
