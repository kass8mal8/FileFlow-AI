import { API_BASE_URL } from '../utils/constants';

const SEARCH_API_URL = `${API_BASE_URL}/ai`;

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
      const response = await axios.post(`${SEARCH_API_URL}/search`, {
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
