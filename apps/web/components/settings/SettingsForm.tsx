"use client";

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ThemeToggle } from '../ui/theme-toggle';
import Link from 'next/link';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsFormProps {
  userId: string;
}

export function SettingsForm({ userId }: SettingsFormProps) {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    firecrawl: ''
  });
  
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    firecrawl: false
  });
  
  const [status, setStatus] = useState({
    openai: 'idle',
    anthropic: 'idle',
    firecrawl: 'idle'
  });
  
  const [errorMessages, setErrorMessages] = useState({
    openai: '',
    anthropic: '',
    firecrawl: ''
  });

  const handleApiKeyChange = (key: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
    setStatus(prev => ({ ...prev, [key]: 'idle' }));
    setErrorMessages(prev => ({ ...prev, [key]: '' }));
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const saveApiKey = async (key: string) => {
    if (!apiKeys[key as keyof typeof apiKeys]) return;
    
    setStatus(prev => ({ ...prev, [key]: 'saving' }));
    
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          keyType: key,
          apiKey: apiKeys[key as keyof typeof apiKeys]
        }),
      });

      if (response.ok) {
        setStatus(prev => ({ ...prev, [key]: 'success' }));
        setTimeout(() => {
          setStatus(prev => ({ ...prev, [key]: 'idle' }));
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Failed to save ${key} API key`);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessages(prev => ({ ...prev, [key]: errorMessage }));
      setStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => {
        setStatus(prev => ({ ...prev, [key]: 'idle' }));
        setErrorMessages(prev => ({ ...prev, [key]: '' }));
      }, 5000);
    }
  };

  const getStatusIcon = (keyStatus: string) => {
    switch (keyStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'saving':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and API keys
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* API Keys Management */}
        <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white transition-colors duration-200">
              🔑 API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OpenAI API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.openai ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleKeyVisibility('openai')}
                  >
                    {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => saveApiKey('openai')}
                    disabled={!apiKeys.openai || status.openai === 'saving'}
                  >
                    Save
                  </Button>
                  {getStatusIcon(status.openai)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your OpenAI API key for AI-powered features
                </p>
                {errorMessages.openai && (
                  <p className="text-xs text-red-500 mt-1">{errorMessages.openai}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anthropic API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.anthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleKeyVisibility('anthropic')}
                  >
                    {showKeys.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => saveApiKey('anthropic')}
                    disabled={!apiKeys.anthropic || status.anthropic === 'saving'}
                  >
                    Save
                  </Button>
                  {getStatusIcon(status.anthropic)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your Anthropic API key for Claude integration
                </p>
                {errorMessages.anthropic && (
                  <p className="text-xs text-red-500 mt-1">{errorMessages.anthropic}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Firecrawl API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.firecrawl ? "text" : "password"}
                    placeholder="fc_..."
                    value={apiKeys.firecrawl}
                    onChange={(e) => handleApiKeyChange('firecrawl', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleKeyVisibility('firecrawl')}
                  >
                    {showKeys.firecrawl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => saveApiKey('firecrawl')}
                    disabled={!apiKeys.firecrawl || status.firecrawl === 'saving'}
                  >
                    Save
                  </Button>
                  {getStatusIcon(status.firecrawl)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your Firecrawl API key for web scraping
                </p>
                {errorMessages.firecrawl && (
                  <p className="text-xs text-red-500 mt-1">{errorMessages.firecrawl}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="dark:bg-slate-800 dark:border-slate-700 transition-colors duration-200">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white transition-colors duration-200">
              ⚡ Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  🏠 Back to Dashboard
                </Button>
              </Link>
              <Link href="/billing">
                <Button variant="outline" className="w-full justify-start">
                  💳 Manage Billing
                </Button>
              </Link>
              <Link href="/simple-chat">
                <Button variant="outline" className="w-full justify-start">
                  💬 Start Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
