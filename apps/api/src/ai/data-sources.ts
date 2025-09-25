import { APIMarketplaceService, APIMarketplaceRequest } from './api-marketplace';

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'scraping' | 'database';
  description: string;
  baseUrl: string;
  rateLimit: number;
  status: 'active' | 'inactive';
  marketplace?: boolean; // Whether this source uses the marketplace
}

export interface DataQuery {
  source: string;
  query: string;
  parameters: Record<string, any>;
  timestamp: Date;
  result: any;
  metadata: {
    confidence: number;
    sampleSize?: number | undefined;
    lastUpdated?: Date | undefined;
    sourceUrl?: string | undefined;
    provider?: string; // Added for marketplace queries
    cost?: number; // Added for marketplace queries
    remainingQuota?: number; // Added for marketplace queries
  };
}

export class DataSourceManager {
  private sources: Map<string, DataSource> = new Map();
  private queries: DataQuery[] = [];
  private apiKeys: Map<string, string> = new Map();
  private marketplace: APIMarketplaceService;

  constructor() {
    this.marketplace = new APIMarketplaceService();
    this.initializeDataSources();
  }

  private initializeDataSources() {
    // Real data sources with actual APIs
    const sources: DataSource[] = [
      {
        id: 'reddit',
        name: 'Reddit API',
        type: 'api',
        description: 'Real community discussions and trends',
        baseUrl: 'https://www.reddit.com/api/v1',
        rateLimit: 60,
        status: 'active',
        marketplace: false
      },
      {
        id: 'github',
        name: 'GitHub API',
        type: 'api',
        description: 'Repository trends, stars, and technical insights',
        baseUrl: 'https://api.github.com',
        rateLimit: 5000,
        status: 'active',
        marketplace: false
      },
      {
        id: 'linkedin-jobs',
        name: 'LinkedIn Jobs API',
        type: 'api',
        description: 'Job posting data and skill requirements',
        baseUrl: 'https://api.linkedin.com/v2',
        rateLimit: 100,
        status: 'active',
        marketplace: true
      },
      {
        id: 'hubspot',
        name: 'HubSpot API',
        type: 'api',
        description: 'CRM data, sales metrics, and customer insights',
        baseUrl: 'https://api.hubapi.com',
        rateLimit: 100,
        status: 'active',
        marketplace: true
      },
      {
        id: 'google-trends',
        name: 'Google Trends API',
        type: 'api',
        description: 'Search volume and trend data (using Reddit + News API fallback)',
        baseUrl: 'https://trends.google.com/trends/api',
        rateLimit: 100,
        status: 'active',
        marketplace: false
      },
      {
        id: 'news-api',
        name: 'News API',
        type: 'api',
        description: 'Industry news and company updates',
        baseUrl: 'https://newsapi.org/v2',
        rateLimit: 100,
        status: process.env['NEWS_API_KEY'] ? 'active' : 'inactive',
        marketplace: false
      },
      {
        id: 'salesforce',
        name: 'Salesforce API',
        type: 'api',
        description: 'Sales data, pipeline metrics, and customer insights',
        baseUrl: 'https://api.salesforce.com',
        rateLimit: 100,
        status: 'active',
        marketplace: true
      },
      {
        id: 'statista',
        name: 'Statista API',
        type: 'api',
        description: 'Market research and industry statistics',
        baseUrl: 'https://api.statista.com',
        rateLimit: 50,
        status: 'inactive',
        marketplace: true
      }
    ];

    sources.forEach(source => this.sources.set(source.id, source));
  }

  public async queryDataSource(sourceId: string, query: string, parameters: Record<string, any> = {}): Promise<any> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Data source not found: ${sourceId}`);
    }

    if (source.status === 'inactive') {
      throw new Error(`Data source is inactive: ${source.name}`);
    }

    // Check if this source uses the marketplace
    if (source.marketplace) {
      try {
        const marketplaceRequest: APIMarketplaceRequest = {
          sourceId,
          query,
          parameters,
          priority: 'medium'
        };
        
        const result = await this.marketplace.requestAPI(marketplaceRequest);
        
        // Store the query for history
        this.queries.push({
          source: sourceId,
          query,
          parameters,
          timestamp: new Date(),
          result: result.data,
          metadata: {
            confidence: this.calculateConfidence(result.data),
            sampleSize: this.extractSampleSize(result.data),
            lastUpdated: new Date(),
            sourceUrl: this.generateSourceUrl(source, query, parameters),
            provider: result.provider,
            cost: result.cost,
            remainingQuota: result.remainingQuota
          }
        });
        
        return result.data;
        
      } catch (error) {
        console.error(`Marketplace API error for ${sourceId}:`, error);
        throw new Error(`Failed to query marketplace for ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Use direct API calls for non-marketplace sources
    let result: any;
    switch (sourceId) {
      case 'reddit':
        result = await this.queryReddit(query, parameters);
        break;
      case 'github':
        result = await this.queryGitHub(query, parameters);
        break;
      case 'google-trends':
        result = await this.queryGoogleTrends(query, parameters);
        break;
      case 'news-api':
        result = await this.queryNewsAPI(query, parameters);
        break;
      default:
        return null;
    }

