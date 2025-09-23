// apps/api/src/tools/adapters/search.adapter.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Citation } from '@bebrahma/types';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

@Injectable()
export class SearchToolAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.search.brave.com/res/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BRAVE_SEARCH_API_KEY');
  }

  async search(query: string, count: number = 10): Promise<SearchResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/web/search`, {
        headers: {
          'X-Subscription-Token': this.apiKey,
          'Accept': 'application/json',
        },
        params: {
          q: query,
          count,
          safesearch: 'moderate',
          freshness: 'pw', // Past week for recent results
        },
      });

      return this.parseResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  private parseResults(data: any): SearchResult[] {
    if (!data.web?.results) return [];

    return data.web.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      date: result.age,
    }));
  }

  async validateCitation(citation: Citation): Promise<boolean> {
    try {
      // Verify the URL is accessible
      const response = await axios.head(citation.url, {
        timeout: 5000,
        validateStatus: (status) => status < 400,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// apps/api/src/tools/adapters/notion.adapter.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';

@Injectable()
export class NotionToolAdapter {
  private notion: Client;
  private databaseId: string;

  constructor(private readonly config: ConfigService) {
    this.notion = new Client({
      auth: this.config.get<string>('NOTION_API_KEY'),
    });
    this.databaseId = this.config.get<string>('NOTION_DATABASE_ID');
  }

  async createPage(title: string, content: any): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
          status: {
            select: { name: 'In Progress' },
          },
          created: {
            date: { start: new Date().toISOString() },
          },
        },
        children: this.contentToBlocks(content),
      });

      return response.id;
    } catch (error) {
      console.error('Notion create error:', error);
      throw new Error(`Failed to create Notion page: ${error.message}`);
    }
  }

  async exportArtifact(artifact: any): Promise<string> {
    const blocks = [];

    // Add title
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: artifact.name } }],
      },
    });

    // Add metadata
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Type: ${artifact.type}\nCreated: ${artifact.createdAt}\nConfidence: ${artifact.confidence || 'N/A'}`,
            },
          },
        ],
        icon: { emoji: '📊' },
      },
    });

    // Add content based on type
    switch (artifact.type) {
      case 'PROBLEM_BRIEF':
        blocks.push(...this.problemBriefToBlocks(artifact.content));
        break;
      case 'MARKET_SNAPSHOT':
        blocks.push(...this.marketSnapshotToBlocks(artifact.content));
        break;
      case 'GTM_SEED':
        blocks.push(...this.gtmSeedToBlocks(artifact.content));
        break;
      case 'BUILD_PROMPT':
        blocks.push(...this.buildPromptToBlocks(artifact.content));
        break;
    }

    // Add sources if available
    if (artifact.sources && artifact.sources.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Sources' } }],
        },
      });

      artifact.sources.forEach((source: any) => {
        blocks.push({
          object: 'block',
          type: 'bookmark',
          bookmark: { url: source.url },
        });
      });
    }

    const pageId = await this.createPageWithBlocks(artifact.name, blocks);
    return `https://notion.so/${pageId.replace(/-/g, '')}`;
  }

  private async createPageWithBlocks(title: string, blocks: any[]): Promise<string> {
    const response = await this.notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: blocks,
    });

    return response.id;
  }

  private contentToBlocks(content: any): any[] {
    // Convert generic content to Notion blocks
    const blocks = [];

    if (typeof content === 'string') {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content } }],
        },
      });
    } else if (typeof content === 'object') {
      // Handle structured content
      Object.entries(content).forEach(([key, value]) => {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: key } }],
          },
        });

        if (Array.isArray(value)) {
          value.forEach((item) => {
            blocks.push({
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: String(item) } }],
              },
            });
          });
        } else {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: String(value) } }],
            },
          });
        }
      });
    }

    return blocks;
  }

  private problemBriefToBlocks(content: any): any[] {
    const blocks = [];

    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Problem Statement' } }],
      },
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: content.statement } }],
      },
    });

    if (content.constraints?.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Constraints' } }],
        },
      });

      content.constraints.forEach((constraint: string) => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: constraint } }],
          },
        });
      });
    }

    return blocks;
  }

  private marketSnapshotToBlocks(content: any): any[] {
    const blocks = [];

    // Market Size
    if (content.marketSize) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Market Size' } }],
        },
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${content.marketSize.value} ${content.marketSize.unit}`,
              },
            },
          ],
        },
      });
    }

    // Competitors
    if (content.competitors?.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Competitors' } }],
        },
      });

      content.competitors.forEach((competitor: any) => {
        blocks.push({
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [{ type: 'text', text: { content: competitor.name } }],
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    { type: 'text', text: { content: competitor.description } },
                  ],
                },
              },
            ],
          },
        });
      });
    }

    return blocks;
  }

  private gtmSeedToBlocks(content: any): any[] {
    const blocks = [];

    // Personas
    if (content.personas?.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Target Personas' } }],
        },
      });

      content.personas.forEach((persona: any) => {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: persona.name } }],
          },
        });

        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: `${persona.role} at ${persona.company}` } },
            ],
          },
        });
      });
    }

    // Experiments
    if (content.experiments?.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Experiments' } }],
        },
      });

      content.experiments.forEach((exp: any, index: number) => {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `${exp.name}: ${exp.hypothesis} (Budget: $${exp.budget})`,
                },
              },
            ],
          },
        });
      });
    }

    return blocks;
  }

  private buildPromptToBlocks(content: any): any[] {
    const blocks = [];

    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Build Specification' } }],
      },
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: content.overview } }],
      },
    });

    // User Stories
    if (content.userStories?.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'User Stories' } }],
        },
      });

      content.userStories.forEach((story: any) => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `As ${story.as}, I want ${story.want} so that ${story.so}`,
                },
              },
            ],
          },
        });
      });
    }

    return blocks;
  }
}