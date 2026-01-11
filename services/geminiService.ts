
import { GoogleGenAI } from "@google/genai";
import { FormData, Language } from "../types";

export const generateAssessmentReport = async (data: FormData, lang: Language): Promise<string> => {
  // 必须直接使用 process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const clientDataStr = `
    Name: ${data.name} | Email: ${data.email}
    Insurance: ${data.insurance || 'N/A'}
    Pain: ${data.painArea.join(', ')} (${data.painSide})
    Level: ${data.painLevel}/10 | Type: ${data.painDesc.join(', ')}
    History: ${data.duration}
    Lifestyle: ${data.activity}, Sit ${data.sitting}
    Goal: ${data.goals.join(', ')}
    Note: ${data.notes}
  `;

  const prompt = `
    Role: Senior Massage Therapy Consultant AI for "Massage Philosophy".
    Task: Analyze clinical intake data and provide a structured report.
    Data: ${clientDataStr}
    
    CRITICAL INSTRUCTIONS:
    - BE PROFESSIONAL. NO EMOJIS.
    - STRICTLY SEPARATE SECTIONS BY LANGUAGE AS SPECIFIED.
    - Use Clear Markdown Headers.
    
    Report Structure Required:
    
    1. [STAFF TALK SCRIPT / 前台沟通话术]
    - BILINGUAL (English and Chinese).
    - Provide a professional, empathetic 2-3 sentence script for the receptionist to use when the client arrives. 
    - It should acknowledge the specific pain areas mentioned and set expectations for the professional care they will receive.
    
    2. [THERAPIST CLINICAL STRATEGY]
    - ENGLISH ONLY.
    - Technical analysis for the practitioner.
    - Identify potential muscles involved (e.g., hypertonicity, postural patterns).
    - Suggest treatment sequence (e.g., Warm up -> Myofascial Release -> Trigger Point therapy -> Passive stretching).
    - Recommend session length (60/90/120 min).
    
    3. [疗后客人总结与建议]
    - CHINESE ONLY.
    - Friendly summary to be given to the client AFTER the session.
    - Include 1-2 specific home care suggestions (stretches, hydration, heat/cold).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Report generation failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
