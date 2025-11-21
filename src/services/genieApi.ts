/**
 * Genie API client for interacting with Databricks Genie rooms
 */

import axios, { AxiosInstance } from 'axios';
import { authService } from './auth';

export interface GenieRoom {
  id: string;
  name: string;
  description?: string;
  warehouse_id?: string;
  created_at?: string;
  updated_at?: string;
}

// API response format from Databricks
interface GenieSpaceResponse {
  space_id: string;
  title: string;
  description?: string;
  warehouse_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GenieMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  attachments?: GenieAttachment[];
}

export interface GenieAttachment {
  type: 'query_result' | 'visualization' | 'table';
  content: any;
  metadata?: Record<string, any>;
  results?: any; // SQL statement execution results
}

export interface GenieConversation {
  id: string;
  room_id?: string;
  space_id?: string;
  messages?: GenieMessage[];
  created_at?: string;
  title?: string;
  created_timestamp?: number;
  last_updated_timestamp?: number;
  conversation_id?: string;
  user_id?: number;
}

export interface SendMessageRequest {
  content: string;
  conversation_id?: string;
}

export interface SendMessageResponse {
  message_id: string;
  message: any;
  conversation_id: string;
  conversation: any;
}

class GenieApiClient {
  private client: AxiosInstance;
  private defaultSpaceId: string | null;
  private sqlWarehouseId: string | null;
  private isDevelopment: boolean;

