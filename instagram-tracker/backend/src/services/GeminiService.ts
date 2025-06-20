import fs from 'fs';
import path from 'path';

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

class GeminiService {
  private apiKey: string;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
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
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  private loadAmericanSurnames(): string[] {
    try {
      const namelistPath = path.join(__dirname, '../../namelist.txt');
      const content = fs.readFileSync(namelistPath, 'utf-8');
      
      // Extract surnames from the file (skip the header line)
      const lines = content.split('\n');
      const surnames: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.includes('Here are') && !trimmed.includes('surnames') && trimmed.length > 1) {
          surnames.push(trimmed.charAt(0) + trimmed.slice(1).toLowerCase());
        }
      }
      
      return surnames.slice(0, 50); // Use first 50 surnames
    } catch (error) {
      console.error('Failed to load surnames:', error);
      // Fallback list
      return [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
      ];
    }
  }

  async generateUsernameVariations(originalUsername: string, count: number = 10): Promise<string[]> {
    const surnames = this.loadAmericanSurnames();
    
    const prompt = `Erstelle kreative Usernamen auf Basis der folgenden Logik:

Zerlege den Ursprungsnamen "${originalUsername}" in zwei Teile, falls möglich (z.B. "Cherry.Fae" → "Cherry" und "Fae").

Für jeden dieser beiden Namensteile:

1. Kombiniere ihn mit einem gängigen amerikanischen Nachnamen aus dieser Liste: ${surnames.slice(0, 20).join(', ')}.

2. Verwende mehrere Schreibweisen des Usernamens, darunter:
   - NameNachname (z. B. CherryJohnson)
   - Name.Nachname (z. B. Cherry.Johnson)  
   - Name_Nachname (z. B. Cherry_Johnson)
   - NameNchnm: Name + Nachname ohne Vokale (z. B. CherryJhnsn)
   - Name.Nchnm (z. B. Cherry.Jhnsn)
   - leicht verfremdet: z. B. ein zusätzlicher Buchstabe oder vertauschte Buchstaben (z. B. Chaerry_jhnsn)

Erstelle insgesamt ${count} verschiedene Username-Variationen. Gib nur die Usernamen zurück, einen pro Zeile, ohne zusätzliche Erklärungen oder Nummerierungen.`;

    try {
      const response = await this.callGemini(prompt);
      
      // Parse the response and extract usernames
      const variations = response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.includes(':') && !line.startsWith('-'))
        .slice(0, count);

      return variations.length > 0 ? variations : [originalUsername];
    } catch (error) {
      console.error('Failed to generate username variations:', error);
      // Fallback: generate simple variations without AI
      return this.generateFallbackUsernameVariations(originalUsername, count);
    }
  }

  async generateBioVariations(originalBio: string, count: number = 10): Promise<string[]> {
    const prompt = `Erstelle ${count} kreative Variationen für die folgende Instagram Bio:

"${originalBio}"

Die Variationen sollen:
- Den gleichen Grundinhalt und Stil beibehalten
- Verschiedene Formulierungen und Wortwahl verwenden
- Instagram-typische Elemente wie Emojis sinnvoll einsetzen
- Authentisch und ansprechend klingen
- Unterschiedliche Längen haben (kurz bis mittellang)

Gib nur die Bio-Variationen zurück, eine pro Zeile, ohne zusätzliche Erklärungen oder Nummerierungen.`;

    try {
      const response = await this.callGemini(prompt);
      
      // Parse the response and extract bio variations
      const variations = response
        .split('\n')
        .map(line => line.trim().replace(/^["']|["']$/g, '')) // Remove quotes
        .filter(line => line.length > 0 && !line.includes(':') && !line.startsWith('-'))
        .slice(0, count);

      return variations.length > 0 ? variations : [originalBio];
    } catch (error) {
      console.error('Failed to generate bio variations:', error);
      // Fallback: return original bio
      return [originalBio];
    }
  }

  private generateFallbackUsernameVariations(username: string, count: number): string[] {
    const surnames = this.loadAmericanSurnames().slice(0, 10);
    const variations: string[] = [];
    
    // Try to split username
    const parts = username.split(/[._-]/).filter(p => p.length > 0);
    const baseName = parts[0] || username;
    
    // Generate variations with surnames
    for (let i = 0; i < Math.min(count, surnames.length); i++) {
      const surname = surnames[i];
      const surnameNoVowels = surname.replace(/[aeiouAEIOU]/g, '');
      
      variations.push(
        `${baseName}${surname}`,
        `${baseName}.${surname}`,
        `${baseName}_${surname}`,
        `${baseName}${surnameNoVowels}`,
        `${baseName}.${surnameNoVowels.toLowerCase()}`
      );
    }
    
    return Array.from(new Set(variations)).slice(0, count);
  }
}

export default new GeminiService(); 