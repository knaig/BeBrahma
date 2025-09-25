'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Star, ThumbsUp, Heart, Smile, Zap } from 'lucide-react';

// Rating types
export type RatingType = 'star' | 'emoji' | 'numeric' | 'thumbs' | 'heart' | 'custom';

// Rating component props
export interface RatingComponentProps {
  value: number;
  onChange: (rating: number) => void;
  type?: RatingType;
  max?: number;
  min?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  disabled?: boolean;
  readonly?: boolean;
  showValue?: boolean;
  showLabels?: boolean;
  labels?: string[];
  className?: string;
  onHover?: (rating: number) => void;
  onLeave?: () => void;
  allowHalf?: boolean;
  animated?: boolean;
  customIcons?: React.ReactNode[];
  customColors?: string[];
}

// Rating component
export const RatingComponent: React.FC<RatingComponentProps> = ({
  value,
  onChange,
  type = 'star',
  max = 5,
  min = 1,
  step = 1,
  size = 'md',
  color = 'yellow',
  disabled = false,
  readonly = false,
  showValue = false,
  showLabels = false,
  labels = [],
  className = '',
  onHover,
  onLeave,
  allowHalf = false,
  animated = true,
  customIcons = [],
  customColors = [],
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Color classes
  const colorClasses = {
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    gray: 'text-gray-400',
  };

  // Get current color
  const getCurrentColor = (index: number) => {
    if (customColors.length > 0) {
      return customColors[index % customColors.length];
    }
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.yellow;
  };

  // Get icon for rating type
  const getIcon = (index: number) => {
    if (customIcons.length > 0) {
      return customIcons[index % customIcons.length];
    }

    switch (type) {
      case 'star':
        return <Star className={sizeClasses[size]} />;
      case 'thumbs':
        return <ThumbsUp className={sizeClasses[size]} />;
      case 'heart':
        return <Heart className={sizeClasses[size]} />;
      case 'emoji':
        return <Smile className={sizeClasses[size]} />;
      case 'zap':
        return <Zap className={sizeClasses[size]} />;
      default:
        return <Star className={sizeClasses[size]} />;
    }
  };

  // Handle rating change
  const handleRatingChange = (rating: number) => {
    if (disabled || readonly) return;
    
    // Ensure rating is within bounds
    const clampedRating = Math.max(min, Math.min(max, rating));
    
    // Apply step
    const steppedRating = Math.round(clampedRating / step) * step;
    
    onChange(steppedRating);
  };

  // Handle hover
  const handleHover = (rating: number) => {
    if (disabled || readonly) return;
    
    setHoveredRating(rating);
    setIsHovering(true);
    onHover?.(rating);
  };

  // Handle leave
  const handleLeave = () => {
    if (disabled || readonly) return;
    
    setHoveredRating(null);
    setIsHovering(false);
    onLeave?.();
  };

  // Get display rating (hovered or actual)
  const getDisplayRating = () => {
    return isHovering && hoveredRating !== null ? hoveredRating : value;
  };

  // Check if rating should be filled
  const isFilled = (index: number) => {
    const displayRating = getDisplayRating();
    
    if (allowHalf) {
      const halfStep = step / 2;
      return index <= displayRating - halfStep;
    }
    
    return index <= displayRating;
  };

  // Check if rating should be half-filled
  const isHalfFilled = (index: number) => {
    if (!allowHalf) return false;
    
    const displayRating = getDisplayRating();
    const halfStep = step / 2;
    
    return index > displayRating - step && index <= displayRating - halfStep;
  };

  // Get label for rating
  const getLabel = (index: number) => {
    if (labels.length > 0 && index < labels.length) {
      return labels[index];
    }
    
    // Default labels
    const defaultLabels = {
      star: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
      emoji: ['Terrible', 'Bad', 'Okay', 'Good', 'Great'],
      numeric: ['1', '2', '3', '4', '5'],
      thumbs: ['Dislike', 'Like'],
      heart: ['Hate', 'Dislike', 'Okay', 'Like', 'Love'],
    };
    
    const typeLabels = defaultLabels[type as keyof typeof defaultLabels] || defaultLabels.star;
    return typeLabels[index - 1] || `${index}`;
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (disabled || readonly) return;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        handleRatingChange(value + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        handleRatingChange(value - step);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleRatingChange(index);
        break;
    }
  };

  // Generate rating items
  const generateRatingItems = () => {
    const items = [];
    
    for (let i = min; i <= max; i += step) {
      const filled = isFilled(i);
      const halfFilled = isHalfFilled(i);
      const isActive = i <= getDisplayRating();
      
      items.push(
        <div
          key={i}
          className={`relative inline-block cursor-pointer transition-all duration-200 ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          } ${animated ? 'hover:scale-110' : ''}`}
          onClick={() => handleRatingChange(i)}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          onKeyDown={(e) => handleKeyDown(e, i)}
          tabIndex={disabled || readonly ? -1 : 0}
          role="button"
          aria-label={`Rate ${i} out of ${max}`}
          aria-pressed={isActive}
        >
          {/* Background icon (unfilled) */}
          <div className={`text-gray-300 ${filled ? 'opacity-0' : 'opacity-100'}`}>
            {getIcon(i)}
          </div>
          
          {/* Filled icon */}
          {filled && (
            <div className={`absolute inset-0 ${getCurrentColor(i)}`}>
              {getIcon(i)}
            </div>
          )}
          
          {/* Half-filled icon */}
          {halfFilled && (
            <div className={`absolute inset-0 ${getCurrentColor(i)} overflow-hidden`} style={{ width: '50%' }}>
              {getIcon(i)}
            </div>
          )}
          
          {/* Hover effect */}
          {isHovering && hoveredRating === i && !disabled && !readonly && (
            <div className={`absolute inset-0 ${getCurrentColor(i)} opacity-75 animate-pulse`}>
              {getIcon(i)}
            </div>
          )}
        </div>
      );
    }
    
    return items;
  };

  // Render numeric rating
  if (type === 'numeric') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-1">
          {generateRatingItems()}
        </div>
        {showValue && (
          <span className="text-sm font-medium text-gray-700">
            {value} / {max}
          </span>
        )}
        {showLabels && (
          <span className="text-sm text-gray-500">
            {getLabel(value)}
          </span>
        )}
      </div>
    );
  }

  // Render thumbs rating
  if (type === 'thumbs') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-1">
          {generateRatingItems()}
        </div>
        {showValue && (
          <span className="text-sm font-medium text-gray-700">
            {value === 1 ? 'Like' : 'Dislike'}
          </span>
        )}
      </div>
    );
  }

  // Render default rating
  return (
    <div
      ref={containerRef}
      className={`flex items-center space-x-1 ${className}`}
      onMouseLeave={handleLeave}
    >
      {generateRatingItems()}
      
      {/* Value display */}
      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value}
        </span>
      )}
      
      {/* Label display */}
      {showLabels && (
        <span className="ml-2 text-sm text-gray-500">
          {getLabel(value)}
        </span>
      )}
    </div>
  );
};

