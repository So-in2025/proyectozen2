// /netlify/functions/chat.js
import { GoogleGenAI, Type } from "@google/genai";

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
  // CRÍTICO: Verificar la clave API aquí antes de hacer cualquier cosa.
  if (!process.env.API_KEY) {
    console.error("FATAL: La variable de entorno API_KEY no está definida.");
    return {
        statusCode: 500,
        body: JSON.stringify({ error: true, message: "Error en la función del servidor: La variable de entorno API_KEY no está configurada." }),
    };
  }

  // Inicializar GoogleGenAI DENTRO del handler después de verificar la clave API.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const GEMINI_MODEL = "gemini-2.5-flash"; // Definir el modelo aquí si no es global.

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { userMessage, history: historyForApi, pricingData } = JSON.parse(event.body);

    if (!userMessage || !historyForApi || !pricingData) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: true, message: "Faltan parámetros: userMessage, history o pricingData." })
        };
    }

    // El historial siempre debe incluir el último mensaje del usuario para la API.
    const historyWithNewMessage = [...historyForApi, { role: 'user', parts: [{ text: userMessage }] }];

    // --- PASO 1: Clasificación de Intención ---
    const classificationSystemPrompt = `Eres un clasificador de peticiones. Analiza el siguiente mensaje. Tu única respuesta debe ser una de estas dos palabras: 'RECOMENDACION' si la pregunta es para pedir una sugerencia de servicios para un proyecto, o 'TEXTO' para cualquier otra cosa (saludos, preguntas técnicas, etc.). Responde solo con la palabra en mayúsculas.`;
    
    // Usar la librería de GoogleGenAI
    const classificationResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: historyWithNewMessage, // Usar el historial completo para la clasificación
        config: { systemInstruction: classificationSystemPrompt }
    });
    
    const intent = classificationResponse.text?.toUpperCase().trim().replace(/['"]+/g, '') || 'TEXTO';

    // --- PASO 2: Generación de Respuesta Basada en la Intención ---
    let finalResponse;

    if (intent === 'RECOMENDACION') {
        const serviceList = Object.values(pricingData.allServices)
            .flatMap(category => category.items)
            .map(s => `ID: ${s.id} | Nombre: ${s.name} | Descripción: ${s.description}`).join('\n');
        const planList = pricingData.monthlyPlans
            .map(p => `ID: ${p.id} | Nombre: ${p.name} | Descripción: ${p.description}`).join('\n');
        const allServicesString = `--- CATÁLOGO COMPLETO DE SERVICIOS ---\nSERVICIOS ESTÁNDAR:\n${serviceList}\nPLANES MENSUALES:\n${planList}`;

        const recommendationSystemPrompt = `
            Eres Zen Assistant, un estratega de productos y coach de ventas de élite.
            Tu tarea es analizar las necesidades del cliente y construir la solución perfecta, usando servicios existentes o creando nuevos si es necesario.
            
            ${allServicesString}

            INSTRUCCIONES CLAVE:
            1.  Genera una respuesta ESTRICTAMENTE en el formato JSON especificado.
            2.  Analiza la petición. Para cada servicio que recomiendes, crea un objeto en el array 'services'.
            3.  **Para servicios existentes del CATÁLOGO:** Usa su 'id' y 'name' reales, y pon 'is_new: false'. No necesitas añadir 'description' o 'price'.
            4.  **SI UN SERVICIO NECESARIO NO EXISTE:** ¡Créalo! Pon 'is_new: true', inventa un 'id' único (ej: 'custom-integration-crm'), un 'name' claro, una 'description' vendedora y un 'price' de producción justo. Esta es tu función más importante.
            5.  En 'client_questions', crea preguntas para descubrir más oportunidades.
            6.  En 'sales_pitch', escribe un párrafo de venta enfocado en los beneficios.
            `;
        
        finalResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: historyWithNewMessage,
            config: {
                systemInstruction: recommendationSystemPrompt,
                responseMimeType: "application/json",
                responseSchema: recommendationSchema,
            }
        });

    } else { // Fallback para 'TEXTO' o cualquier otra clasificación
        const textSystemPrompt = `
            Eres Zen Assistant. Actúa como un asistente de ventas general experto en desarrollo web.
            
            INSTRUCCIONES CLAVE:
            - Responde de forma cortés, profesional y concisa.
            - Responde directamente a la consulta del revendedor.
        `;

        finalResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: historyWithNewMessage,
            config: { systemInstruction: textSystemPrompt }
        });
    }
    
    const responseText = finalResponse.text;
    // El historial devuelto al frontend debe incluir la respuesta del modelo.
    const updatedHistory = [...historyWithNewMessage, { role: 'model', parts: [{ text: responseText }] }];

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        response: responseText, 
        history: updatedHistory 
      }) 
    };

  } catch (err) {
    console.error("Error en el Handler de Netlify:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: true, message: `Error en la función del servidor: ${err.message}` }),
    };
  }
};