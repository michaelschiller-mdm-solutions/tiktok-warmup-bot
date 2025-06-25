import fs from 'fs';
import path from 'path';
import { db } from '../database';

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeminiServiceConfig {
  apiKey: string;
  modelName: string;
}

export class GeminiService {
  private config: GeminiServiceConfig;
  private apiUrl: string;
  private static instance: GeminiService;

  constructor(config: GeminiServiceConfig) {
    this.config = config;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.modelName}:generateContent`;
    if (!this.config.apiKey) {
      console.warn('Gemini API key is not configured.');
    }
  }

  public static async getInstance(): Promise<GeminiService> {
    if (!GeminiService.instance) {
      const settings = await this.loadSettings();
      GeminiService.instance = new GeminiService(settings);
    }
    return GeminiService.instance;
  }
  
  public static async refreshInstance(): Promise<GeminiService> {
    const settings = await this.loadSettings();
    GeminiService.instance = new GeminiService(settings);
    return GeminiService.instance;
  }

  private static async loadSettings(): Promise<GeminiServiceConfig> {
    try {
      const result = await db.query('SELECT key, value FROM application_settings WHERE key IN ($1, $2)', ['gemini_api_key', 'gemini_model_name']);
      const settings: any = result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      
      return {
        apiKey: settings.gemini_api_key || process.env.GEMINI_API_KEY || '',
        modelName: settings.gemini_model_name || 'gemini-1.5-flash',
      };
    } catch (error) {
      console.error("Failed to load settings from DB, falling back to env vars.", error);
      return {
        apiKey: process.env.GEMINI_API_KEY || '',
        modelName: 'gemini-1.5-flash',
      };
    }
  }
  
  public async validateApiKey(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('API Key is not provided.');
    }
    try {
      const testPrompt = "Give me a single word: 'test'";
      await this.callGemini(testPrompt, true);
    } catch (error) {
       throw new Error(`API key validation failed. Please check your key and model name. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async callGemini(prompt: string, isValidation: boolean = false): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.config.apiKey}`, {
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
            temperature: isValidation ? 0.1 : 0.9,
            maxOutputTokens: isValidation ? 10 : 2048,
          },
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

  async generateEnhancedBioVariations(options: {
    city?: string;
    country?: string;
    university?: string;
    age?: number;
    birthYear?: number;
    highlights?: string[];
    interests?: string[];
    count?: number;
  }): Promise<string[]> {
    const { city, country, university, age, birthYear, highlights = [], interests = [], count = 15 } = options;

    // Common bio templates based on your examples
    const templates = [
      // Location-focused templates
      ...(city ? [
        `${city}, ${country || 'USA'}`,
        `📍${city}📍`,
        `📍🇺🇸${city}`,
        `${university ? `${university} | ` : ''}${city}`
      ] : []),
      
      // Fashion & Beauty templates
      `NAME | 𝑭𝒂𝒔𝒉𝒊𝒐𝒏 & 𝑩𝒆𝒂𝒖𝒕𝒚\n${city ? `${city}, ${country || 'USA'} 🌥️🇵🇭` : ''}\nthings i do, fits i wear ✨`,
      
      // Lifestyle templates
      `dance | outfits | lifestyle\n${city ? `📍${city}📍` : ''}`,
      `lifestyle • fashion\n${city ? `${city.toLowerCase()} | milwaukee` : ''}`,
      
      // University templates
      ...(university ? [
        `${university} | ${city || 'STL'}`,
        `${university} student | ${city || ''}`,
        `${university} '${birthYear ? String(birthYear).slice(-2) : '25'}`
      ] : [])
    ];

    // Highlight-based bio additions
    const highlightBioAdditions: Record<string, string[]> = {
      'sunset': ['🌅 sunset lover', 'chasing sunsets ✨', '🌇 golden hour enthusiast'],
      'clouds': ['☁️ cloud love', 'head in the clouds ☁️', '🌤️ sky dreamer'],
      'beach': ['🏖️ beach lover', 'salty air, don\'t care 🌊', '🐚 ocean child'],
      'travel': ['✈️ wanderlust', 'collecting passport stamps 🗺️', '🌍 travel addict'],
      'fitness': ['💪 fitness enthusiast', 'strong is beautiful 💪', '🏋️‍♀️ gym life'],
      'food': ['🍕 foodie', 'eating my way through life 🍰', '👩‍🍳 food lover'],
      'coffee': ['☕ coffee addict', 'but first, coffee ☕', '☕ caffeine dependent'],
      'art': ['🎨 creative soul', 'art is life 🖼️', '✨ creating magic'],
      'music': ['🎵 music lover', 'life is a playlist 🎧', '🎶 good vibes only'],
      'nature': ['🌿 nature lover', 'wild & free 🦋', '🌸 bloom where planted']
    };

    const prompt = `Create ${count} diverse Instagram bio variations using these templates and guidelines:

LOCATION CONTEXT:
${city ? `- City: ${city}` : '- No specific city'}
${country ? `- Country: ${country}` : ''}
${university ? `- University: ${university}` : ''}

PERSONAL INFO:
${age ? `- Age: ${age}` : ''}
${birthYear ? `- Birth Year: ${birthYear} (use last 2 digits: '${String(birthYear).slice(-2)})` : ''}

HIGHLIGHTS/INTERESTS: ${highlights.length > 0 ? highlights.join(', ') : 'lifestyle, fashion'}

BIO STYLE TEMPLATES:
1. Simple location: "${city || 'City'}, ${country || 'USA'}"
2. Fashion focus: "NAME | 𝑭𝒂𝒔𝒉𝒊𝒐𝒏 & 𝑩𝒆𝒂𝒖𝒕𝒚\\n${city ? `${city}, ${country || 'USA'} 🌥️🇵🇭` : ''}\\nthings i do, fits i wear ✨"
3. Lifestyle: "dance | outfits | lifestyle\\n📍${city || 'city'}📍"
4. University: "${university || 'WashU'} | ${city || 'STL'}"
5. Simple emoji location: "📍🇺🇸${city || 'OKC'}"
6. Multi-line lifestyle: "lifestyle • fashion\\n${city ? `${city.toLowerCase()} | milwaukee` : ''}"

HIGHLIGHT-BASED ADDITIONS:
${Object.entries(highlightBioAdditions)
  .filter(([key]) => highlights.some(h => h.toLowerCase().includes(key)))
  .map(([key, additions]) => `- ${key}: ${additions.join(', ')}`)
  .join('\n')}

AGE INTEGRATION OPTIONS:
${age ? `- Add "| ${age}" or "| '${String(birthYear || new Date().getFullYear() - age).slice(-2)}"` : ''}

RULES:
- Use realistic female names (Emma, Sofia, Mia, Aria, Luna, Zoe, Ivy, Nova, Sage)
- Mix German and English elements if appropriate
- Include relevant emojis but don't overuse
- Vary length from short (1 line) to medium (3 lines)
- Adapt location format: "📍city📍", "city, country", "city | other_city"
- Include university/age references when provided
- Add highlight-based personality elements
- Use trendy formatting: "•", "|", line breaks

Generate ${count} different bio variations, one per line:`;

    try {
      const response = await this.callGemini(prompt);
      
      const variations = response
        .split('\n')
        .map(line => line.trim().replace(/^["']|["']$/g, ''))
        .filter(line => line.length > 0 && !line.includes(':') && !line.startsWith('-'))
        .slice(0, count);

      return variations.length > 0 ? variations : this.generateFallbackBioVariations(options);
    } catch (error) {
      console.error('Failed to generate enhanced bio variations:', error);
      return this.generateFallbackBioVariations(options);
    }
  }

  private generateFallbackBioVariations(options: {
    city?: string;
    country?: string;
    university?: string;
    age?: number;
    birthYear?: number;
    highlights?: string[];
    count?: number;
  }): string[] {
    const { city, country, university, age, birthYear, highlights = [], count = 15 } = options;
    const names = ['Emma', 'Sofia', 'Mia', 'Aria', 'Luna', 'Zoe', 'Ivy', 'Nova', 'Sage'];
    const variations: string[] = [];

    // Template 1: Simple location
    if (city) {
      variations.push(`${city}, ${country || 'USA'}`);
      variations.push(`📍${city}📍`);
      variations.push(`📍🇺🇸${city}`);
    }

    // Template 2: Fashion & Beauty
    const randomName = names[Math.floor(Math.random() * names.length)];
    variations.push(`${randomName} | 𝑭𝒂𝒔𝒉𝒊𝒐𝒏 & 𝑩𝒆𝒂𝒖𝒕𝒚\n${city ? `${city}, ${country || 'USA'} 🌥️🇵🇭` : ''}\nthings i do, fits i wear ✨`);

    // Template 3: Lifestyle
    variations.push(`dance | outfits | lifestyle\n${city ? `📍${city}📍` : ''}`);
    variations.push(`lifestyle • fashion\n${city ? `${city.toLowerCase()} | milwaukee` : ''}`);

    // Template 4: University
    if (university) {
      variations.push(`${university} | ${city || 'STL'}`);
      if (birthYear) {
        variations.push(`${university} '${String(birthYear).slice(-2)}`);
      }
    }

    // Template 5: Age integration
    if (age) {
      variations.push(`${city || 'lifestyle'} | ${age}`);
      if (birthYear) {
        variations.push(`${city || 'vibes'} | '${String(birthYear).slice(-2)}`);
      }
    }

    // Template 6: Highlight-based
    highlights.forEach(highlight => {
      if (highlight.toLowerCase().includes('sunset')) {
        variations.push(`🌅 sunset lover\n${city ? `📍${city}📍` : ''}`);
      }
      if (highlight.toLowerCase().includes('beach')) {
        variations.push(`🏖️ beach lover\n${city ? `${city} vibes` : ''}`);
      }
      if (highlight.toLowerCase().includes('travel')) {
        variations.push(`✈️ wanderlust\n${city ? `based in ${city}` : ''}`);
      }
    });

    // Ensure we have enough variations
    while (variations.length < count) {
      const randomCity = city || 'NYC';
      const randomAge = age || Math.floor(Math.random() * 8) + 18;
      variations.push(`${randomCity} | ${randomAge}`);
      variations.push(`lifestyle • fashion\n📍${randomCity}📍`);
      variations.push(`✨ living my best life\n${randomCity}`);
    }

    return Array.from(new Set(variations)).slice(0, count);
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

export default GeminiService; 