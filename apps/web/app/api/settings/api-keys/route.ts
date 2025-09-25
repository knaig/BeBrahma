import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received API key request:', { keyType: body.keyType, apiKeyLength: body.apiKey?.length });
    
    const { keyType, apiKey } = body;

    if (!keyType || !apiKey) {
      console.log('Missing fields:', { keyType: !!keyType, apiKey: !!apiKey });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate API key formats
    const validationResult = validateApiKey(keyType, apiKey);
    console.log('Validation result:', validationResult);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    // Here you would typically save the API key to your database
    // For now, we'll just return success
    // TODO: Implement database storage for API keys
    
    console.log(`API key saved for user ${userId}, type: ${keyType}`);

    return NextResponse.json({ 
      success: true, 
      message: `${keyType} API key saved successfully` 
    });

  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function validateApiKey(keyType: string, apiKey: string) {
  switch (keyType) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        return { isValid: false, error: 'OpenAI API key must start with "sk-"' };
      }
      if (apiKey.length < 20) {
        return { isValid: false, error: 'OpenAI API key is too short' };
      }
      break;
      
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        return { isValid: false, error: 'Anthropic API key must start with "sk-ant-"' };
      }
      if (apiKey.length < 20) {
        return { isValid: false, error: 'Anthropic API key is too short' };
      }
      break;
      
    case 'firecrawl':
      if (!apiKey.startsWith('fc_')) {
        return { isValid: false, error: 'Firecrawl API key must start with "fc_"' };
      }
      if (apiKey.length < 10) {
        return { isValid: false, error: 'Firecrawl API key is too short' };
      }
      break;
      
    default:
      return { isValid: false, error: 'Invalid API key type' };
  }
  
  return { isValid: true, error: null };
}
