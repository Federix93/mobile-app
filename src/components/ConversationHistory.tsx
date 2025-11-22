/**
 * Conversation history sidebar component
 */

import React, { useEffect, useState } from 'react';
import { genieApi, GenieConversation } from '../services/genieApi';
import { useAppStore } from '../store/useAppStore';
import './ConversationHistory.css';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
}) => {
  const { selectedRoom, activeConversationId } = useAppStore();
  const [conversations, setConversations] = useState<GenieConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && selectedRoom) {
      loadConversations();
    }
  }, [isOpen, selectedRoom]);

  const loadConversations = async () => {
    if (!selectedRoom) return;

    setIsLoading(true);
    try {
      const convos = await genieApi.getConversations(selectedRoom.id);
      // Sort by most recent first
      const sorted = convos.sort((a, b) => {
        const bTime = b.last_updated_timestamp || b.created_timestamp || 0;
        const aTime = a.last_updated_timestamp || a.created_timestamp || 0;
        return bTime - aTime;
      });
      setConversations(sorted);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!selectedRoom) return;
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    setDeletingId(conversationId);
    try {
      console.log('🔄 Deleting conversation:', conversationId, 'from space:', selectedRoom.id);
      await genieApi.deleteConversation(selectedRoom.id, conversationId);
      
      console.log('✅ Conversation deleted successfully');
      
      // Remove from list - check both id and conversation_id fields
      setConversations(prev => prev.filter(c => {
        const cId = c.id || c.conversation_id;
        return cId !== conversationId;
      }));
      
      // If this was the active conversation, clear it
      if (conversationId === activeConversationId) {
        useAppStore.getState().setActiveConversationId(null);
        useAppStore.getState().setMessages([]);
      }
    } catch (error: any) {
      console.error('❌ Deletion error:', error);
      alert(error.message || 'Failed to delete conversation. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Today ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="history-overlay" onClick={onClose} />
      <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="history-header">
          <h2>Chat History</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="history-content">
          {isLoading ? (
            <div className="history-loading">
              <div className="spinner"></div>
              <p>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="history-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="history-list">
              {conversations.map((conversation) => {
                // Use conversation_id if id is not available
                const convId = conversation.id || conversation.conversation_id || '';
                const isDeleting = deletingId === convId;
                
                if (!convId) {
                  console.warn('⚠️ Conversation without ID:', conversation);
                  return null;
                }
                
                return (
                  <div
                    key={convId}
                    className={`history-item ${convId === activeConversationId ? 'active' : ''} ${isDeleting ? 'deleting' : ''}`}
                    onClick={() => {
                      if (!isDeleting) {
                        onSelectConversation(convId);
                        onClose();
                      }
                    }}
                  >
                    <div className="history-item-content">
                      <div className="history-item-title">
                        {conversation.title || 'Untitled Conversation'}
                      </div>
                      <div className="history-item-time">
                        {formatTimestamp(conversation.last_updated_timestamp || conversation.created_timestamp || Date.now())}
                      </div>
                    </div>
                    <button
                      className="delete-button"
                      onClick={(e) => handleDelete(convId, e)}
                      disabled={isDeleting}
                      aria-label="Delete conversation"
                    >
                      {isDeleting ? (
                        <div className="spinner small"></div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="history-footer">
          <button className="new-chat-button" onClick={() => {
            useAppStore.getState().setActiveConversationId(null);
            useAppStore.getState().setMessages([]);
            onClose();
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Chat
          </button>
        </div>
      </div>
    </>
  );
};

