export interface APIMarketplaceProvider {
  id: string;
  name: string;
  description: string;
  apis: string[];
  pricing: {
    monthly: number;
    requestsPerMonth: number;
    overageRate: number;
  };
  status: 'active' | 'inactive';
}

export interface APIMarketplaceRequest {
  sourceId: string;
  query: string;
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
}

export interface APIMarketplaceResponse {
  success: boolean;
  data: any;
  source: string;
  provider: string;
  cost: number;
  remainingQuota: number;
}

export class APIMarketplaceService {
  private providers: Map<string, APIMarketplaceProvider> = new Map();
  private usage: Map<string, number> = new Map();
  private monthlyBudget: number = 200; // $200/month budget
  private currentMonthUsage: number = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // RapidAPI - Comprehensive API marketplace
    this.providers.set('rapidapi', {
      id: 'rapidapi',
      name: 'RapidAPI',
      description: '50,000+ APIs including LinkedIn, HubSpot, Google Trends',
      apis: ['linkedin-jobs', 'hubspot', 'google-trends', 'salesforce', 'twitter'],
      pricing: {
        monthly: 49,
        requestsPerMonth: 10000,
        overageRate: 0.001 // $0.001 per additional request
      },
      status: 'active'
    });

    // APILayer - Business API bundles
    this.providers.set('apilayer', {
      id: 'apilayer',
      name: 'APILayer',
      description: '100+ business APIs with unified access',
      apis: ['linkedin', 'hubspot', 'news', 'currency', 'email'],
      pricing: {
        monthly: 99,
        requestsPerMonth: 5000,
        overageRate: 0.002
      },
      status: 'active'
    });

    // Proxycurl - LinkedIn specialist
    this.providers.set('proxycurl', {
      id: 'proxycurl',
      name: 'Proxycurl',
      description: 'LinkedIn data extraction specialist',
      apis: ['linkedin-jobs', 'linkedin-profiles', 'linkedin-companies'],
      pricing: {
        monthly: 199,
        requestsPerMonth: 2000,
        overageRate: 0.005
      },
      status: 'active'
    });