  constructor() {
    // Use runtime config if available (Databricks), otherwise use build-time env (local dev)
    const runtimeConfig = (window as any).APP_CONFIG;
    this.defaultSpaceId = runtimeConfig?.genieSpaceId || import.meta.env.VITE_GENIE_SPACE_ID || null;
    this.sqlWarehouseId = runtimeConfig?.sqlWarehouseId || import.meta.env.VITE_SQL_WAREHOUSE_ID || null;
    this.isDevelopment = import.meta.env.DEV;

    // Always use relative URLs - works in both dev and production
    // In dev: Vite proxy handles it
    // In production (Databricks Apps): Same-origin requests work automatically
    const baseURL = '/api/2.0/genie';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔧 Genie API initialized:', {
      isDevelopment: this.isDevelopment,
      baseURL,
      defaultSpaceId: this.defaultSpaceId,
      sqlWarehouseId: this.sqlWarehouseId,
    });

    // Add authentication interceptor
    // In development, the proxy adds the token
    // In production (Databricks Apps), auth is handled via OBO headers automatically
    this.client.interceptors.request.use(
      (config) => {
        if (!this.isDevelopment) {
          // In production, don't add Authorization header
          // Databricks Apps OBO handles this automatically
          console.log('🔐 Making authenticated request to:', config.url);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            await authService.refresh();
            // Retry the original request
            return this.client.request(error.config);
          } catch (refreshError) {
            authService.logout();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get default space ID from environment
   */
  getDefaultSpaceId(): string | null {
    return this.defaultSpaceId;
  }

  /**
   * Get SQL warehouse ID from environment
   */
  getSqlWarehouseId(): string | null {
    return this.sqlWarehouseId;
  }

  /**
   * Get all available Genie rooms
   */
  async getRooms(): Promise<GenieRoom[]> {
    try {
      const response = await this.client.get('/spaces');
      const spacesData: GenieSpaceResponse[] = response.data.spaces || [];
      
      // Map API response to our GenieRoom interface
      const rooms: GenieRoom[] = spacesData.map(space => ({
        id: space.space_id,
        name: space.title,
        description: space.description,
        warehouse_id: space.warehouse_id,
        created_at: space.created_at,
        updated_at: space.updated_at,
      }));
      
      console.log('✅ Fetched rooms from /api/2.0/genie/spaces');
      console.log('📋 All available rooms:', rooms.map(r => ({ id: r.id, name: r.name })));
      
      // If a default space ID is configured and exists, move it to the front
      if (this.defaultSpaceId) {
        const defaultRoomIndex = rooms.findIndex(r => r.id === this.defaultSpaceId);
        if (defaultRoomIndex >= 0) {
          const [defaultRoom] = rooms.splice(defaultRoomIndex, 1);
          rooms.unshift(defaultRoom);
          console.log('✅ Moved default room to front:', defaultRoom.name);
        } else {
          console.warn('⚠️ Default room ID not found:', this.defaultSpaceId);
          console.warn('Available IDs:', rooms.map(r => r.id));
        }
      }
      
      return rooms;
    } catch (error) {
      console.error('❌ Failed to fetch Genie rooms:', error);
      throw error;
    }
  }

  /**
   * Get a specific Genie room by ID
   */
  async getRoom(roomId: string): Promise<GenieRoom> {
    try {
      const response = await this.client.get(`/spaces/${roomId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Genie room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation history for a room
   */
  async getConversations(roomId: string): Promise<GenieConversation[]> {
    try {
      const response = await this.client.get(`/spaces/${roomId}/conversations`);
      return response.data.conversations || [];
    } catch (error) {
      console.error(`Failed to fetch conversations for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific conversation
   */
  async getConversation(roomId: string, conversationId: string): Promise<GenieConversation> {
    try {
      const response = await this.client.get(
        `/spaces/${roomId}/conversations/${conversationId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(roomId: string, conversationId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/spaces/${roomId}/conversations/${conversationId}/messages`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific message with polling support
   */
  async getMessage(roomId: string, conversationId: string, messageId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/spaces/${roomId}/conversations/${conversationId}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Send a message to a Genie room
   */
  async sendMessage(
    roomId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      const response = await this.client.post(`/spaces/${roomId}/start-conversation`, {
        content: request.content,
        conversation_id: request.conversation_id,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to send message to room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new conversation in a room
   */
  async createConversation(roomId: string): Promise<GenieConversation> {
    try {
      const response = await this.client.post(`/spaces/${roomId}/conversations`, {});
      return response.data;
    } catch (error) {
      console.error(`Failed to create conversation in room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Poll for message updates (for streaming responses)
   */
  async pollMessageUpdates(
    roomId: string,
    conversationId: string,
    messageId: string
  ): Promise<GenieMessage> {
    try {
      const response = await this.client.get(
        `/spaces/${roomId}/conversations/${conversationId}/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to poll message updates:`, error);
      throw error;
    }
  }

  /**
   * Execute a query in a Genie room
   */
  async executeQuery(roomId: string, query: string): Promise<any> {
    try {
      const payload: any = { query };
      
      // Add SQL warehouse ID if configured
      if (this.sqlWarehouseId) {
        payload.warehouse_id = this.sqlWarehouseId;
      }
      
      const response = await this.client.post(`/spaces/${roomId}/execute-query`, payload);
      return response.data;
    } catch (error) {
      console.error(`Failed to execute query in room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Get SQL statement results
   */
  async getStatementResults(statementId: string): Promise<any> {
    try {
      // Use SQL Statements API to get results
      // Need to use a different base path for SQL API
      const response = await axios.get(
        `/api/2.0/sql/statements/${statementId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statement results:', error);
      throw error;
    }
  }

  /**
   * Get suggested questions for a Genie space
   */
  async getSuggestedQuestions(spaceId: string): Promise<string[]> {
    try {
      // Try to get suggested questions from the space
      const response = await this.client.get(`/spaces/${spaceId}`);
      
      // Extract suggested questions if available
      const space = response.data;
      const suggestedQuestions = space.suggested_questions || space.instructions?.sample_questions || [];
      
      console.log('📋 Suggested questions for space:', suggestedQuestions);
      
      return Array.isArray(suggestedQuestions) ? suggestedQuestions : [];
    } catch (error) {
      console.error('Failed to fetch suggested questions:', error);
      // Return empty array if we can't fetch suggestions
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(spaceId: string, conversationId: string): Promise<void> {
    try {
      await this.client.delete(`/spaces/${spaceId}/conversations/${conversationId}`);
      console.log('🗑️ Deleted conversation:', conversationId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }
}

export const genieApi = new GenieApiClient();

