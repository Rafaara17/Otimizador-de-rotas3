
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.5-flash';

export async function extractAddressFromImage(base64: string, mimeType: string): Promise<string | null> {
    const prompt = `
        Sua tarefa é analisar a imagem de um pedido de compra e extrair **apenas o endereço de entrega do COMPRADOR**. Siga estas regras com extrema precisão para evitar erros.

        **Como Identificar os Endereços Corretos:**

        1.  **Identifique o Vendedor vs. Comprador:**
            *   O **VENDEDOR** (ou emitente) é quem emite o documento. Seu endereço geralmente fica no topo, perto do logotipo da empresa. **SEMPRE IGNORE O ENDEREÇO DO VENDEDOR**.
            *   O **COMPRADOR** (ou destinatário) é quem recebe os produtos. O endereço que queremos está associado ao comprador.

        2.  **Hierarquia de Extração (Ordem de Prioridade Estrita):**

            *   **PRIORIDADE 1: "Endereço de Entrega" Explícito:**
                *   Procure por um campo claramente rotulado como "Endereço de Entrega", "Local de Entrega", "Entregar em", "Enviar para". Este é o endereço mais confiável. Se encontrá-lo, use-o e ignore todos os outros.

            *   **PRIORIDADE 2: Endereço Principal do Comprador:**
                *   **SOMENTE SE** a Prioridade 1 não for encontrada, procure o endereço principal associado aos dados do **COMPRADOR**.
                *   **REGRA CRÍTICA:** Este endereço **DEVE** estar próximo ao nome do comprador e ser precedido pela palavra **"Endereço"** ou estar dentro de uma seção claramente definida como "Dados do Comprador" ou "Destinatário".
                *   Um endereço que aparece sem a palavra "Endereço" ou um rótulo claro **não é confiável e deve ser ignorado**, pois provavelmente é do vendedor.

        **Regras Finais de Formatação:**

        *   **Formato da Saída:** Retorne **apenas** o endereço completo como uma única string (rua, número, bairro, cidade, estado, CEP). Não inclua o nome da empresa, "Endereço:", ou qualquer outro texto.
        *   **Caso de Falha:** Se, após seguir esta lógica rigorosa, nenhum endereço que se encaixe nos critérios for encontrado, retorne nulo. Não invente ou adivinhe um endereço.
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
            model: model,
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
