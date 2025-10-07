import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import type { VocabularyItem, ListeningExercise, PronunciationFeedback, TranscribedSpeech, WordDetails, LookupResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const wordDetailCache = new Map<string, WordDetails>();

export const generateVocabulary = async (topic: string): Promise<VocabularyItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a list of 10 essential English vocabulary words for a professional in the "${topic}" industry, prioritizing words from the 3000 most common English words list. Keep the words and examples simple and easy to understand. For each word, provide its IPA pronunciation, a simple definition, an example sentence, and its Vietnamese translation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
              translation: { type: Type.STRING },
            },
            required: ["word", "pronunciation", "definition", "example", "translation"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating vocabulary:", error);
    throw new Error("Không thể tạo danh sách từ vựng. Vui lòng thử lại.");
  }
};

export const explainGrammar = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Explain the English grammar rule "${topic}" in a simple way, as if for a beginner who has forgotten the basics. Use vocabulary primarily from the 3000 most common English words list. Provide 3 clear, simple example sentences with Vietnamese translations. Format the response in Markdown.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error explaining grammar:", error);
    throw new Error("Không thể giải thích ngữ pháp. Vui lòng thử lại.");
  }
};


export const generateListeningExercise = async (topic: string): Promise<ListeningExercise> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a short, simple English dialogue for a business context about "${topic}". The dialogue should be between two people, for example Alex and Ben, and use vocabulary primarily from the 3000 most common English words list. Keep the sentences easy to understand. For each line of dialogue, provide a Vietnamese translation. After the dialogue, create 3 multiple-choice questions to check for understanding, each with 4 options. Indicate the correct answer for each question.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        dialogue: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    speaker: { type: Type.STRING },
                                    line: { type: Type.STRING },
                                    translation: { type: Type.STRING },
                                },
                                required: ["speaker", "line", "translation"],
                            }
                        },
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                    },
                                    answer: { type: Type.STRING },
                                },
                                required: ["question", "options", "answer"],
                            },
                        },
                    },
                    required: ["dialogue", "questions"],
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating listening exercise:", error);
        throw new Error("Không thể tạo bài luyện nghe. Vui lòng thử lại.");
    }
};

