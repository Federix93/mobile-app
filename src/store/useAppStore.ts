/**
 * Global application state management using Zustand
 */

import { create } from 'zustand';
import { GenieRoom, GenieConversation, GenieMessage } from '../services/genieApi';

interface UserInfo {
  id: string;
  userName: string;
  displayName: string;
  emails?: any[];
  photos?: any[];
}

interface AppState {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentUser: UserInfo | null;

  // Rooms
  rooms: GenieRoom[];
  selectedRoom: GenieRoom | null;

  // Conversations
  conversations: Map<string, GenieConversation>;
  activeConversationId: string | null;

  // Messages
  messages: GenieMessage[];
  isMessageLoading: boolean;

  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUser: (user: UserInfo | null) => void;
  
  setRooms: (rooms: GenieRoom[]) => void;
  setSelectedRoom: (room: GenieRoom | null) => void;
  
  setConversation: (roomId: string, conversation: GenieConversation) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  
  addMessage: (message: GenieMessage) => void;
  setMessages: (messages: GenieMessage[]) => void;
  setMessageLoading: (loading: boolean) => void;
  
  reset: () => void;
}

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentUser: null,
  rooms: [],
  selectedRoom: null,
  conversations: new Map(),
  activeConversationId: null,
  messages: [],
  isMessageLoading: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setRooms: (rooms) => set({ rooms }),
  
  setSelectedRoom: (room) => set({ 
    selectedRoom: room,
    messages: [],
    activeConversationId: null,
  }),
  
  setConversation: (_roomId, conversation) =>
    set((state) => {
      const conversations = new Map(state.conversations);
      conversations.set(conversation.id, conversation);
      return { conversations };
    }),
  
  setActiveConversationId: (conversationId) =>
    set({ activeConversationId: conversationId }),
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...(state.messages || []), message],
    })),
  
  setMessages: (messages) => set({ messages: messages || [] }),
  
  setMessageLoading: (loading) => set({ isMessageLoading: loading }),
  
  reset: () => set({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    rooms: [],
    selectedRoom: null,
    conversations: new Map(),
    activeConversationId: null,
    messages: [],
    isMessageLoading: false,
  }),
}));

