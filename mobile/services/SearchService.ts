import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/ai';

interface SearchResult {
  id: string;
  type: 'email' | 'file';
  title: string;
  snippet: string;
}

interface SearchResponse {
  query: string;
  suggestedTerms: string;
  vectorSize: number;
  results: SearchResult[];
}

class SearchService {
  /**
   * Perform semantic search using natural language query
   */
  async search(query: string): Promise<SearchResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/search`, {
        query
      });
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Failed to perform search');
    }
  }
}

export default new SearchService();
