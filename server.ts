import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with User-Agent for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini API route for lead extraction matching the original schema
app.post('/api/gemini/import', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'El texto a procesar es requerido.' });
  }

  try {
    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash'];
    const maxAttempts = 3;
    let lastError: any = null;
    let responseText = '';

    for (const model of modelsToTry) {
      let attempt = 0;
      let success = false;

      while (attempt < maxAttempts && !success) {
        try {
          console.log(`[Gemini Request] Attempting model: ${model} (Attempt ${attempt + 1}/${maxAttempts})`);
          const response = await ai.models.generateContent({
            model: model,
            contents: `Extrae una lista de negocios con su nombre y teléfono del siguiente texto. 
Si el texto contiene links de WhatsApp, extrae el número del link. 

IMPORTANTE SOBRE LA CIUDAD:
1. Si el texto menciona explícitamente una ciudad (ej. "Veracruz", "Hermosillo", "Magdalena"), úsala.
2. Si NO se especifica ciudad en el texto, el campo "city" DEBE ser una string vacía "" (no inventes nada, no supongas Nogales, no pongas México).
3. Está TERMINANTEMENTE PROHIBIDO usar "Nogales, AZ" como valor por defecto a menos que lo diga el texto.
4. No uses ninguna ciudad por defecto. Ciudad vacía si no existe en el texto.

TEXTO:
${text}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Nombre del negocio' },
                    phone: { type: Type.STRING, description: 'Número de teléfono (solo dígitos)' },
                    city: { type: Type.STRING, description: 'Ciudad del negocio' }
                  },
                  required: ['name', 'phone']
                }
              }
            }
          });

          if (response && response.text) {
            responseText = response.text;
            success = true;
            break;
          }
          throw new Error('Respuesta vacía del servicio de IA.');
        } catch (err: any) {
          attempt++;
          lastError = err;
          console.warn(`[Gemini Warning] Model ${model} failed on attempt ${attempt}:`, err.message || err);
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (success) {
        break;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No se pudo obtener una respuesta válida de la IA tras intentar con múltiples modelos.');
    }

    res.json(JSON.parse(responseText));
  } catch (err: any) {
    console.error('Server Gemini error after retries:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el texto con IA.' });
  }
});

// Middleware setup depending on the environment
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Error starting server:', err);
});