export const createSpeakingChat = (topic: string): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are an English teacher conducting a simple, friendly conversation with a beginner learner. Keep your responses short, encouraging, and use vocabulary primarily from the 3000 most common English words list. The scenario is a conversation about "${topic}".`,
    },
  });
};

export const sendChatMessage = async (chat: Chat, message: string): Promise<GenerateContentResponse> => {
  try {
    return await chat.sendMessage({ message });
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw new Error("Không thể gửi tin nhắn. Vui lòng thử lại.");
  }
};

export const evaluatePronunciation = async (wordToPractice: string, audioBase64: string): Promise<PronunciationFeedback> => {
  try {
    const textPart = {
      text: `You are an English pronunciation coach. The user is trying to pronounce the word "${wordToPractice}". Analyze their pronunciation from the provided audio.
      Your task is to return a JSON object with two fields: "type" and "message".
      - The "type" field must be a string, either "correct" if the pronunciation is good, or "incorrect" if it needs improvement.
      - The "message" field must be a short, encouraging feedback string in Vietnamese (1-2 sentences).
      
      Example for good pronunciation: {"type": "correct", "message": "Phát âm rất tốt! Rất rõ ràng."}
      Example for incorrect pronunciation: {"type": "incorrect", "message": "Bạn phát âm gần đúng rồi, hãy thử bật hơi mạnh hơn cho âm /t/ ở cuối nhé."}`,
    };
    const audioPart = {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, audioPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: ['correct', 'incorrect'],
              },
              message: {
                type: Type.STRING,
                description: "Feedback message in Vietnamese."
              },
            },
            required: ["type", "message"],
          },
        },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error evaluating pronunciation:", error);
    throw new Error("Không thể phân tích phát âm. Vui lòng thử lại.");
  }
};

export const transcribeAndEvaluateSpeaking = async (audioBase64: string): Promise<TranscribedSpeech> => {
  try {
    const textPart = {
      text: `You are an English teacher evaluating a student's spoken response.
      Your task is to return a JSON object with two fields: "transcription" and "feedback".
      1.  "transcription": Transcribe the user's English speech from the audio. If the speech is unclear or not in English, return an empty string.
      2.  "feedback": Provide a short, constructive, and encouraging feedback on the user's pronunciation in Vietnamese. If the pronunciation is good, say so. If there are errors, point out one key area for improvement.
      
      Example 1 (Good): {"transcription": "I'm having a great day, thank you for asking.", "feedback": "Phát âm tuyệt vời! Rất rõ ràng và tự nhiên."}
      Example 2 (Needs improvement): {"transcription": "I sink we should meet tomorrow.", "feedback": "Làm tốt lắm! Hãy chú ý âm 'th' trong từ 'think', nghe gần giống như 's'."}
      Example 3 (Unclear): {"transcription": "", "feedback": "Tôi chưa nghe rõ lắm, bạn có thể thử lại được không?"}`,
    };
    const audioPart = {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: {
              type: Type.STRING,
              description: "The transcribed text from the audio."
            },
            feedback: {
              type: Type.STRING,
              description: "Pronunciation feedback in Vietnamese."
            },
          },
          required: ['transcription', 'feedback'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error transcribing and evaluating speech:", error);
    throw new Error("Không thể phân tích giọng nói. Vui lòng thử lại.");
  }
};

export const getWordDetails = async (word: string): Promise<WordDetails> => {
  const normalizedWord = word.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!normalizedWord) {
    return { pronunciation: null, translation: null };
  }
  if (wordDetailCache.has(normalizedWord)) {
    return wordDetailCache.get(normalizedWord)!;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an English-Vietnamese dictionary API. For the given English word, provide its most common IPA pronunciation and its Vietnamese translation. The word is case-insensitive. If the word is not a valid English word or you cannot find a definition, return null for both fields.
      Word: "${normalizedWord}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pronunciation: { type: Type.STRING, nullable: true },
            translation: { type: Type.STRING, nullable: true },
          },
          required: ["pronunciation", "translation"],
        },
      },
    });

    const jsonText = response.text.trim();
    const details = JSON.parse(jsonText);
    wordDetailCache.set(normalizedWord, details);
    return details;
  } catch (error) {
    console.error(`Error getting details for word "${normalizedWord}":`, error);
    // Do not cache errors, so we can retry
    throw new Error("Không thể tra cứu từ.");
  }
};

export const lookupWord = async (term: string): Promise<LookupResult> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an English-Vietnamese dictionary. A user is looking up the term "${term}". 
            First, determine if the term is English or Vietnamese.
            - If it's English, provide the Vietnamese translation.
            - If it's Vietnamese, provide the English translation.
            
            Return a JSON object with the following structure:
            - "word": The original English word.
            - "pronunciation": The IPA pronunciation of the English word.
            - "translation": The Vietnamese translation.
            - "examples": An array of 5 simple, common example sentences in English using the word.
            
            Prioritize vocabulary from the 3000 most common English words for the examples. If the term is not found, return nulls for the fields.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        pronunciation: { type: Type.STRING },
                        translation: { type: Type.STRING },
                        examples: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ["word", "pronunciation", "translation", "examples"],
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error looking up word:", error);
        throw new Error("Không thể tra cứu từ. Vui lòng thử lại.");
    }
};

export const generateMoreExamples = async (word: string, existingExamples: string[]): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate 5 new and different simple example sentences for the English word "${word}". Avoid sentences similar to these existing ones: ${JSON.stringify(existingExamples)}. Prioritize common vocabulary.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating more examples:", error);
        throw new Error("Không thể tạo thêm ví dụ.");
    }
};

export const findSynonyms = async (word: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `List up to 5 common synonyms for the English word "${word}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "A synonym for the word." },
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error finding synonyms:", error);
        throw new Error("Không thể tìm từ đồng nghĩa.");
    }
};


export const findAntonyms = async (word: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `List up to 5 common antonyms for the English word "${word}". If no common antonyms exist, return an empty array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "An antonym for the word." },
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error finding antonyms:", error);
        throw new Error("Không thể tìm từ trái nghĩa.");
    }
};
