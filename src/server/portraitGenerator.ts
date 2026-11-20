import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import type {
  AbilityRef,
  BackgroundRef,
  ClassRef,
  MonsterRef,
  PlayerCharacter,
  SpeciesRef,
} from '../shared/types.ts';

export const HERO_PORTRAIT_MODEL = 'gemini-nano-banana-2.1';
export const MONSTER_PORTRAIT_MODEL = 'gemini-3.1-flash-lite-image';
export const VISION_PROMPT_MODEL = 'gemini-3.1-flash-lite';
export const CLOUDFLARE_FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';
export const CLOUDFLARE_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const CLOUDFLARE_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ImageProvider = 'cloudflare' | 'gemini';

export interface ParsedImageData {
  mimeType: string;
  base64: string;
  ext: string;
  buffer: Buffer;
}

export function resolveImageProvider(): ImageProvider {
  const configured = (process.env.IMAGE_PROVIDER || 'auto').trim().toLowerCase();
  if (configured === 'cloudflare') return 'cloudflare';
  if (configured === 'gemini') return 'gemini';

  const hasCloudflare = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim()
  );
  return hasCloudflare ? 'cloudflare' : 'gemini';
}

export function parseImageDataUrl(dataUrl: string): ParsedImageData {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Отсутствуют данные изображения');
  }
  const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    dataUrl.trim()
  );
  if (!match) {
    throw new Error('Неверный формат изображения (поддерживаются PNG, JPG, WEBP)');
  }
  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
  const base64 = match[3].replace(/\s+/g, '');
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Изображение пустое');
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Файл слишком большой (максимум 10 МБ)');
  }
  return { mimeType, base64, ext, buffer };
}

function detectImageMimeType(buffer: Buffer, fallback = 'image/jpeg'): string {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return fallback;
}

