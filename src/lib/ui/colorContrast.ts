type RGB = { r: number; g: number; b: number };

const DEFAULT_ACCENT = '#4a90d9';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeHexColor = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map((c) => `${c}${c}`).join('')
    : match[1];
  return `#${hex.toLowerCase()}`;
};

const hexToRgb = (hex: string): RGB => {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_ACCENT;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const mixColors = (baseHex: string, mixHex: string, mixRatio: number): string => {
  const ratio = clamp(mixRatio, 0, 1);
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  return rgbToHex({
    r: base.r * (1 - ratio) + mix.r * ratio,
    g: base.g * (1 - ratio) + mix.g * ratio,
    b: base.b * (1 - ratio) + mix.b * ratio,
  });
};

const srgbToLinear = (channel: number): number => {
  const s = clamp(channel, 0, 255) / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const contrastRatio = (foregroundHex: string, backgroundHex: string): number => {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const pickReadableColor = (
  backgroundHex: string,
  preferredColor: string | null | undefined,
  candidates: string[],
  minRatio = 4.5
): string => {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (value: string | null | undefined) => {
    const normalized = normalizeHexColor(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  pushCandidate(preferredColor);
  for (const candidate of candidates) {
    pushCandidate(candidate);
  }

  for (const candidate of ordered) {
    if (contrastRatio(candidate, backgroundHex) >= minRatio) {
      return candidate;
    }
  }

  let bestColor = '#111827';
  let bestRatio = contrastRatio(bestColor, backgroundHex);
  for (const candidate of ordered) {
    const ratio = contrastRatio(candidate, backgroundHex);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
  }
  return bestColor;
};

export const getReadableTextColor = (
  backgroundHex: string,
  preferredHex?: string,
  minRatio = 4.5,
  candidates: string[] = ['#1f2937', '#0f172a', '#111827', '#f8fafc', '#ffffff']
): string => {
  const bg = normalizeHexColor(backgroundHex) ?? '#ffffff';
  return pickReadableColor(bg, preferredHex, candidates, minRatio);
};

export const getContrastRatio = (foregroundHex: string, backgroundHex: string): number => {
  const foreground = normalizeHexColor(foregroundHex) ?? '#0f172a';
  const background = normalizeHexColor(backgroundHex) ?? '#ffffff';
  return contrastRatio(foreground, background);
};

export interface LessonPalette {
  accent: string;
  border: string;
  cardBackground: string;
  cardTitle: string;
  cardSecondary: string;
  detailBackground: string;
  detailTitle: string;
  detailSecondary: string;
}

export const buildLessonPalette = (accentColor: string | null | undefined): LessonPalette => {
  const accent = normalizeHexColor(accentColor) ?? DEFAULT_ACCENT;
  const cardBackground = mixColors(accent, '#ffffff', 0.84);
  const detailBackground = mixColors(accent, '#ffffff', 0.9);
  const border = mixColors(accent, '#0f172a', 0.12);
  const preferredTitle = mixColors(accent, '#0f172a', 0.58);
  const preferredSecondary = mixColors(accent, '#334155', 0.45);

  return {
    accent,
    border,
    cardBackground,
    cardTitle: getReadableTextColor(cardBackground, preferredTitle, 4.5, [
      '#1f2937',
      '#0f172a',
      '#111827',
      '#f8fafc',
      '#ffffff',
    ]),
    cardSecondary: getReadableTextColor(cardBackground, preferredSecondary, 4.5, [
      '#334155',
      '#1f2937',
      '#0f172a',
      '#f8fafc',
      '#ffffff',
    ]),
    detailBackground,
    detailTitle: getReadableTextColor(detailBackground, preferredTitle, 4.5, [
      '#1f2937',
      '#0f172a',
      '#111827',
      '#f8fafc',
      '#ffffff',
    ]),
    detailSecondary: getReadableTextColor(detailBackground, preferredSecondary, 4.5, [
      '#334155',
      '#1f2937',
      '#0f172a',
      '#f8fafc',
      '#ffffff',
    ]),
  };
};
