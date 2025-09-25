'use client';

import React, { useContext } from 'react';
import { PreviewContext } from '@/lib/research/PreviewContext';
import { ResearchPreviewDock } from './ResearchPreviewDock';

export function DockMount() {
  const { items } = useContext(PreviewContext);
  
  return (
    <ResearchPreviewDock 
      items={items} 
      initialOpen={false} 
    />
  );
}