export function savePortraitBuffer(
  uploadsDir: string,
  prefix: string,
  buffer: Buffer,
  mimeType: string
): string {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mimeType.toLowerCase()] || 'jpg';
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'portrait';
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const filename = `${safePrefix}-${unique}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

function getGenAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'API-ключ Gemini не настроен на сервере (GEMINI_API_KEY). Укажите ключ AIza... из Google AI Studio в .env сервера.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getCloudflareCredentials(): { accountId: string; apiToken: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error(
      'Не настроены CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN в .env сервера для генерации через Cloudflare Workers AI.'
    );
  }
  return { accountId, apiToken };
}

function formatGeminiError(err: unknown, context: 'image' | 'vision' = 'image'): Error {
  const raw = err instanceof Error ? err.message : String(err ?? 'Неизвестная ошибка');
  console.error(`[portraitGenerator][gemini:${context}]`, err);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return new Error(
      'Неверный или неподтверждённый Gemini API-ключ. Проверьте ключ (формата AIza...) в .env или Settings > Secrets.'
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    if (context === 'vision') {
      return new Error(
        'Превышен лимит запросов к Gemini Flash Lite при анализе фото. Подождите минуту или проверьте ключ GEMINI_API_KEY (AIza...) в .env.'
      );
    }
    return new Error(
      'Превышена квота или требуется платный API-ключ Gemini для моделей Nano Banana. Либо подключите Cloudflare Workers AI в .env.'
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new Error('Выбранная модель Gemini недоступна для текущего API-ключа.');
  }
  if (lower.includes('safety') || lower.includes('blocked')) {
    return new Error(
      'ИИ отклонил генерацию по фильтру безопасности. Попробуйте другое фото или формулировку.'
    );
  }
  return new Error(`Не удалось выполнить запрос к Gemini: ${raw}`);
}

function extractImageFromResponse(
  response: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
          text?: string;
        }>;
      };
    }>;
  }
): { buffer: Buffer; mimeType: string } {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      const mimeType = part.inlineData.mimeType || detectImageMimeType(buffer, 'image/png');
      return { buffer, mimeType };
    }
  }
  throw new Error('Модель не вернула изображение. Попробуйте повторить генерацию ещё раз.');
}

function sanitizePromptOutput(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^(prompt\s*:\s*)/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runCloudflareTextPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  const { accountId, apiToken } = getCloudflareCredentials();
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId
  )}/ai/run/${CLOUDFLARE_TEXT_MODEL}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 260,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Cloudflare LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const payload = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: { response?: string };
  } | null;

  const text = sanitizePromptOutput(payload?.result?.response || '');
  if (!text) {
    throw new Error('Cloudflare LLM вернул пустой промпт');
  }
  return text;
}

async function runCloudflareVisionPrompt(
  prompt: string,
  image: ParsedImageData
): Promise<string> {
  const { accountId, apiToken } = getCloudflareCredentials();
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId
  )}/ai/run/${CLOUDFLARE_VISION_MODEL}`;

  const callVision = async (body: Record<string, unknown>) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  let res = await callVision({
    prompt,
    image: Array.from(image.buffer),
    max_tokens: 260,
  });

  // Meta Llama 3.2 Vision on Cloudflare may require a one-time license agreement call ("agree")
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (errText.toLowerCase().includes('agree') || errText.toLowerCase().includes('license')) {
      await callVision({ prompt: 'agree' }).catch(() => undefined);
      res = await callVision({
        prompt,
        image: Array.from(image.buffer),
        max_tokens: 260,
      });
    } else {
      throw new Error(`Cloudflare Vision HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Cloudflare Vision HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const payload = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: { response?: string };
  } | null;

  const text = sanitizePromptOutput(payload?.result?.response || '');
  if (!text) {
    throw new Error('Cloudflare Vision вернул пустое описание');
  }
  return text;
}

async function generateImageWithCloudflareFlux(
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { accountId, apiToken } = getCloudflareCredentials();

  const cleanPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 2000);
  console.log('[portraitGenerator][cloudflare:flux-prompt]', cleanPrompt);

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId
  )}/ai/run/${CLOUDFLARE_FLUX_MODEL}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: cleanPrompt,
        steps: 6,
      }),
    });
  } catch (err) {
    console.error('[portraitGenerator][cloudflare:network]', err);
    throw new Error(
      'Не удалось подключиться к Cloudflare Workers AI. Проверьте доступ в интернет на сервере.'
    );
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[portraitGenerator][cloudflare:http]', res.status, errText);

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'Ошибка доступа Cloudflare Workers AI (401/403). Проверьте CLOUDFLARE_API_TOKEN (права Workers AI: Read и Edit) и CLOUDFLARE_ACCOUNT_ID.'
      );
    }
    if (res.status === 429) {
      throw new Error(
        'Достигнут дневной бесплатный лимит Cloudflare Workers AI (10 000 Neurons). Лимит обновится в 00:00 UTC.'
      );
    }
    if (res.status === 404) {
      throw new Error(
        'Cloudflare вернул 404 — проверьте правильность CLOUDFLARE_ACCOUNT_ID в файле .env.'
      );
    }
    throw new Error(
      `Ошибка Cloudflare Workers AI (HTTP ${res.status}): ${errText.slice(0, 240) || 'Неизвестная ошибка'}`
    );
  }

  if (contentType.startsWith('image/')) {
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length === 0) {
      throw new Error('Cloudflare Workers AI вернул пустое изображение.');
    }
    return { buffer, mimeType: detectImageMimeType(buffer, contentType.split(';')[0]) };
  }

  const payload = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: { image?: string };
    errors?: Array<{ message?: string; code?: number }>;
  } | null;

  if (!payload || payload.success === false || !payload.result?.image) {
    const details =
      payload?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      'Модель не вернула поле result.image';
    console.error('[portraitGenerator][cloudflare:payload]', payload);
    throw new Error(`Cloudflare Workers AI не вернул изображение: ${details}`);
  }

  const buffer = Buffer.from(payload.result.image, 'base64');
  if (buffer.length === 0) {
    throw new Error('Cloudflare Workers AI вернул пустые данные изображения.');
  }
  return { buffer, mimeType: detectImageMimeType(buffer, 'image/jpeg') };
}

async function buildHeroFluxPromptWithVision(input: HeroPortraitInput): Promise<string> {
  const { player, classRef, speciesRef, backgroundRef, faceImage } = input;

  const classLine = classRef
    ? `${classRef.name}${classRef.description ? ` (${classRef.description})` : ''}`
    : player.role || 'Искатель приключений';
  const speciesLine = speciesRef
    ? `${speciesRef.name}${speciesRef.description ? ` (${speciesRef.description})` : ''}`
    : 'Человек';
  const bgLine = backgroundRef
    ? `${backgroundRef.name}${backgroundRef.description ? ` (${backgroundRef.description})` : ''}`
    : 'Странник';

  const instruction = [
    'You are an expert prompt engineer for FLUX dark fantasy portrait generation.',
    'Carefully inspect the attached photo of a real person and write ONE single vivid English image-generation prompt (max 140 words) turning this exact person into a dark fantasy Dungeons & Dragons collectible card portrait.',
    'MUST INCLUDE:',
    '1. Precise physical likeness from the photo: apparent gender, approximate age, face shape, skin tone, eye color/shape, eyebrows, nose, mouth/expression, hair color, hairstyle, facial hair (beard/stubble/mustache if any), and glasses if worn.',
    `2. Character transformation into D&D Species: ${speciesLine}; Class: ${classLine}; Background: ${bgLine}. Translate ALL Russian terms into natural English dark-fantasy armor, robes, subtle racial features, and class props.`,
    '3. Composition: vertical chest-up bust portrait, head and face centered prominently in the UPPER HALF of the frame, looking heroically toward the viewer, atmospheric dark dungeon/tavern background.',
    '4. Art style: painterly dark fantasy D&D trading card oil illustration, rich brushwork, warm torchlight rim lighting against deep obsidian shadows, cinematic detail.',
    '5. End with: no text, no letters, no watermark, no card border, no frame.',
    'OUTPUT RULES: Return ONLY the raw English prompt text. No Russian words, no markdown, no quotes, no commentary.',
  ].join('\n');

  // 1. Prefer free-tier Gemini 3.1 Flash Lite if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const ai = getGenAiClient();
      const response = await ai.models.generateContent({
        model: VISION_PROMPT_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: faceImage.mimeType,
                data: faceImage.base64,
              },
            },
            { text: instruction },
          ],
        },
      });
      const text = sanitizePromptOutput(response.text || '');
      if (text) return text;
    } catch (err) {
      console.warn('[portraitGenerator][hero-vision:gemini-failed-trying-cloudflare]', err);
    }
  }

  // 2. Fallback to Cloudflare's own free Llama 3.2 Vision model so heroes work purely on Cloudflare too
  try {
    return await runCloudflareVisionPrompt(instruction, faceImage);
  } catch (err) {
    console.warn('[portraitGenerator][hero-vision:cloudflare-failed-trying-text]', err);
  }

  // 3. Final fallback: translate Russian character info via Cloudflare Llama 3.1 text model
  return runCloudflareTextPrompt(
    'You write concise, vivid English prompts for FLUX dark fantasy D&D portraits. Output ONLY the English prompt with zero Russian words and no commentary.',
    `Write a 100-word English FLUX prompt for a vertical chest-up dark fantasy D&D oil-painting portrait (head in the upper half, dramatic torchlight, obsidian shadows, no text, no borders) of: Species=${speciesLine}, Class=${classLine}, Background=${bgLine}.`
  );
}

async function buildMonsterFluxPrompt(input: MonsterPortraitInput): Promise<string> {
  const { monster, abilities, referenceImage, extraPrompt } = input;

  const statsSummary = abilities
    .map((ab) => `${ab.name}: ${monster.abilities?.[ab.id] ?? 10}`)
    .join(', ');
  const traitsSummary =
    monster.traits && monster.traits.length > 0
      ? monster.traits
          .map((t) => `${t.name}${t.description ? ` — ${t.description}` : ''}`)
          .join('; ')
      : '';
  const actionsSummary =
    monster.actions && monster.actions.length > 0
      ? monster.actions
          .map((a) => `${a.name}${a.description ? ` — ${a.description}` : ''}`)
          .join('; ')
      : '';

  const instructionLines = [
    'You are an expert prompt engineer for FLUX dark fantasy Dungeons & Dragons bestiary illustrations.',
    'Translate and convert the following monster entry (written in Russian) into ONE vivid ENGLISH-ONLY image-generation prompt (80 to 130 words).',
    'CRITICAL ANATOMICAL ACCURACY RULES:',
    '- First, accurately translate the Monster Name into English and make THAT EXACT creature the unmistakable centerpiece of the very first sentence!',
    '- If the monster is an animal or beast (e.g. Крыса = ordinary sewer/dungeon rat rodent, Волк = wolf, Паук = giant spider, Медведь = bear, Летучая мышь = bat, Змея = snake), depict a realistic, gritty dark-fantasy version of THAT EXACT ANIMAL! NEVER turn an animal into a demon, humanoid, horned beast, or give it clothes, cloaks, or weapons!',
    '- Only add humanoid body, armor, clothes, horns, or weapons if the creature itself naturally has them (e.g. goblin, orc, bandit, tiefling, demon, skeleton warrior).',
    '- Ignore game mechanics numbers (like AC, HP, dice formulas) unless they imply physical appearance (e.g. heavy iron armor, fragile small size).',
    'MONSTER DATA:',
    `- Monster name (Russian): ${monster.name}`,
    `- Stats hint: AC ${monster.ac}, HP ${monster.maxHp}, Speed ${monster.speed} ft, ${statsSummary}`,
    ...(monster.senses ? [`- Senses: ${monster.senses}`] : []),
    ...(monster.resistances ? [`- Resistances: ${monster.resistances}`] : []),
    ...(monster.immunities ? [`- Immunities: ${monster.immunities}`] : []),
    ...(traitsSummary ? [`- Traits: ${traitsSummary}`] : []),
    ...(actionsSummary ? [`- Actions: ${actionsSummary}`] : []),
    ...(extraPrompt?.trim() ? [`- Additional visual direction from DM: ${extraPrompt.trim()}`] : []),
    ...(referenceImage
      ? [
          '- A reference image is attached: faithfully describe its creature species, silhouette, colors, textures, and mood.',
        ]
      : []),
    'COMPOSITION & STYLE:',
    '- Close-up portrait framing the creature head, face, and eyes prominently in the UPPER HALF of the frame so it is instantly recognizable on a half-card.',
    '- Dark fantasy D&D bestiary oil painting illustration, gritty painterly brushwork, atmospheric dark dungeon/cavern lighting with warm torchlight rim highlights and deep shadows.',
    '- End with: no text, no numbers, no card borders, no frame, no watermark.',
    'OUTPUT RULES: Return ONLY the raw English prompt text. ZERO Russian/Cyrillic words. No markdown, no quotes, no intro.',
  ];
  const fullInstruction = instructionLines.join('\n');

  // 1. Try Gemini 3.1 Flash Lite first (supports both Russian translation + optional reference image)
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const ai = getGenAiClient();
      const parts: Array<
        { inlineData: { mimeType: string; data: string } } | { text: string }
      > = [];
      if (referenceImage) {
        parts.push({
          inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.base64,
          },
        });
      }
      parts.push({ text: fullInstruction });

      const response = await ai.models.generateContent({
        model: VISION_PROMPT_MODEL,
        contents: { parts },
      });
      const text = sanitizePromptOutput(response.text || '');
      if (text && !/[а-яё]/i.test(text)) {
        return text;
      }
    } catch (err) {
      console.warn('[portraitGenerator][monster-prompt:gemini-failed-using-cloudflare-llm]', err);
    }
  }

  // 2. Fallback to Cloudflare's own free Llama Vision (if reference image) or Llama 3.1 8B (text)
  if (referenceImage) {
    try {
      const text = await runCloudflareVisionPrompt(fullInstruction, referenceImage);
      if (text && !/[а-яё]/i.test(text)) return text;
    } catch (err) {
      console.warn('[portraitGenerator][monster-prompt:cf-vision-failed]', err);
    }
  }

  try {
    const text = await runCloudflareTextPrompt(
      'You are an expert English prompt translator for FLUX dark fantasy D&D bestiary illustrations. Always translate Russian monster names accurately into English and keep animals anatomically faithful (never draw a rat as a horned demon or humanoid). Output ONLY the raw English prompt, zero Cyrillic characters.',
      fullInstruction
    );
    if (text) return text;
  } catch (err) {
    console.warn('[portraitGenerator][monster-prompt:cf-text-failed]', err);
  }

  // 3. Last-resort clean fallback (no "horns", "terrifying", or "upper torso" words!)
  return [
    `Dark fantasy Dungeons & Dragons bestiary oil painting close-up portrait of ${monster.name}.`,
    extraPrompt?.trim() ? `Details: ${extraPrompt.trim()}.` : '',
    'Anatomically faithful creature portrait with head and eyes prominently in the upper half of the frame, moody dungeon shadows, warm torchlight rim lighting, gritty painterly oil brushwork, no text, no borders, no watermark.',
  ]
    .filter(Boolean)
    .join(' ');
}

export interface HeroPortraitInput {
  player: PlayerCharacter;
  classRef?: ClassRef;
  speciesRef?: SpeciesRef;
  backgroundRef?: BackgroundRef;
  faceImage: ParsedImageData;
}

export async function generateHeroPortrait(
  input: HeroPortraitInput
): Promise<{ buffer: Buffer; mimeType: string }> {
  const provider = resolveImageProvider();

  if (provider === 'cloudflare') {
    const fluxPrompt = await buildHeroFluxPromptWithVision(input);
    return generateImageWithCloudflareFlux(fluxPrompt);
  }

  const ai = getGenAiClient();
  const { player, classRef, speciesRef, backgroundRef, faceImage } = input;

  const classLine = classRef
    ? `${classRef.name}${classRef.description ? ` (${classRef.description})` : ''}`
    : player.role || 'Искатель приключений';
  const speciesLine = speciesRef
    ? `${speciesRef.name}${speciesRef.description ? ` (${speciesRef.description})` : ''}`
    : 'Человек';
  const bgLine = backgroundRef
    ? `${backgroundRef.name}${backgroundRef.description ? ` (${backgroundRef.description})` : ''}`
    : 'Странник';

  const prompt = [
    'Create a high-craft dark fantasy Dungeons & Dragons collectible card portrait based on the real person in the attached photo.',
    'IDENTITY PRESERVATION: Faithfully preserve the exact facial likeness, facial structure, eyes, nose, mouth, age, and recognizable identity of the person in the reference photo.',
    `CHARACTER IDENTITY:`,
    `- Character Name: ${player.name}`,
    `- Species / Race: ${speciesLine}`,
    `- Class: ${classLine}`,
    `- Background: ${bgLine}`,
    'VISUAL TRANSFORMATION: Adapt the person naturally into this D&D species, class, and background using authentic fantasy clothing, weathered armor or robes, subtle racial features (if non-human), and thematic accessories matching their class and origin.',
    'COMPOSITION (CRITICAL): Vertical 3:4 chest-up bust portrait. Place the character head, face, and upper shoulders prominently in the UPPER 55% of the frame, looking slightly toward the viewer with heroic intensity. Leave atmospheric dark fantasy background space around the silhouette.',
    'ART STYLE: Rich painterly dark fantasy D&D trading card illustration, oil-on-canvas brushwork, dramatic warm torchlight rim lighting against deep obsidian and slate shadows, cinematic texture and depth.',
    'STRICT PROHIBITIONS: NO text, NO letters, NO names, NO card borders, NO frames, NO watermarks, NO UI overlays.',
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model: HERO_PORTRAIT_MODEL,
      contents: [
        {
          inlineData: {
            mimeType: faceImage.mimeType,
            data: faceImage.base64,
          },
        },
        { text: prompt },
      ],
      config: {
        imageConfig: {
          aspectRatio: '3:4',
          imageSize: '1K',
        },
      },
    });
    return extractImageFromResponse(response);
  } catch (err) {
    throw formatGeminiError(err, 'image');
  }
}

export interface MonsterPortraitInput {
  monster: MonsterRef;
  abilities: AbilityRef[];
  referenceImage?: ParsedImageData | null;
  extraPrompt?: string;
}

export async function generateMonsterPortrait(
  input: MonsterPortraitInput
): Promise<{ buffer: Buffer; mimeType: string }> {
  const provider = resolveImageProvider();

  if (provider === 'cloudflare') {
    const fluxPrompt = await buildMonsterFluxPrompt(input);
    return generateImageWithCloudflareFlux(fluxPrompt);
  }

  const ai = getGenAiClient();
  const { monster, abilities, referenceImage, extraPrompt } = input;

  const statsSummary = abilities
    .map((ab) => `${ab.name}: ${monster.abilities?.[ab.id] ?? 10}`)
    .join(', ');

  const traitsSummary =
    monster.traits && monster.traits.length > 0
      ? monster.traits
          .map((t) => `${t.name}${t.description ? ` — ${t.description}` : ''}`)
          .join('; ')
      : '';

  const actionsSummary =
    monster.actions && monster.actions.length > 0
      ? monster.actions
          .map((a) => `${a.name}${a.description ? ` — ${a.description}` : ''}`)
          .join('; ')
      : 'Нет особых действий';

  const promptLines = [
    'Create a dark fantasy Dungeons & Dragons bestiary collectible card portrait of the following creature/monster.',
    'ANATOMICAL ACCURACY (CRITICAL): Faithfully depict the exact creature named below. If it is a real animal/beast (such as a rat, wolf, spider, bear, or bat), paint that exact animal realistically in dark fantasy style — do NOT add horns, humanoid bodies, armor, or clothing.',
    `MONSTER DETAILS:`,
    `- Name: ${monster.name}`,
    `- Armor Class: ${monster.ac}, Hit Points: ${monster.maxHp}${monster.hpFormula ? ` (${monster.hpFormula})` : ''}, Speed: ${monster.speed} ft`,
    `- Abilities: ${statsSummary}`,
    ...(monster.senses ? [`- Senses: ${monster.senses}`] : []),
    ...(monster.resistances ? [`- Resistances: ${monster.resistances}`] : []),
    ...(monster.immunities ? [`- Immunities: ${monster.immunities}`] : []),
    ...(traitsSummary ? [`- Special Traits: ${traitsSummary}`] : []),
    `- Signature Actions: ${actionsSummary}`,
  ];

  if (extraPrompt && extraPrompt.trim()) {
    promptLines.push(`- Additional Visual Direction from DM: ${extraPrompt.trim()}`);
  }

  if (referenceImage) {
    promptLines.push(
      'REFERENCE IMAGE: Use the attached reference image as visual inspiration for the creature silhouette, anatomy, colors, or mood while elevating it into cohesive dark fantasy D&D painterly card art.'
    );
  }

  promptLines.push(
    'COMPOSITION (CRITICAL): Vertical 3:4 dramatic creature portrait. Frame the creature head, face, and eyes prominently in the UPPER 55% of the canvas so it is immediately recognizable even when only the top half of the card is visible.',
    'ART STYLE: Dark fantasy D&D painterly collectible card illustration, detailed oil-painting textures, moody subterranean or nocturnal atmosphere, dramatic chiaroscuro torchlight and rim highlights.',
    'STRICT PROHIBITIONS: NO text, NO numbers, NO stat blocks, NO card borders, NO frames, NO watermarks, NO UI elements.'
  );

  const prompt = promptLines.join('\n');

  try {
    const contents = referenceImage
      ? [
          {
            inlineData: {
              mimeType: referenceImage.mimeType,
              data: referenceImage.base64,
            },
          },
          { text: prompt },
        ]
      : prompt;

    const response = await ai.models.generateContent({
      model: MONSTER_PORTRAIT_MODEL,
      contents,
      config: {
        imageConfig: {
          aspectRatio: '3:4',
        },
      },
    });
    return extractImageFromResponse(response);
  } catch (err) {
    throw formatGeminiError(err, 'image');
  }
}