// Rating display component (readonly)
export const RatingDisplay: React.FC<Omit<RatingComponentProps, 'onChange' | 'onHover' | 'onLeave'> & {
  showAverage?: boolean;
  showCount?: boolean;
  average?: number;
  count?: number;
}> = ({ showAverage = false, showCount = false, average = 0, count = 0, ...props }) => {
  return (
    <div className="flex items-center space-x-2">
      <RatingComponent
        {...props}
        readonly={true}
        disabled={true}
      />
      
      {showAverage && (
        <span className="text-sm text-gray-600">
          {average.toFixed(1)}
        </span>
      )}
      
      {showCount && (
        <span className="text-sm text-gray-500">
          ({count} {count === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  );
};

// Rating input component with form integration
export const RatingInput: React.FC<RatingComponentProps & {
  name: string;
  error?: string;
  required?: boolean;
}> = ({ name, error, required = false, ...props }) => {
  return (
    <div className="space-y-2">
      <RatingComponent {...props} />
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      
      {required && props.value === 0 && (
        <p className="text-red-500 text-sm">Rating is required</p>
      )}
    </div>
  );
};

// Rating filter component
export const RatingFilter: React.FC<{
  selectedRating: number | null;
  onRatingSelect: (rating: number | null) => void;
  max?: number;
  showAll?: boolean;
  className?: string;
}> = ({ selectedRating, onRatingSelect, max = 5, showAll = true, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showAll && (
        <button
          onClick={() => onRatingSelect(null)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedRating === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
      )}
      
      {Array.from({ length: max }, (_, i) => i + 1).reverse().map((rating) => (
        <button
          key={rating}
          onClick={() => onRatingSelect(rating)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedRating === rating
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {rating}+
        </button>
      ))}
    </div>
  );
};

export default RatingComponent;
