/**
 * Accessibility utilities for color contrast validation and WCAG compliance
 * Implements WCAG 2.1 AA standards for contrast ratios
 */

export interface ContrastResult {
  ratio: number;
  isCompliant: boolean;
  level: 'AA' | 'AAA' | 'fail';
  requiredRatio: number;
}

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert HSL color string to RGB values
 * @param hsl HSL color string in format "h s% l%" (e.g., "348 83% 47%")
 * @returns RGB color object
 */
export function hslToRgb(hsl: string): ColorRGB {
  // Parse HSL string format "h s% l%"
  const matches = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!matches) {
    throw new Error(`Invalid HSL format: ${hsl}. Expected format: "h s% l%"`);
  }

  const h = parseFloat(matches[1]) / 360;
  const s = parseFloat(matches[2]) / 100;
  const l = parseFloat(matches[3]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Calculate relative luminance of a color according to WCAG guidelines
 * @param rgb RGB color object
 * @returns Relative luminance value (0-1)
 */
export function getRelativeLuminance(rgb: ColorRGB): number {
  const { r, g, b } = rgb;

  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color in HSL format
 * @param color2 Second color in HSL format
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hslToRgb(color1);
  const rgb2 = hslToRgb(color2);

  const luminance1 = getRelativeLuminance(rgb1);
  const luminance2 = getRelativeLuminance(rgb2);

  // Ensure lighter color is in numerator
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG 2.1 AA standards
 * @param foreground Foreground color in HSL format
 * @param background Background color in HSL format
 * @param isLargeText Whether the text is considered large (18pt+ or 14pt+ bold)
 * @returns Contrast validation result
 */
export function validateContrastRatio(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  const aaRequiredRatio = isLargeText ? 4.5 : 7.0;

  let level: 'AA' | 'AAA' | 'fail';
  let isCompliant: boolean;

  if (ratio >= aaRequiredRatio) {
    level = 'AAA';
    isCompliant = true;
  } else if (ratio >= requiredRatio) {
    level = 'AA';
    isCompliant = true;
  } else {
    level = 'fail';
    isCompliant = false;
  }

  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    isCompliant,
    level,
    requiredRatio
  };
}

/**
 * Dark theme color definitions for validation
 */
export const DARK_THEME_COLORS = {
  background: '0 0% 7%',
  foreground: '0 0% 95%',
  card: '0 0% 9%',
  cardForeground: '0 0% 95%',
  popover: '0 0% 9%',
  popoverForeground: '0 0% 95%',
  primary: '348 83% 47%',
  primaryForeground: '0 0% 98%',
  secondary: '0 0% 14%',
  secondaryForeground: '0 0% 95%',
  muted: '0 0% 14%',
  mutedForeground: '0 0% 65%',
  accent: '0 0% 14%',
  accentForeground: '0 0% 95%',
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '0 0% 98%',
  border: '0 0% 18%',
  input: '0 0% 14%',
  ring: '348 83% 47%'
} as const;

/**
 * Validate all dark theme color combinations for WCAG compliance
 * @returns Array of validation results for all color combinations
 */
export function validateDarkThemeCompliance(): Array<{
  combination: string;
  result: ContrastResult;
  isTextCombination: boolean;
}> {
  const results: Array<{
    combination: string;
    result: ContrastResult;
    isTextCombination: boolean;
  }> = [];

  // Text on background combinations
  const textCombinations = [
    { name: 'foreground on background', fg: DARK_THEME_COLORS.foreground, bg: DARK_THEME_COLORS.background },
    { name: 'card-foreground on card', fg: DARK_THEME_COLORS.cardForeground, bg: DARK_THEME_COLORS.card },
    { name: 'popover-foreground on popover', fg: DARK_THEME_COLORS.popoverForeground, bg: DARK_THEME_COLORS.popover },
    { name: 'primary-foreground on primary', fg: DARK_THEME_COLORS.primaryForeground, bg: DARK_THEME_COLORS.primary },
    { name: 'secondary-foreground on secondary', fg: DARK_THEME_COLORS.secondaryForeground, bg: DARK_THEME_COLORS.secondary },
    { name: 'muted-foreground on muted', fg: DARK_THEME_COLORS.mutedForeground, bg: DARK_THEME_COLORS.muted },
    { name: 'muted-foreground on background', fg: DARK_THEME_COLORS.mutedForeground, bg: DARK_THEME_COLORS.background },
    { name: 'accent-foreground on accent', fg: DARK_THEME_COLORS.accentForeground, bg: DARK_THEME_COLORS.accent },
    { name: 'destructive-foreground on destructive', fg: DARK_THEME_COLORS.destructiveForeground, bg: DARK_THEME_COLORS.destructive }
  ];

  // Validate text combinations
  textCombinations.forEach(({ name, fg, bg }) => {
    const result = validateContrastRatio(fg, bg, false);
    results.push({
      combination: name,
      result,
      isTextCombination: true
    });
  });

  return results;
}

/**
 * Get CSS custom property value from the document
 * @param propertyName CSS custom property name (without --)
 * @returns Property value or null if not found
 */
export function getCSSCustomProperty(propertyName: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${propertyName}`)
    .trim();

  return value || null;
}

/**
 * Validate contrast ratio for a specific CSS custom property combination
 * @param foregroundProperty CSS custom property name for foreground color
 * @param backgroundProperty CSS custom property name for background color
 * @param isLargeText Whether the text is considered large
 * @returns Contrast validation result or null if properties not found
 */
export function validateCSSPropertyContrast(
  foregroundProperty: string,
  backgroundProperty: string,
  isLargeText: boolean = false
): ContrastResult | null {
  const foregroundValue = getCSSCustomProperty(foregroundProperty);
  const backgroundValue = getCSSCustomProperty(backgroundProperty);

  if (!foregroundValue || !backgroundValue) {
    return null;
  }

  return validateContrastRatio(foregroundValue, backgroundValue, isLargeText);
}

/**
 * Validate all current CSS custom properties for dark theme compliance
 * @returns Array of validation results for current CSS properties
 */
export function validateCurrentThemeCompliance(): Array<{
  combination: string;
  result: ContrastResult | null;
  isTextCombination: boolean;
}> {
  const combinations = [
    { name: 'foreground on background', fg: 'foreground', bg: 'background' },
    { name: 'card-foreground on card', fg: 'card-foreground', bg: 'card' },
    { name: 'popover-foreground on popover', fg: 'popover-foreground', bg: 'popover' },
    { name: 'primary-foreground on primary', fg: 'primary-foreground', bg: 'primary' },
    { name: 'secondary-foreground on secondary', fg: 'secondary-foreground', bg: 'secondary' },
    { name: 'muted-foreground on muted', fg: 'muted-foreground', bg: 'muted' },
    { name: 'muted-foreground on background', fg: 'muted-foreground', bg: 'background' },
    { name: 'accent-foreground on accent', fg: 'accent-foreground', bg: 'accent' },
    { name: 'destructive-foreground on destructive', fg: 'destructive-foreground', bg: 'destructive' }
  ];

  return combinations.map(({ name, fg, bg }) => ({
    combination: name,
    result: validateCSSPropertyContrast(fg, bg, false),
    isTextCombination: true
  }));
}