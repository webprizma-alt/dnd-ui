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
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
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
      'API-ключ Gemini не настроен на сервере (GEMINI_API_KEY). Укажите бесплатный ключ AIza... из Google AI Studio в .env сервера.'
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

async function generateImageWithCloudflareFlux(
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!accountId || !apiToken) {
    throw new Error(
      'Не настроены CLOUDFLARE_ACCOUNT_ID и CLOUDFLARE_API_TOKEN в .env сервера для генерации через Cloudflare Workers AI.'
    );
  }

  const cleanPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 2000);
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

async function buildHeroFluxPromptWithGeminiVision(
  input: HeroPortraitInput
): Promise<string> {
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

  const instruction = [
    'You are an expert prompt engineer for FLUX image generation.',
    'Carefully inspect the attached photo of a real person and write ONE single vivid English image-generation prompt (max 150 words) turning this exact person into a dark fantasy Dungeons & Dragons collectible card portrait.',
    'MUST INCLUDE:',
    '1. Precise physical likeness from the photo: apparent gender, approximate age, face shape, skin tone, eye color/shape, eyebrows, nose, mouth/expression, hair color, hairstyle, facial hair (beard/stubble/mustache if any), and glasses if worn.',
    `2. Character transformation into D&D Species: ${speciesLine}; Class: ${classLine}; Background: ${bgLine}. Translate any Russian D&D terms into authentic English dark-fantasy armor, robes, subtle racial traits, and class props.`,
    '3. Composition: vertical chest-up bust portrait, head and face centered prominently in the UPPER HALF of the frame, looking heroically toward the viewer, atmospheric dark dungeon/tavern background.',
    '4. Art style: painterly dark fantasy D&D trading card oil illustration, rich brushwork, warm torchlight rim lighting against deep obsidian shadows, cinematic detail.',
    '5. End with: no text, no letters, no watermark, no card border, no frame.',
    'OUTPUT RULES: Return ONLY the raw English prompt text. No markdown, no quotes, no commentary.',
  ].join('\n');

  try {
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
    const text = (response.text || '').replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!text) {
      throw new Error('Gemini Flash Lite не вернул описание портрета.');
    }
    return text;
  } catch (err) {
    throw formatGeminiError(err, 'vision');
  }
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

  // If GEMINI_API_KEY is available, use free-tier Gemini 3.1 Flash Lite to translate Russian stats
  // (and analyze optional reference image!) into a rich English FLUX prompt.
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const ai = getGenAiClient();
      const instructionLines = [
        'You are an expert prompt engineer for FLUX dark fantasy creature art.',
        'Convert the following Dungeons & Dragons monster stat block (which may be in Russian) into ONE vivid English image-generation prompt (max 140 words).',
        `Monster name: ${monster.name}`,
        `AC: ${monster.ac}, HP: ${monster.maxHp}, Speed: ${monster.speed} ft`,
        `Abilities: ${statsSummary}`,
        ...(monster.senses ? [`Senses: ${monster.senses}`] : []),
        ...(monster.resistances ? [`Resistances: ${monster.resistances}`] : []),
        ...(monster.immunities ? [`Immunities: ${monster.immunities}`] : []),
        ...(traitsSummary ? [`Traits: ${traitsSummary}`] : []),
        ...(actionsSummary ? [`Actions: ${actionsSummary}`] : []),
        ...(extraPrompt?.trim() ? [`DM visual direction: ${extraPrompt.trim()}`] : []),
        ...(referenceImage
          ? [
              'An attached reference image is provided: closely describe its creature silhouette, anatomy, colors, textures, and menacing features so FLUX recreates that look in dark fantasy D&D painterly card art.',
            ]
          : []),
        'COMPOSITION: dramatic close-up creature bust portrait with head, glowing or fierce eyes, jaws/horns/weaponry framed prominently in the UPPER HALF of the frame.',
        'STYLE: dark fantasy Dungeons & Dragons bestiary oil painting illustration, gritty textures, dramatic warm torchlight rim lighting against deep obsidian subterranean shadows, no text, no numbers, no card borders, no watermark.',
        'OUTPUT RULES: Return ONLY the raw English prompt text. No markdown, no quotes, no commentary.',
      ];

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
      parts.push({ text: instructionLines.join('\n') });

      const response = await ai.models.generateContent({
        model: VISION_PROMPT_MODEL,
        contents: { parts },
      });
      const text = (response.text || '').replace(/^["'`]+|["'`]+$/g, '').trim();
      if (text) return text;
    } catch (err) {
      // Log and fall back to direct structured prompt so monsters still generate via Cloudflare FLUX
      console.warn('[portraitGenerator][monster-prompt-fallback]', err);
    }
  }

  return [
    `Dark fantasy Dungeons & Dragons bestiary oil-painting portrait of a terrifying ${monster.name}.`,
    traitsSummary ? `Notable traits: ${traitsSummary}.` : '',
    actionsSummary ? `Signature attacks: ${actionsSummary}.` : '',
    monster.senses ? `Senses: ${monster.senses}.` : '',
    extraPrompt?.trim() ? `Visual details: ${extraPrompt.trim()}.` : '',
    'Dramatic creature bust portrait with head, eyes, and upper torso prominently in the upper half of the frame, moody subterranean shadows, warm torchlight rim lighting, gritty painterly brushwork, no text, no borders, no watermark.',
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
    const fluxPrompt = await buildHeroFluxPromptWithGeminiVision(input);
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
    'COMPOSITION (CRITICAL): Vertical 3:4 dramatic creature portrait. Frame the monster head, eyes, fangs/horns, and upper torso prominently in the UPPER 55% of the canvas so the creature is immediately recognizable even when only the top half of the card is visible.',
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
