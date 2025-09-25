'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Agent } from '../../hooks/useMeetingSocket';

interface PersonalityAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
  showPersonalityGlow?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'w-6 h-6',
    text: 'text-xs',
    tooltip: 'text-xs',
    border: 'border-2'
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    tooltip: 'text-sm',
    border: 'border-2'
  },
  lg: {
    container: 'w-16 h-16',
    text: 'text-lg',
    tooltip: 'text-sm',
    border: 'border-4'
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-xl',
    tooltip: 'text-sm',
    border: 'border-4'
  }
};

export default function PersonalityAvatar({
  agent,
  size = 'md',
  showTooltip = false,
  className,
  onClick,
  showPersonalityGlow = true
}: PersonalityAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sizeStyles = sizeConfig[size];

  // Reset image error when agent changes
  useEffect(() => {
    setImageError(false);
  }, [agent.persona.avatarUrl]);

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get personality-based styling
  const getPersonalityGlow = () => {
    if (!showPersonalityGlow) return '';
    
    const traits = agent.persona.personalityTraits as any;
    if (!traits) return '';

    // Create glow based on personality traits
    let glowIntensity = 'shadow-md';
    
    if (traits.enthusiasm > 0.8) {
      glowIntensity = 'shadow-lg shadow-current';
    } else if (traits.enthusiasm < 0.3) {
      glowIntensity = 'shadow-sm';
    }

    return glowIntensity;
  };

  // Get role-based gradient
  const getRoleGradient = () => {
    const role = agent.persona.role.toLowerCase();
    
    const gradients: { [key: string]: string } = {
      ceo: 'from-purple-500 to-pink-500',
      cto: 'from-blue-500 to-cyan-500', 
      pm: 'from-green-500 to-blue-500',
      growth: 'from-orange-500 to-yellow-500',
      research: 'from-pink-500 to-red-500',
      data: 'from-cyan-500 to-blue-500',
      strategy: 'from-red-500 to-orange-500',
      devops: 'from-green-500 to-lime-500'
    };

    return gradients[role] || 'from-gray-500 to-gray-600';
  };

  const avatarVariants = {
    idle: {
      scale: 1,
      rotate: 0,
      transition: { duration: 0.2 }
    },
    hover: {
      scale: 1.05,
      rotate: [0, -2, 2, 0],
      transition: { 
        scale: { duration: 0.2 },
        rotate: { duration: 0.5, repeat: Infinity }
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  const glowVariants = {
    idle: {
      opacity: 0,
      scale: 1,
    },
    hover: {
      opacity: 0.3,
      scale: 1.2,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <motion.div
        className={cn(
          'relative rounded-full flex items-center justify-center font-bold text-white cursor-pointer overflow-hidden transition-all duration-300',
          sizeStyles.container,
          sizeStyles.border,
          sizeStyles.text,
          getPersonalityGlow()
        )}
        style={{ 
          backgroundColor: agent.persona.colorHex,
          borderColor: agent.persona.colorHex
        }}
        variants={avatarVariants}
        animate={isHovered ? 'hover' : 'idle'}
        whileTap={onClick ? 'tap' : undefined}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Background gradient for personality */}
        <div className={cn(
          'absolute inset-0 rounded-full opacity-20 bg-gradient-to-br',
          getRoleGradient()
        )} />
        
        {/* Personality glow effect */}
        {showPersonalityGlow && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full bg-gradient-to-br',
              getRoleGradient()
            )}
            variants={glowVariants}
            animate={isHovered ? 'hover' : 'idle'}
          />
        )}
        
        {/* Avatar Image or Initials */}
        <div className="relative z-10">
          {agent.persona.avatarUrl && !imageError ? (
            <img
              src={agent.persona.avatarUrl}
              alt={`${agent.persona.name} avatar`}
              className={cn('rounded-full object-cover', sizeStyles.container)}
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="select-none">
              {getInitials(agent.persona.name)}
            </span>
          )}
        </div>
        
        {/* Personality sparkle effect for high enthusiasm */}
        {agent.persona.personalityTraits && 
         (agent.persona.personalityTraits as any).enthusiasm > 0.8 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 4, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <div className="relative w-full h-full">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-70"
                  style={{
                    left: '50%',
                    top: '10%',
                    transformOrigin: '0 200%',
                    transform: `rotate(${i * 120}deg)`
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.5
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className={cn(
              'bg-black/90 backdrop-blur-sm text-white rounded-lg px-3 py-2 whitespace-nowrap shadow-lg border border-white/10',
              sizeStyles.tooltip
            )}>
              <div className="font-semibold">{agent.persona.name}</div>
              <div className="text-xs opacity-80">{agent.persona.title}</div>
              <div className="text-xs opacity-60">{agent.persona.department}</div>
              
              {/* Personality preview */}
              {agent.persona.personalityTraits && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <div className="text-xs opacity-60 mb-1">Personality</div>
                  <div className="flex space-x-2 text-xs">
                    {Object.entries(agent.persona.personalityTraits)
                      .slice(0, 2)
                      .map(([trait, value]) => (
                        <span key={trait} className="opacity-80">
                          {trait}: {Math.round((value as number) * 100)}%
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
              
              {/* Speaking style preview */}
              {agent.persona.speakingStyle && (
                <div className="mt-1 text-xs opacity-60 italic max-w-48 truncate">
                  "{agent.persona.speakingStyle}"
                </div>
              )}
            </div>
            
            {/* Tooltip arrow */}
            <div className="w-2 h-2 bg-black/90 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-r border-b border-white/10"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}