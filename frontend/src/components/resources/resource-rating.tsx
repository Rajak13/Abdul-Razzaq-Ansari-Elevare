'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ResourceRatingProps {
  resourceId: string;
  currentRating?: number;
  averageRating?: number;
  ratingCount?: number;
  onRatingChange?: () => void;
}

export function ResourceRating({
  resourceId,
  currentRating = 0,
  averageRating = 0,
  ratingCount = 0,
  onRatingChange
}: ResourceRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRating = async (rating: number) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/resources/${resourceId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ rating })
      });

      if (!response.ok) {
        throw new Error('Failed to rate resource');
      }

      toast({
        title: 'Rating submitted',
        description: `You rated this resource ${rating} star${rating !== 1 ? 's' : ''}`
      });

      onRatingChange?.();
    } catch (error) {
      console.error('Rating error:', error);
      toast({
        title: 'Rating failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Interactive Rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => handleRating(star)}
            disabled={isSubmitting}
          >
            <Star
              className={`h-4 w-4 ${
                star <= (hoveredRating || currentRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </Button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {currentRating > 0 ? `Your rating: ${currentRating}` : 'Rate this resource'}
        </span>
      </div>

      {/* Average Rating Display */}
      {averageRating > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{averageRating.toFixed(1)}</span>
          </div>
          <span>({ratingCount} rating{ratingCount !== 1 ? 's' : ''})</span>
        </div>
      )}
    </div>
  );
}