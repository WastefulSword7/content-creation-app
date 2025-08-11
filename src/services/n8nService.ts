export interface ScrapingRequest {
  sessionName: string;
  accountNames: string[];
  maxVideos: number;
  userId: string;
}

export interface ScrapingResult {
  id: string;
  account: string;
  videoUrl: string;
  transcript: string;
  caption: string;
  views: number;
  likes: number;
  followers: number;
}

export interface ScrapingSession {
  id: string;
  name: string;
  type: 'account' | 'hashtag';
  data: ScrapingResult[];
  dateCreated: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  n8nExecutionId?: string;
}

class N8nService {
  private baseUrl: string;
  private webhookUrl: string;

  constructor() {
    // Your n8n webhook URL - you'll need to set this up
    this.webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/account-scraper';
    
    // Your Render app URL for receiving results
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Trigger the account scraping workflow via our backend
   */
  async triggerAccountScraping(request: ScrapingRequest): Promise<{ executionId: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/trigger-scraping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: request.sessionName,
          accountNames: request.accountNames,
          maxVideos: request.maxVideos,
          userId: request.userId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        executionId: result.executionId || result.sessionId || Date.now().toString(),
        status: result.status || 'triggered'
      };
    } catch (error) {
      console.error('Failed to trigger scraping workflow:', error);
      throw new Error('Failed to start scraping process');
    }
  }

  /**
   * Check the status of a scraping execution
   */
  async checkScrapingStatus(executionId: string): Promise<{ status: string; progress?: number }> {
    try {
      const response = await fetch(`${this.webhookUrl}/status/${executionId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to check scraping status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Get scraping results from your app's API
   */
  async getScrapingResults(sessionId: string): Promise<ScrapingResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/results/${sessionId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch scraping results:', error);
      return [];
    }
  }
}

export const n8nService = new N8nService();
export default n8nService;
