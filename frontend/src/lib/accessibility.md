# Accessibility Validation System

This system provides comprehensive WCAG 2.1 AA compliance validation for the dark theme and other color schemes in the Elevare application.

## Features

- **Contrast Ratio Calculation**: Programmatic calculation of color contrast ratios according to WCAG guidelines
- **WCAG Compliance Validation**: Automatic validation against WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- **Dark Theme Validation**: Specific validation for the Nepal-inspired dark theme color scheme
- **Real-time Validation**: Hooks for validating current CSS custom properties in the browser
- **Development Tools**: Visual validation components for development environments

## Core Functions

### `calculateContrastRatio(color1, color2)`
Calculates the contrast ratio between two HSL colors.

```typescript
import { calculateContrastRatio } from '@/lib/accessibility';

const ratio = calculateContrastRatio('0 0% 95%', '0 0% 7%');
console.log(ratio); // ~15.2
```

### `validateContrastRatio(foreground, background, isLargeText)`
Validates if a color combination meets WCAG standards.

```typescript
import { validateContrastRatio } from '@/lib/accessibility';

const result = validateContrastRatio('0 0% 95%', '0 0% 7%', false);
console.log(result);
// {
//   ratio: 15.2,
//   isCompliant: true,
//   level: 'AAA',
//   requiredRatio: 4.5
// }
```

### `validateDarkThemeCompliance()`
Validates all dark theme color combinations.

```typescript
import { validateDarkThemeCompliance } from '@/lib/accessibility';

const results = validateDarkThemeCompliance();
results.forEach(({ combination, result }) => {
  console.log(`${combination}: ${result.ratio}:1 (${result.level})`);
});
```

## React Hooks

### `useAccessibilityValidation()`
Provides real-time accessibility validation for the current theme.

```typescript
import { useAccessibilityValidation } from '@/hooks/use-accessibility-validation';

function MyComponent() {
  const validation = useAccessibilityValidation();
  
  if (validation.hasFailures) {
    console.warn(`${validation.failedCombinations.length} accessibility issues found`);
  }
  
  return <div>Compliance Score: {validation.complianceScore}%</div>;
}
```

### `useContrastValidation(foregroundProperty, backgroundProperty, isLargeText)`
Validates contrast for specific CSS custom properties.

```typescript
import { useContrastValidation } from '@/hooks/use-accessibility-validation';

function MyComponent() {
  const result = useContrastValidation('foreground', 'background', false);
  
  return (
    <div>
      {result && (
        <span>Contrast: {result.ratio}:1 ({result.level})</span>
      )}
    </div>
  );
}
```

## Development Components

### `AccessibilityValidator`
Visual component showing real-time accessibility validation (development only).

```typescript
import { AccessibilityValidator } from '@/components/accessibility';

function App() {
  return (
    <div>
      {/* Your app content */}
      <AccessibilityValidator />
    </div>
  );
}
```

### `AccessibilityStatusIndicator`
Minimal status indicator for accessibility compliance (development only).

```typescript
import { AccessibilityStatusIndicator } from '@/components/accessibility';

function App() {
  return (
    <div>
      {/* Your app content */}
      <AccessibilityStatusIndicator />
    </div>
  );
}
```

## Color Format

All colors should be provided in HSL format as strings: `"h s% l%"`

Examples:
- Deep black: `"0 0% 7%"`
- Crisp white: `"0 0% 95%"`
- Nepal crimson: `"348 83% 47%"`

## WCAG Standards

The system validates against WCAG 2.1 AA standards:

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio
- **AAA level**: 7:1 for normal text, 4.5:1 for large text

## Dark Theme Colors

The system includes predefined dark theme colors:

```typescript
export const DARK_THEME_COLORS = {
  background: '0 0% 7%',        // Deep black
  foreground: '0 0% 95%',       // Crisp white
  primary: '348 83% 47%',       // Nepal crimson
  // ... additional colors
};
```

## Testing

The system includes comprehensive tests:

- Unit tests for color conversion and contrast calculation
- Property-based tests for universal properties
- Integration tests for React hooks
- Error handling and edge case validation

Run tests with:
```bash
npm test -- --testPathPattern=accessibility
```

## Usage in Development

1. Import and use the validation hooks in your components
2. Add the `AccessibilityValidator` component to your app during development
3. Check the browser console for detailed validation results
4. Use the validation results to ensure WCAG compliance

The system automatically validates the current theme and provides real-time feedback on accessibility compliance, helping developers maintain excellent accessibility standards throughout the application.