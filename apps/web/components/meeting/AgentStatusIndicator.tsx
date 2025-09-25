'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export type AgentStatus = 'speaking' | 'thinking' | 'listening' | 'idle';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

const statusConfig = {
  speaking: {
    color: 'bg-red-500',
    borderColor: 'border-red-400',
    glowColor: 'shadow-red-400/50',
    label: 'Speaking',
    description: 'Agent is currently speaking'
  },
  thinking: {
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-400', 
    glowColor: 'shadow-yellow-400/50',
    label: 'Thinking',
    description: 'Agent is processing information'
  },
  listening: {
    color: 'bg-green-500',
    borderColor: 'border-green-400',
    glowColor: 'shadow-green-400/50',
    label: 'Listening',
    description: 'Agent is actively listening'
  },
  idle: {
    color: 'bg-gray-500',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/50',
    label: 'Idle',
    description: 'Agent is idle'
  }
};

const sizeConfig = {
  sm: {
    container: 'w-3 h-3',
    inner: 'w-2 h-2',
    text: 'text-xs'
  },
  md: {
    container: 'w-4 h-4',
    inner: 'w-3 h-3',
    text: 'text-sm'
  },
  lg: {
    container: 'w-6 h-6',
    inner: 'w-4 h-4',
    text: 'text-base'
  }
};

export default function AgentStatusIndicator({ 
  status, 
  size = 'md', 
  className,
  showLabel = false,
  animated = true 
}: AgentStatusIndicatorProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  const indicatorVariants = {
    speaking: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    thinking: {
      opacity: [1, 0.5, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    listening: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    idle: {
      scale: 1,
      opacity: 0.7,
      transition: {
        duration: 0.2
      }
    }
  };

  const pulseVariants = {
    speaking: {
      scale: [1, 1.4, 1],
      opacity: [0.8, 0.2, 0.8],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    thinking: {
      scale: [1, 1.3, 1],
      opacity: [0.6, 0.1, 0.6],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    listening: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    idle: {
      scale: 1,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  if (showLabel) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="relative">
          {/* Pulse effect background */}
          {animated && (
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                config.color,
                sizeStyles.container
              )}
              variants={pulseVariants}
              animate={status}
              initial={false}
            />
          )}
          
          {/* Main indicator */}
          <motion.div
            className={cn(
              'relative rounded-full border-2 border-white shadow-lg',
              config.color,
              config.borderColor,
              config.glowColor,
              sizeStyles.container,
              'flex items-center justify-center'
            )}
            variants={indicatorVariants}
            animate={animated ? status : false}
            initial={false}
            whileHover={{ scale: 1.1 }}
          >
            {/* Inner glow effect */}
            <div className={cn(
              'rounded-full opacity-80',
              config.color,
              sizeStyles.inner
            )} />
          </motion.div>
        </div>
        
        <span className={cn(
          'font-medium capitalize',
          sizeStyles.text,
          status === 'speaking' ? 'text-red-200' :
          status === 'thinking' ? 'text-yellow-200' :
          status === 'listening' ? 'text-green-200' :
          'text-gray-300'
        )}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn('relative', className)}
      title={config.description}
      role="status"
      aria-label={`Agent status: ${config.label}`}
    >
      {/* Pulse effect background */}
      {animated && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full',
            config.color,
            sizeStyles.container
          )}
          variants={pulseVariants}
          animate={status}
          initial={false}
        />
      )}
      
      {/* Main indicator */}
      <motion.div
        className={cn(
          'relative rounded-full border-2 border-white shadow-lg',
          config.color,
          config.borderColor,
          config.glowColor,
          sizeStyles.container,
          'flex items-center justify-center'
        )}
        variants={indicatorVariants}
        animate={animated ? status : false}
        initial={false}
        whileHover={{ scale: 1.1 }}
      >
        {/* Inner glow effect */}
        <div className={cn(
          'rounded-full opacity-80',
          config.color,
          sizeStyles.inner
        )} />
      </motion.div>
    </div>
  );
}

// Export status configuration for use in other components
export { statusConfig, sizeConfig };