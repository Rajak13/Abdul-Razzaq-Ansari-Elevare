/**
 * Hook for validating accessibility compliance of the current theme
 * Provides real-time contrast ratio validation and WCAG compliance checking
 */

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import {
  validateCurrentThemeCompliance,
  validateDarkThemeCompliance,
  type ContrastResult
} from '@/lib/accessibility';

export interface AccessibilityValidationResult {
  combination: string;
  result: ContrastResult | null;
  isTextCombination: boolean;
}

export interface AccessibilityValidationState {
  isValidating: boolean;
  results: AccessibilityValidationResult[];
  hasFailures: boolean;
  failedCombinations: AccessibilityValidationResult[];
  complianceScore: number; // Percentage of compliant combinations
}

/**
 * Hook to validate accessibility compliance of the current theme
 * @returns Accessibility validation state and utilities
 */
export function useAccessibilityValidation(): AccessibilityValidationState {
  const { theme } = useTheme();
  const [validationState, setValidationState] = useState<AccessibilityValidationState>({
    isValidating: false,
    results: [],
    hasFailures: false,
    failedCombinations: [],
    complianceScore: 100
  });

  useEffect(() => {
    const validateTheme = async () => {
      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        let results: AccessibilityValidationResult[];

        if (theme === 'dark') {
          // For dark theme, use both static validation and current CSS validation
          const staticResults = validateDarkThemeCompliance();
          const currentResults = validateCurrentThemeCompliance();
          
          // Prefer current CSS results when available, fall back to static
          results = currentResults.map((current, index) => {
            if (current.result !== null) {
              return current;
            }
            // Fall back to static validation if CSS properties not available
            return staticResults[index] || current;
          });
        } else {
          // For other themes, use current CSS validation
          results = validateCurrentThemeCompliance();
        }

        // Filter out null results and calculate compliance
        const validResults = results.filter(r => r.result !== null) as Array<{
          combination: string;
          result: ContrastResult;
          isTextCombination: boolean;
        }>;

        const failedCombinations = validResults.filter(r => !r.result.isCompliant);
        const complianceScore = validResults.length > 0 
          ? Math.round((validResults.length - failedCombinations.length) / validResults.length * 100)
          : 100;

        setValidationState({
          isValidating: false,
          results,
          hasFailures: failedCombinations.length > 0,
          failedCombinations,
          complianceScore
        });
      } catch (error) {
        console.warn('Accessibility validation failed:', error);
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
          results: [],
          hasFailures: false,
          failedCombinations: [],
          complianceScore: 100
        }));
      }
    };

    // Validate immediately
    validateTheme();

    // Re-validate when theme changes or when CSS might have loaded
    const timeoutId = setTimeout(validateTheme, 100);

    return () => clearTimeout(timeoutId);
  }, [theme]);

  return validationState;
}

/**
 * Hook to get accessibility validation results for development/debugging
 * Only runs in development mode to avoid performance impact in production
 */
export function useAccessibilityDebug(): {
  validationResults: AccessibilityValidationResult[];
  logResults: () => void;
  isEnabled: boolean;
} {
  const validationState = useAccessibilityValidation();
  const isEnabled = process.env.NODE_ENV === 'development';

  const logResults = () => {
    if (!isEnabled) return;

    console.group('🎨 Accessibility Validation Results');
    console.log(`Theme compliance score: ${validationState.complianceScore}%`);
    
    if (validationState.hasFailures) {
      console.group('❌ Failed Combinations');
      validationState.failedCombinations.forEach(({ combination, result }) => {
        if (result) {
          console.log(`${combination}: ${result.ratio}:1 (required: ${result.requiredRatio}:1)`);
        }
      });
      console.groupEnd();
    }

    console.group('✅ All Results');
    validationState.results.forEach(({ combination, result }) => {
      if (result) {
        const status = result.isCompliant ? '✅' : '❌';
        console.log(`${status} ${combination}: ${result.ratio}:1 (${result.level})`);
      }
    });
    console.groupEnd();
    
    console.groupEnd();
  };

  return {
    validationResults: validationState.results,
    logResults,
    isEnabled
  };
}

/**
 * Hook to validate a specific color combination
 * @param foregroundProperty CSS custom property name for foreground
 * @param backgroundProperty CSS custom property name for background
 * @param isLargeText Whether the text is large
 * @returns Validation result for the specific combination
 */
export function useContrastValidation(
  foregroundProperty: string,
  backgroundProperty: string,
  isLargeText: boolean = false
): ContrastResult | null {
  const [result, setResult] = useState<ContrastResult | null>(null);

  useEffect(() => {
    const validateContrast = () => {
      try {
        if (typeof document === 'undefined') return;

        const foregroundValue = getComputedStyle(document.documentElement)
          .getPropertyValue(`--${foregroundProperty}`)
          .trim();
        const backgroundValue = getComputedStyle(document.documentElement)
          .getPropertyValue(`--${backgroundProperty}`)
          .trim();

        if (!foregroundValue || !backgroundValue) {
          setResult(null);
          return;
        }

        // Import validation function dynamically to avoid SSR issues
        import('@/lib/accessibility').then(({ validateContrastRatio }) => {
          const validationResult = validateContrastRatio(
            foregroundValue,
            backgroundValue,
            isLargeText
          );
          setResult(validationResult);
        });
      } catch (error) {
        console.warn('Contrast validation failed:', error);
        setResult(null);
      }
    };

    validateContrast();
    
    // Re-validate after a short delay to ensure CSS has loaded
    const timeoutId = setTimeout(validateContrast, 100);

    return () => clearTimeout(timeoutId);
  }, [foregroundProperty, backgroundProperty, isLargeText]);

  return result;
}