    // Zyte - Web scraping specialist
    this.providers.set('zyte', {
      id: 'zyte',
      name: 'Zyte (ScrapingBee)',
      description: 'Professional web scraping for any website',
      apis: ['linkedin', 'hubspot', 'custom-scraping'],
      pricing: {
        monthly: 149,
        requestsPerMonth: 3000,
        overageRate: 0.003
      },
      status: 'active'
    });
  }

  public async requestAPI(request: APIMarketplaceRequest): Promise<APIMarketplaceResponse> {
    // Determine which provider to use based on the source and current usage
    const provider = this.selectOptimalProvider(request.sourceId);
    
    if (!provider) {
      throw new Error(`No provider available for ${request.sourceId}`);
    }

    // Check budget and quota
    if (!this.checkBudgetAndQuota(provider)) {
      throw new Error(`Budget or quota exceeded for ${provider.name}`);
    }

    try {
      // Route the request to the appropriate provider
      const result = await this.routeToProvider(provider, request);
      
      // Update usage tracking
      this.updateUsage(provider.id, 1);
      
      return {
        success: true,
        data: result,
        source: request.sourceId,
        provider: provider.name,
        cost: this.calculateCost(provider, 1),
        remainingQuota: this.getRemainingQuota(provider.id)
      };
      
    } catch (error) {
      // Fallback to alternative provider if available
      const fallbackProvider = this.findFallbackProvider(request.sourceId, provider.id);
      if (fallbackProvider) {
        return this.requestAPI({ ...request, priority: 'low' });
      }
      
      throw error;
    }
  }

  private selectOptimalProvider(sourceId: string): APIMarketplaceProvider | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => provider.status === 'active' && provider.apis.includes(sourceId))
      .sort((a, b) => {
        // Prioritize by cost efficiency and remaining quota
        const aEfficiency = a.pricing.monthly / a.pricing.requestsPerMonth;
        const bEfficiency = b.pricing.monthly / b.pricing.requestsPerMonth;
        const aQuota = this.getRemainingQuota(a.id);
        const bQuota = this.getRemainingQuota(b.id);
        
        // Prefer providers with more quota and better cost efficiency
        if (aQuota > 0 && bQuota === 0) return -1;
        if (bQuota > 0 && aQuota === 0) return 1;
        
        return aEfficiency - bEfficiency;
      });

    return availableProviders[0] || null;
  }

  private async routeToProvider(provider: APIMarketplaceProvider, request: APIMarketplaceRequest): Promise<any> {
    switch (provider.id) {
      case 'rapidapi':
        return this.callRapidAPI(request);
      case 'apilayer':
        return this.callAPILayer(request);
      case 'proxycurl':
        return this.callProxycurl(request);
      case 'zyte':
        return this.callZyte(request);
      default:
        throw new Error(`Unknown provider: ${provider.id}`);
    }
  }

  private async callRapidAPI(request: APIMarketplaceRequest): Promise<any> {
    // RapidAPI implementation
    const endpoint = this.getRapidAPIEndpoint(request.sourceId);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env['RAPIDAPI_KEY'] || '',
        'X-RapidAPI-Host': this.getRapidAPIHost(request.sourceId)
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    return response.json();
  }

  private async callAPILayer(request: APIMarketplaceRequest): Promise<any> {
    // APILayer implementation
    const endpoint = `https://api.apilayer.com/${request.sourceId}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': process.env['APILAYER_KEY'] || ''
      }
    });

    if (!response.ok) {
      throw new Error(`APILayer error: ${response.status}`);
    }

    return response.json();
  }

  private async callProxycurl(request: APIMarketplaceRequest): Promise<any> {
    // Proxycurl implementation
    const endpoint = `https://nubela.co/proxycurl/api/v2/${request.sourceId}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env['PROXYCURL_KEY'] || ''}`
      }
    });

    if (!response.ok) {
      throw new Error(`Proxycurl error: ${response.status}`);
    }

    return response.json();
  }

  private async callZyte(request: APIMarketplaceRequest): Promise<any> {
    // Zyte implementation
    const endpoint = 'https://app.scrapingbee.com/api/v1/';
    const params = new URLSearchParams({
      api_key: process.env['ZYTE_KEY'] || '',
      url: this.getZyteURL(request.sourceId, request.parameters),
      render_js: 'false',
      country_code: 'us'
    });

    const response = await fetch(`${endpoint}?${params}`);
    if (!response.ok) {
      throw new Error(`Zyte error: ${response.status}`);
    }

    return response.text();
  }

  private getRapidAPIEndpoint(sourceId: string): string {
    const endpoints: Record<string, string> = {
      'linkedin-jobs': 'https://linkedin-jobs-search.p.rapidapi.com/search',
      'hubspot': 'https://hubspot.p.rapidapi.com/contacts',
      'google-trends': 'https://google-trends.p.rapidapi.com/api/dailyTrends'
    };
    return endpoints[sourceId] || '';
  }

  private getRapidAPIHost(sourceId: string): string {
    const hosts: Record<string, string> = {
      'linkedin-jobs': 'linkedin-jobs-search.p.rapidapi.com',
      'hubspot': 'hubspot.p.rapidapi.com',
      'google-trends': 'google-trends.p.rapidapi.com'
    };
    return hosts[sourceId] || '';
  }

  private getZyteURL(sourceId: string, parameters: Record<string, any>): string {
    switch (sourceId) {
      case 'linkedin':
        return `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(parameters['query'] || '')}`;
      case 'hubspot':
        return `https://www.hubspot.com/products/${parameters['product'] || 'crm'}`;
      default:
        return 'https://www.google.com';
    }
  }

  private checkBudgetAndQuota(provider: APIMarketplaceProvider): boolean {
    const currentCost = this.currentMonthUsage;
    const providerCost = provider.pricing.monthly;
    const remainingQuota = this.getRemainingQuota(provider.id);

    return currentCost + providerCost <= this.monthlyBudget && remainingQuota > 0;
  }

  private updateUsage(providerId: string, requests: number): void {
    const current = this.usage.get(providerId) || 0;
    this.usage.set(providerId, current + requests);
    this.currentMonthUsage += this.calculateCost(this.providers.get(providerId)!, requests);
  }

  private calculateCost(provider: APIMarketplaceProvider, requests: number): number {
    if (requests <= provider.pricing.requestsPerMonth) {
      return provider.pricing.monthly;
    }
    
    const overage = requests - provider.pricing.requestsPerMonth;
    return provider.pricing.monthly + (overage * provider.pricing.overageRate);
  }

  private getRemainingQuota(providerId: string): number {
    const provider = this.providers.get(providerId);
    if (!provider) return 0;
    
    const used = this.usage.get(providerId) || 0;
    return Math.max(0, provider.pricing.requestsPerMonth - used);
  }

  private findFallbackProvider(sourceId: string, excludeProviderId: string): APIMarketplaceProvider | null {
    return Array.from(this.providers.values())
      .filter(p => p.id !== excludeProviderId && p.status === 'active' && p.apis.includes(sourceId))
      .sort((a, b) => a.pricing.monthly - b.pricing.monthly)[0] || null;
  }

  public getProviders(): APIMarketplaceProvider[] {
    return Array.from(this.providers.values());
  }

  public getUsage(): Record<string, any> {
    return {
      monthlyBudget: this.monthlyBudget,
      currentMonthUsage: this.currentMonthUsage,
      remainingBudget: this.monthlyBudget - this.currentMonthUsage,
      providerUsage: Object.fromEntries(this.usage),
      providers: this.getProviders()
    };
  }

  public setMonthlyBudget(budget: number): void {
    this.monthlyBudget = budget;
  }
}
