/**
 * Chat interface component for interacting with Genie
 */

import React, { useEffect, useRef, useState } from 'react';
import { genieApi, GenieMessage } from '../services/genieApi';
import { useAppStore } from '../store/useAppStore';
import { MessageBubble } from './MessageBubble';
import { SuggestedQuestions } from './SuggestedQuestions';
import './ChatInterface.css';

export const ChatInterface: React.FC = () => {
  const {
    selectedRoom,
    messages,
    activeConversationId,
    isMessageLoading,
    setMessages,
    addMessage,
    setMessageLoading,
    setActiveConversationId,
    setError,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelRequestRef = useRef(false);

  useEffect(() => {
    // Load conversation history when room changes
    if (selectedRoom) {
      loadConversations();
    }
  }, [selectedRoom]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!selectedRoom) return;

    try {
      const conversations = await genieApi.getConversations(selectedRoom.id);
      if (conversations.length > 0) {
        const latestConversation = conversations[0];
        setActiveConversationId(latestConversation.id);
        setMessages(latestConversation.messages || []);
      } else {
        setMessages([]);
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setMessages([]);
    }
  };

  const handleCancelRequest = () => {
    console.log('🛑 User requested to cancel current request');
    cancelRequestRef.current = true;
    setMessageLoading(false);
    
    // Add a system message
    addMessage({
      id: `system-${Date.now()}`,
      content: 'Request cancelled',
      role: 'assistant',
      timestamp: new Date().toISOString(),
    });
  };

  const sendMessageWithText = async (messageText: string) => {
    if (!selectedRoom) return;

    setInputValue('');
    setMessageLoading(true);
    cancelRequestRef.current = false; // Reset cancel flag

    // Add user message immediately for better UX
    const tempUserMessage: GenieMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    addMessage(tempUserMessage);

    try {
      console.log('📤 Sending message:', {
        roomId: selectedRoom.id,
        conversationId: activeConversationId,
        messageContent: messageText.substring(0, 50) + '...'
      });
      
      const response = await genieApi.sendMessage(selectedRoom.id, {
        content: messageText,
        conversation_id: activeConversationId || undefined,
      });

      console.log('📨 Message submitted:', {
        messageId: response.message_id,
        conversationId: response.conversation_id,
        hasActiveConversation: !!activeConversationId,
        userQuestion: messageText.substring(0, 50)
      });

      // Update conversation ID (always, in case it changes)
      if (response.conversation_id) {
        setActiveConversationId(response.conversation_id);
        console.log('💾 Saved conversation ID:', response.conversation_id);
      }

      // Poll for the response (Genie processes asynchronously)
      const pollForResponse = async () => {
        const maxAttempts = 60; // 2 minutes max
        const pollInterval = 2000; // Check every 2 seconds
        
        console.log(`🔄 Starting to poll for NEW message response`);
        console.log(`   User asked: "${messageText}"`);
        console.log(`   Room: ${selectedRoom.id}`);
        console.log(`   Conversation: ${response.conversation_id}`);
        console.log(`   Polling for Message ID: ${response.message_id}`);
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          // Check if user cancelled
          if (cancelRequestRef.current) {
            console.log('🛑 Polling cancelled by user');
            return;
          }
          
          console.log(`⏱️ Poll attempt ${attempt + 1}/${maxAttempts}`);
          
          try {
            // Try polling the specific message first (most direct approach)
            try {
              const messageStatus = await genieApi.getMessage(
                selectedRoom.id,
                response.conversation_id,
                response.message_id
              );
              
              console.log(`📊 Poll attempt ${attempt + 1}: status = ${messageStatus.status}`);
              
              // Check if message is completed
              if (messageStatus.status === 'COMPLETED') {
                console.log('✅ Message completed!', messageStatus);
                // The actual response is in attachments
                if (messageStatus.attachments && messageStatus.attachments.length > 0) {
                  // Look for text or query attachment
                  const textAttachment = messageStatus.attachments.find((a: any) => a.text);
                  const queryAttachment = messageStatus.attachments.find((a: any) => a.query);
                  
                  let responseContent = null;
                  let queryResults = null;
                  
                  if (textAttachment && textAttachment.text.content) {
                    responseContent = textAttachment.text.content;
                  } else if (queryAttachment && queryAttachment.query.description) {
                    responseContent = queryAttachment.query.description;
                    
                    // Fetch actual query results if statement_id is available
                    if (queryAttachment.query.statement_id) {
                      try {
                        console.log('📊 Fetching query results for statement:', queryAttachment.query.statement_id);
                        const statementResults = await genieApi.getStatementResults(
                          queryAttachment.query.statement_id
                        );
                        queryResults = statementResults;
                        console.log('✅ Got query results:', statementResults);
                        
                        // Check if results are empty
                        const hasData = statementResults?.result?.data_array && 
                                      statementResults.result.data_array.length > 0;
                        
                        if (!hasData) {
                          // Add clarification message for empty results
                          responseContent += '\n\n⚠️ The query returned no results. This could mean:\n' +
                            '• The data doesn\'t exist in the current timeframe\n' +
                            '• The filters are too restrictive\n' +
                            '• There might be a typo in the search criteria\n\n' +
                            'Could you provide more details or try rephrasing your question?';
                        }
                      } catch (err) {
                        console.error('❌ Failed to fetch query results:', err);
                      }
                    }
                  }
                  
                  if (responseContent) {
                    const assistantMessage = {
                      id: messageStatus.message_id || messageStatus.id || `assistant-${Date.now()}`,
                      content: responseContent,
                      role: 'assistant' as const,
                      timestamp: new Date(messageStatus.last_updated_timestamp || Date.now()).toISOString(),
                      attachments: messageStatus.attachments.map((a: any) => ({
                        type: a.query ? 'query_result' : a.text ? 'text' : 'unknown',
                        content: a.query || a.text?.content || a,
                        metadata: a,
                        results: queryResults, // Add the actual data results
                      })),
                    };
                    
                    console.log('✅ Adding assistant response:', {
                      messageId: assistantMessage.id,
                      content: responseContent.substring(0, 100) + '...',
                      conversationId: response.conversation_id
                    });
                    
                    addMessage(assistantMessage);
                    return;
                  } else {
                    console.log('⚠️ No text or query attachment found in completed message');
                  }
                } else {
                  console.log('⚠️ No attachments found in completed message');
                }
              } else if (messageStatus.status === 'FAILED' || messageStatus.status === 'CANCELLED') {
                console.error('❌ Message failed with status:', messageStatus.status);
                throw new Error(`Message ${messageStatus.status.toLowerCase()}`);
              }
            } catch (msgError: any) {
              console.log(`⚠️ getMessage failed (attempt ${attempt + 1}):`, msgError.response?.status, msgError.message);
              // Don't use fallback - we need to wait for THIS specific message to complete
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          } catch (pollError) {
            console.error('❌ Error in poll iteration:', pollError);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
        
        // Timeout - no response received
        console.error('❌ Timeout: No response received after all polling attempts');
        throw new Error('Timeout waiting for Genie response after 2 minutes');
      };

      await pollForResponse();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error?.message || 'Failed to send message');
      
      // Remove the temporary user message on error
      setMessages(messages.filter(m => m.id !== tempUserMessage.id));
      
      // Add error message
      const errorMessage: GenieMessage = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setMessageLoading(false);
    }
  };

  const handleSendMessage = async () => {
    // If currently loading, cancel instead of sending
    if (isMessageLoading) {
      handleCancelRequest();
      return;
    }
    
    if (!inputValue.trim() || !selectedRoom) return;

    const userMessage = inputValue.trim();
    await sendMessageWithText(userMessage);
  };

  const handleSuggestedQuestionClick = async (question: string) => {
    await sendMessageWithText(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  if (!selectedRoom) {
    return (
      <div className="chat-interface empty">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <h3>No room selected</h3>
          <p>Select a Genie room to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {!messages || messages.length === 0 ? (
          <SuggestedQuestions onQuestionClick={handleSuggestedQuestionClick} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isMessageLoading && (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          ref={inputRef}
          className="message-input"
          placeholder={isMessageLoading ? "Processing request..." : "Ask Genie a question..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={`send-button ${isMessageLoading ? 'cancel-mode' : ''}`}
          onClick={handleSendMessage}
          disabled={!isMessageLoading && !inputValue.trim()}
          aria-label={isMessageLoading ? "Cancel request" : "Send message"}
          title={isMessageLoading ? "Cancel request" : "Send message"}
        >
          {isMessageLoading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="12" height="12" fill="white"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

