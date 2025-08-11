export interface ScrapingRequest {
  sessionName: string;
  accountNames?: string[];
  hashtags?: string[];
  maxVideos: number;
  userId: string;
  type: 'account' | 'hashtag';
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
  private accountWebhookUrl: string;
  private hashtagWebhookUrl: string;

  constructor() {
    // Use the backend proxy endpoint to avoid CORS issues
    this.accountWebhookUrl = `${import.meta.env.VITE_API_URL || 'https://content-creation-app-vtio.onrender.com'}/api/n8n-proxy`;
    this.hashtagWebhookUrl = `${import.meta.env.VITE_API_URL || 'https://content-creation-app-vtio.onrender.com'}/api/n8n-proxy`;
    
    // Your Render app URL for receiving results
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://content-creation-app-vtio.onrender.com';
  }

  /**
   * Trigger the account scraping workflow in n8n
   */
  async triggerAccountScraping(request: ScrapingRequest): Promise<{ executionId: string; status: string }> {
    try {
      const response = await fetch(this.accountWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: request.sessionName,
          accountNames: request.accountNames,
          maxVideos: request.maxVideos,
          userId: request.userId,
          callbackUrl: `${this.baseUrl}/api/scraping-results`,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        executionId: result.executionId || Date.now().toString(),
        status: 'triggered'
      };
    } catch (error) {
      console.error('Failed to trigger n8n workflow:', error);
      throw new Error('Failed to start scraping process');
    }
  }

  /**
   * Trigger the hashtag scraping workflow in n8n
   */
  async triggerHashtagScraping(request: ScrapingRequest): Promise<{ executionId: string; status: string }> {
    try {
      const response = await fetch(this.hashtagWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: request.sessionName,
          hashtags: request.hashtags,
          maxVideos: request.maxVideos,
          userId: request.userId,
          callbackUrl: `${this.baseUrl}/api/scraping-results`,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        executionId: result.executionId || Date.now().toString(),
        status: 'triggered'
      };
    } catch (error) {
      console.error('Failed to trigger n8n workflow:', error);
      throw new Error('Failed to start scraping process');
    }
  }

  /**
   * Check the status of a scraping execution
   */
  async checkScrapingStatus(executionId: string): Promise<{ status: string; progress?: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n-proxy/status/${executionId}`, {
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
