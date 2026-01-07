import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizData, StudyMaterial, Subject } from "../types";

// Helper to get AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTextResponse = async (
  prompt: string, 
  history: {role: string, parts: {text: string}[]}[],
  subject: Subject
): Promise<string> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an expert, friendly, and multilingual tutor specializing in ${subject}. 
  Provide clear, concise, and encouraging explanations. 
  Adapt to the student's language automatically.`;

  try {
    const chat = ai.chats.create({
      model,
      config: { systemInstruction },
      history: history
    });

    const result = await chat.sendMessage({ message: prompt });
    return result.text || "I apologize, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "An error occurred while connecting to the tutor.";
  }
};

export const generateQuiz = async (topic: string, subject: Subject): Promise<QuizData | null> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `Create a multiple-choice quiz about ${topic} in the field of ${subject}.
  Include 5 questions.
  Return strictly JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-based)" },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as QuizData;
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    return null;
  }
};

// New function to match voice audio to a quiz option
export const interpretVoiceAnswer = async (
  base64Audio: string, 
  question: string, 
  options: string[]
): Promise<number | null> => {
  const ai = getAI();
  // using audio-native model for best multimodal understanding
  const model = "gemini-2.5-flash-native-audio-preview-12-2025"; 

  const prompt = `The user is taking a quiz.
  Question: "${question}"
  Options:
  0: ${options[0]}
  1: ${options[1]}
  2: ${options[2]}
  3: ${options[3]}

  Listen to the attached audio. The user will say the answer or the letter/number of the option.
  Identify which option index (0, 1, 2, or 3) the user selected.
  
  Return strictly a JSON object with a single field 'selectedIndex'.
  If unclear, return -1.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "audio/wav", data: base64Audio } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedIndex: { type: Type.INTEGER }
          },
          required: ["selectedIndex"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return typeof result.selectedIndex === 'number' ? result.selectedIndex : null;
  } catch (error) {
    console.error("Voice Interpret Error:", error);
    return null;
  }
};

export const generateStudyMaterial = async (topic: string, subject: Subject): Promise<StudyMaterial | null> => {
  const ai = getAI();
  const model = "gemini-3-flash-preview";

  const prompt = `Create a comprehensive study guide about "${topic}" for ${subject}.
  The content should be formatted in Markdown.
  Include a brief summary.
  Also include a 'vocabulary' list of 3-5 hard or important terms with their phonetic pronunciation and a short definition.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            content: { type: Type.STRING, description: "Full study material in Markdown format" },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  phonetic: { type: Type.STRING, description: "Phonetic pronunciation guide e.g. /kæt/" },
                  definition: { type: Type.STRING }
                },
                required: ["term", "phonetic", "definition"]
              }
            }
          },
          required: ["title", "summary", "content", "vocabulary"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as StudyMaterial;
  } catch (error) {
    console.error("Material Generation Error:", error);
    return null;
  }
};