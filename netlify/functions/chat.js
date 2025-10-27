// /netlify/functions/chat.js
import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("FATAL: GEMINI_API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

// --- JSON SCHEMA FOR RECOMMENDATIONS ---
const recommendationSchema = {
    type: Type.OBJECT,
    properties: {
        introduction: { 
            type: Type.STRING, 
            description: "Breve introducción profesional para el revendedor, antes de listar los IDs." 
        },
        services: {
            type: Type.ARRAY,
            description: "Array de objetos de servicio recomendados.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "El ID del servicio (ej: 'p2', 'c5')." },
                    is_new: { type: Type.BOOLEAN, description: "True si es una sugerencia de servicio nuevo; false si existe en el catálogo." },
                    name: { type: Type.STRING, description: "El nombre del servicio." },
                    description: { type: Type.STRING, description: "Una descripción convincente del servicio (solo si is_new es true)." },
                    price: { type: Type.NUMBER, description: "El costo de producción sugerido (solo si is_new es true)." }
                },
                required: ["id", "is_new", "name"]
            }
        },
        closing: { 
            type: Type.STRING, 
            description: "Conclusión amigable para el revendedor, invitando a añadirlos." 
        },
        client_questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array con 2-3 preguntas estratégicas que el revendedor debe hacerle a su CLIENTE FINAL para clarificar el proyecto. Deben ser formuladas para ser usadas directamente con el cliente."
        },
        sales_pitch: {
            type: Type.STRING,
            description: "Un párrafo persuasivo y profesional, listo para copiar y pegar. Debe explicarle al CLIENTE FINAL los beneficios de la solución propuesta, enfocándose en el valor y los resultados, no en la jerga técnica."
        }
    },
    required: ["introduction", "services", "closing", "client_questions", "sales_pitch"]
};


// --- HANDLER ---
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let pricingData;
  try {
    // Correct path to read pricing.json from the project root in a Netlify function environment
    const pricingPath = path.join(process.cwd(), 'pricing.json');
    pricingData = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));
  } catch (err) {
    console.error("CRITICAL ERROR: Could not read or parse pricing.json", err);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: true, message: 'Server error: could not load pricing configuration.' })
    };
  }

  try {
    const { userMessage, history: historyForApi } = JSON.parse(event.body);
    if (!userMessage || !historyForApi) {
        return { statusCode: 400, body: JSON.stringify({ error: true, message: "Missing userMessage or history." })};
    }

    const historyWithNewMessage = [...historyForApi, { role: 'user', parts: [{ text: userMessage }] }];

    // --- STEP 1: CLASSIFY INTENT ---
    const classificationSystemPrompt = `Eres un clasificador de peticiones. Analiza el siguiente mensaje. Tu única respuesta debe ser una de estas dos palabras: 'RECOMENDACION' si la pregunta es para pedir una sugerencia de servicios para un proyecto, o 'TEXTO' para cualquier otra cosa (saludos, preguntas técnicas, etc.). Responde solo con la palabra en mayúsculas.`;
    
    const classificationResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: historyWithNewMessage,
        config: { systemInstruction: classificationSystemPrompt }
    });
    
    const intent = classificationResponse.text?.toUpperCase().trim().replace(/['"]+/g, '') || 'TEXTO';

    // --- STEP 2: GENERATE RESPONSE BASED ON INTENT ---
    let finalResponse;

    if (intent === 'RECOMENDACION') {
        const serviceList = Object.values(pricingData.allServices)
            .flatMap(category => category.items)
            .map(s => `ID: ${s.id} | Nombre: ${s.name} | Descripción: ${s.description}`).join('\n');
        const planList = pricingData.monthlyPlans
            .map(p => `ID: ${p.id} | Nombre: ${p.name} | Descripción: ${p.description}`).join('\n');
        const allServicesString = `--- CATÁLOGO DE SERVICIOS ---\nSERVICIOS ESTÁNDAR:\n${serviceList}\nPLANES MENSUALES:\n${planList}`;

        const recommendationSystemPrompt = `Eres Zen Assistant, un estratega de productos y coach de ventas. Analiza las necesidades del cliente y construye la solución perfecta. ${allServicesString}. INSTRUCCIONES: 1. Genera una respuesta ESTRICTAMENTE en el formato JSON especificado. 2. Para servicios existentes, usa su 'id' y 'name' reales y pon 'is_new: false'. 3. SI UN SERVICIO NECESARIO NO EXISTE, ¡Créalo! Pon 'is_new: true', un 'id' único (ej: 'custom-crm'), un 'name' claro, una 'description' vendedora y un 'price' de producción justo. 4. En 'client_questions', crea preguntas para descubrir más oportunidades. 5. En 'sales_pitch', escribe un párrafo de venta enfocado en beneficios.`;
        
        finalResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: historyWithNewMessage,
            config: {
                systemInstruction: recommendationSystemPrompt,
                responseMimeType: "application/json",
                responseSchema: recommendationSchema,
            }
        });

    } else { // Fallback to TEXT for 'TEXTO' or any other classification
        const textSystemPrompt = `Eres Zen Assistant. Actúa como un asistente de ventas experto en desarrollo web. Responde de forma cortés, profesional y concisa a la consulta.`;

        finalResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: historyWithNewMessage,
            config: { systemInstruction: textSystemPrompt }
        });
    }
    
    const responseText = finalResponse.text;
    const updatedHistory = [...historyWithNewMessage, { role: 'model', parts: [{ text: responseText }] }];

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        response: responseText, 
        history: updatedHistory 
      }) 
    };

  } catch (err) {
    console.error("Handler Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: true, message: `Server function error: ${err.message}` }),
    };
  }
};