    // Store the query for history
    this.queries.push({
      source: sourceId,
      query,
      parameters,
      timestamp: new Date(),
      result,
      metadata: {
        confidence: this.calculateConfidence(result),
        sampleSize: this.extractSampleSize(result),
        lastUpdated: new Date(),
        sourceUrl: this.generateSourceUrl(source, query, parameters),
        provider: 'direct',
        cost: 0,
        remainingQuota: -1
      }
    });

    return result;
  }

  private async queryReddit(query: string, parameters: Record<string, any>): Promise<any> {
    // Real Reddit API call
    const subreddit = parameters['subreddit'] || 'startups';
    const limit = parameters['limit'] || 25;
    
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&t=month`);
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Extract relevant data
    return {
      posts: data.data.children.map((child: any) => ({
        title: child.data.title,
        score: child.data.score,
        comments: child.data.num_comments,
        created: child.data.created_utc,
        url: `https://reddit.com${child.data.permalink}`,
        author: child.data.author,
        text: child.data.selftext?.substring(0, 200) || ''
      })),
      totalResults: data.data.children.length,
      subreddit,
      query
    };
  }

  private async queryGitHub(query: string, parameters: Record<string, any>): Promise<any> {
    // Real GitHub API call
    const searchQuery = encodeURIComponent(query);
    const sort = parameters['sort'] || 'stars';
    const order = parameters['order'] || 'desc';
    
    const response = await fetch(`https://api.github.com/search/repositories?q=${searchQuery}&sort=${sort}&order=${order}&per_page=20`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    return {
      repositories: data.items.map((repo: any) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at
      })),
      totalCount: data.total_count,
      searchQuery: query
    };
  }

  private async queryGoogleTrends(query: string, _parameters: Record<string, any>): Promise<any> {
    // Note: Google Trends API is in alpha testing and not publicly available
    // For now, we'll use a combination of Reddit and News API data as trend indicators
    
    try {
      // Get Reddit data as a trend indicator
      const redditData = await this.queryReddit(query, { subreddit: 'all', limit: 20 });
      
      // Get News API data as a trend indicator
      const newsData = await this.queryNewsAPI(query, {});
      
      // Calculate trend score based on Reddit engagement and news frequency
      const redditScore = redditData?.posts?.reduce((score: number, post: any) => 
        score + (post.score || 0) + (post.comments || 0), 0) || 0;
      
      const newsScore = newsData?.totalCount || 0;
      const trendScore = redditScore + (newsScore * 10); // Weight news more heavily
      
      return {
        trends: [{
          query: query,
          traffic: `Trend score: ${trendScore}`,
          articles: newsData?.articles?.slice(0, 5) || [],
          redditPosts: redditData?.posts?.slice(0, 5) || [],
          trendScore: trendScore
        }],
        totalCount: 1,
        searchQuery: query,
        note: "Trend data derived from Reddit engagement and news frequency (Google Trends API not yet publicly available)"
      };
      
    } catch (error) {
      // Fallback to basic trend estimation
      return {
        trends: [{
          query: query,
          traffic: "Trend data unavailable",
          articles: [],
          redditPosts: [],
          trendScore: 0
        }],
        totalCount: 1,
        searchQuery: query,
        note: "Using fallback trend estimation. Google Trends API is in alpha testing."
      };
    }
  }

  private async queryNewsAPI(query: string, _parameters: Record<string, any>): Promise<any> {
    // Try to get API key from environment first, then from stored keys
    let apiKey = process.env['NEWS_API_KEY'] || this.apiKeys.get('news-api');
    
    if (!apiKey) {
      throw new Error('News API key not configured. Please set NEWS_API_KEY environment variable or use the API key management interface.');
    }

    // News API call
    const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=20&apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    return {
      articles: data.articles?.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        content: article.content?.substring(0, 200) || ''
      })) || [],
      totalCount: data.totalResults || 0,
      searchQuery: query
    };
  }

  private calculateConfidence(result: any): number {
    // Calculate confidence based on data quality
    if (!result) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for more data points
    if (result.totalResults || result.totalCount) {
      const count = result.totalResults || result.totalCount;
      if (count > 100) confidence += 0.3;
      else if (count > 50) confidence += 0.2;
      else if (count > 10) confidence += 0.1;
    }
    
    // Higher confidence for recent data
    if (result.posts || result.repositories) {
      const items = result.posts || result.repositories;
      const recentItems = items.filter((item: any) => {
        const date = new Date(item.createdAt || item.created);
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo < 30;
      });
      
      if (recentItems.length > items.length * 0.5) confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractSampleSize(result: any): number | undefined {
    if (result.totalResults) return result.totalResults;
    if (result.totalCount) return result.totalCount;
    if (result.posts) return result.posts.length;
    if (result.repositories) return result.repositories.length;
    return undefined;
  }

  private generateSourceUrl(source: DataSource, query: string, parameters: Record<string, any>): string {
    switch (source.id) {
      case 'reddit':
        const subreddit = parameters['subreddit'] || 'startups';
        return `https://www.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=relevance&t=month`;
      case 'github':
        return `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories&s=stars&o=desc`;
      default:
        return source.baseUrl;
    }
  }

  getAvailableSources(): DataSource[] {
    return Array.from(this.sources.values());
  }

  public getQueryHistory(): DataQuery[] {
    return [...this.queries];
  }

  public getMarketplaceUsage(): any {
    return this.marketplace.getUsage();
  }

  public setApiKey(sourceId: string, apiKey: string): void {
    this.apiKeys.set(sourceId, apiKey);
  }
}
