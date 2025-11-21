/**
 * Message bubble component for displaying chat messages
 */

import React from 'react';
import { GenieMessage } from '../services/genieApi';
import { useAppStore } from '../store/useAppStore';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: GenieMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const { currentUser } = useAppStore();
  
  // Get user avatar
  const getUserAvatar = () => {
    if (currentUser?.photos && currentUser.photos.length > 0) {
      return currentUser.photos[0].value;
    }
    return null;
  };
  
  // Get user initials
  const getUserInitials = () => {
    if (currentUser?.displayName) {
      const names = currentUser.displayName.split(' ');
      if (names.length >= 2) {
        return names[0][0] + names[names.length - 1][0];
      }
      return names[0][0];
    }
    return 'U';
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="message-attachments">
        {message.attachments.map((attachment, index) => (
          <div key={index} className={`attachment attachment-${attachment.type}`}>
            {attachment.type === 'query_result' && (
              <div className="query-result">
                <div className="query-result-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  <span>Query Result</span>
                </div>
                
                {/* Display actual data results if available */}
                {attachment.results?.result?.data_array && attachment.results.result.data_array.length > 0 && (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {attachment.results.manifest?.schema?.columns?.map((col: any, idx: number) => (
                            <th key={idx}>{col.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attachment.results.result.data_array.map((row: any[], rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.map((value: any, colIndex: number) => (
                              <td key={colIndex}>{value !== null ? String(value) : 'null'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="result-info">
                      {attachment.results.manifest?.schema?.column_count} columns × {attachment.results.result.row_count} rows
                    </div>
                  </div>
                )}
                
                {/* Show empty state if query returned no results */}
                {attachment.results?.result && attachment.results.result.data_array?.length === 0 && (
                  <div className="empty-results">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p>No data found</p>
                  </div>
                )}
                
                {/* Show query details in collapsible section */}
                <details className="query-details">
                  <summary>View SQL Query</summary>
                  <pre className="sql-query">{attachment.content.query}</pre>
                </details>
              </div>
            )}
            {attachment.type === 'visualization' && (
              <div className="visualization">
                <img src={attachment.content} alt="Data visualization" />
              </div>
            )}
            {attachment.type === 'table' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(attachment.content[0] || {}).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attachment.content.map((row: any, rowIndex: number) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value: any, colIndex: number) => (
                          <td key={colIndex}>{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="message-avatar assistant-avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
      )}
      
      {/* Avatar for user */}
      {isUser && (
        <div className="message-avatar user-avatar">
          {getUserAvatar() ? (
            <img src={getUserAvatar()!} alt={currentUser?.displayName || 'User'} />
          ) : (
            <span className="user-initials">{getUserInitials()}</span>
          )}
        </div>
      )}
      
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        {renderAttachments()}
        <div className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

