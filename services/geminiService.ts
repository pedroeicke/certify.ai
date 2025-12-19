
import { GoogleGenAI, Type } from "@google/genai";
import { LayoutConfig } from "../types";

export const analyzeCertificateLayout = async (base64Image: string): Promise<LayoutConfig> => {
  // Use the API key directly from process.env as per instructions
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `Você é um analista de design. Estou enviando a imagem da página 1 de um certificado.
              
              OBJETIVO:
              1. Localize o espaço vazio centralizado entre o texto "ESTE CERTIFICADO É CONFERIDO A" e o texto informativo do curso logo abaixo.
              2. Calcule as coordenadas em pontos PDF (A4 Paisagem: 842 largura x 595 altura).
              3. O ponto (0,0) é o CANTO INFERIOR ESQUERDO.
              
              REGRAS ESTRITAS:
              - A fonte DEVE ser "Great Vibes".
              - O texto deve ser centralizado horizontalmente (x ≈ 421).
              - A cor da fonte deve ser sempre BRANCO (#FFFFFF).
              - O tamanho da fonte deve ser elegante (entre 50 e 70pt).`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER, description: "Coordenada X (centralizado ≈ 421)" },
            y: { type: Type.NUMBER, description: "Coordenada Y da linha de base (0-595)" },
            fontSize: { type: Type.NUMBER, description: "Tamanho da fonte em pontos" },
            color: { type: Type.STRING, description: "Código Hex da cor (sempre #FFFFFF)" },
            fontFamily: { type: Type.STRING, description: "Sempre 'Great Vibes'" }
          },
          required: ["x", "y", "fontSize", "color", "fontFamily"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    const parsed = JSON.parse(text);
    
    return {
      x: parsed.x || 421,
      y: parsed.y || 285,
      fontSize: parsed.fontSize || 65,
      color: "#FFFFFF",
      fontFamily: "Great Vibes"
    };
  } catch (error) {
    console.error("AI Analysis failed, using defaults:", error);
    // Return safe defaults if analysis fails
    return {
      x: 421,
      y: 285,
      fontSize: 65,
      color: "#FFFFFF",
      fontFamily: "Great Vibes"
    };
  }
};