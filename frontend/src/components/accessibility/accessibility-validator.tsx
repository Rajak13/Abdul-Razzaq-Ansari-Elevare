/**
 * Development component for displaying accessibility validation results
 * Only renders in development mode to help developers ensure WCAG compliance
 */

'use client';

import { useState } from 'react';
import { useAccessibilityValidation, useAccessibilityDebug } from '@/hooks/use-accessibility-validation';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Accessibility validation panel for development
 * Shows real-time WCAG compliance status for the current theme
 */
export function AccessibilityValidator() {
  const { theme } = useTheme();
  const validationState = useAccessibilityValidation();
  const { logResults, isEnabled } = useAccessibilityDebug();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only render in development mode
  if (!isEnabled || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'AAA': return 'default';
      case 'AA': return 'secondary';
      case 'fail': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Accessibility Validation
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {theme}
              </Badge>
              <div className={`w-3 h-3 rounded-full ${getComplianceColor(validationState.complianceScore)}`} />
              <span className="text-xs font-mono">
                {validationState.complianceScore}%
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {validationState.isValidating && (
              <div className="text-xs text-muted-foreground">
                Validating theme compliance...
              </div>
            )}
            
            {validationState.hasFailures && (
              <div className="text-xs text-destructive">
                 {validationState.failedCombinations.length} compliance issues found
              </div>
            )}
            
            {!validationState.hasFailures && !validationState.isValidating && (
              <div className="text-xs text-green-600 dark:text-green-400">
                 All color combinations are WCAG compliant
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={logResults}
                className="text-xs h-7"
              >
                Log Results
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs h-7"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
                Details
              </Button>
            </div>

            {isExpanded && (
              <div className="mt-2">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {validationState.results
                    .filter(r => r.result !== null)
                    .map(({ combination, result }) => (
                      <div
                        key={combination}
                        className="flex items-center justify-between text-xs p-1 rounded bg-muted/50"
                      >
                        <span className="truncate flex-1 mr-2">
                          {combination}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={getLevelBadgeVariant(result!.level)}
                            className="text-xs px-1 py-0"
                          >
                            {result!.level}
                          </Badge>
                          <span className="font-mono">
                            {result!.ratio}:1
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Simple accessibility status indicator
 * Shows just the compliance score without detailed results
 */
export function AccessibilityStatusIndicator() {
  const validationState = useAccessibilityValidation();
  const { isEnabled } = useAccessibilityDebug();

  // Only render in development mode
  if (!isEnabled || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getStatusColor = (score: number, hasFailures: boolean) => {
    if (hasFailures) return 'text-red-500';
    if (score >= 95) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-background/80 backdrop-blur-sm border rounded-md px-2 py-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">A11y:</span>
          <span className={getStatusColor(validationState.complianceScore, validationState.hasFailures)}>
            {validationState.complianceScore}%
          </span>
          {validationState.isValidating && (
            <span className="text-muted-foreground">...</span>
          )}
        </div>
      </div>
    </div>
  );
}