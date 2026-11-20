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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface ParsedImageData {
  mimeType: string;
  base64: string;
  ext: string;
  buffer: Buffer;
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
  const ext = extMap[mimeType.toLowerCase()] || 'png';
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
      'API-ключ Gemini не настроен на сервере (GEMINI_API_KEY). Укажите ключ в Settings > Secrets или в файле .env сервера.'
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

function formatGeminiError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err ?? 'Неизвестная ошибка');
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return new Error(
      'Неверный или неподтверждённый Gemini API-ключ. Проверьте ключ в Settings > Secrets или в .env.'
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new Error(
      'Превышена квота или требуется платный API-ключ Gemini для моделей Nano Banana. Проверьте биллинг и ключ в Settings > Secrets.'
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new Error('Выбранная модель генерации временно недоступна для текущего API-ключа.');
  }
  if (lower.includes('safety') || lower.includes('blocked')) {
    return new Error(
      'ИИ отклонил генерацию по фильтру безопасности. Попробуйте другое фото или формулировку.'
    );
  }
  return new Error(`Не удалось сгенерировать портрет: ${raw}`);
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
      const mimeType = part.inlineData.mimeType || 'image/png';
      return {
        buffer: Buffer.from(part.inlineData.data, 'base64'),
        mimeType,
      };
    }
  }
  throw new Error('Модель не вернула изображение. Попробуйте повторить генерацию ещё раз.');
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
    throw formatGeminiError(err);
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
  const ai = getGenAiClient();
  const { monster, abilities, referenceImage, extraPrompt } = input;

  const statsSummary = abilities
    .map((ab) => `${ab.name}: ${monster.abilities?.[ab.id] ?? 10}`)
    .join(', ');

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
    `- Signature Actions & Traits: ${actionsSummary}`,
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
    throw formatGeminiError(err);
  }
}
