/**
 * Main application component
 */

import { useEffect, useState, useRef } from 'react';
import { authService } from './services/auth';
import { useAppStore } from './store/useAppStore';
import { genieApi } from './services/genieApi';
import { ChatInterface } from './components/ChatInterface';
import { SplashScreen } from './components/SplashScreen';
import { ConversationHistory } from './components/ConversationHistory';
import './App.css';

function App() {
  const { isAuthenticated, selectedRoom, currentUser, setAuthenticated, setSelectedRoom, setError, setCurrentUser, setActiveConversationId, setMessages } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    const isFirstLoad = !hasInitializedRef.current;
    
    try {
      await authService.initialize();
      setAuthenticated(authService.isAuthenticated());
      
      // Get current user info
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        console.log('👤 Current user loaded:', user.displayName);
      }
      
      // Auto-load and select the configured room
      const rooms = await genieApi.getRooms();
      if (rooms.length > 0) {
        // The first room should be the configured one (moved to front in getRooms)
        const configuredSpaceId = genieApi.getDefaultSpaceId();
        setSelectedRoom(rooms[0]);
        console.log('✅ Auto-selected room:', rooms[0].name, `(ID: ${rooms[0].id})`);
        console.log('📋 Configured GENIE_SPACE_ID:', configuredSpaceId);
        
        // Warn if selected room doesn't match configuration
        if (configuredSpaceId && rooms[0].id !== configuredSpaceId) {
          console.warn('⚠️ WARNING: Selected room does not match configured GENIE_SPACE_ID!');
          console.warn('   Configured:', configuredSpaceId);
          console.warn('   Selected:', rooms[0].id, '-', rooms[0].name);
          console.warn('   All available rooms:', rooms.map(r => `${r.id} - ${r.name}`));
        }
      }
      
      // Keep splash screen visible for at least 2 seconds for smooth UX (only on first load)
      if (isFirstLoad) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error('Failed to initialize app:', error);
      setError(error?.message || 'Failed to initialize application');
    } finally {
      hasInitializedRef.current = true;
      
      // Only show splash screen on first initialization
      if (isFirstLoad) {
        // Trigger fade-out animation
        setSplashFadeOut(true);
        // Remove splash after animation completes
        setTimeout(() => setShowSplash(false), 800);
      } else {
        // Skip splash on refresh - already hidden
        console.log('🔄 Refresh complete (no splash)');
      }
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!selectedRoom) return;

    try {
      console.log('📂 Loading conversation:', conversationId);
      
      // Set the conversation ID
      setActiveConversationId(conversationId);
      
      // Load messages for this conversation
      const response = await genieApi.getConversationMessages(selectedRoom.id, conversationId);
      const messageList = response.messages || response;
      
      console.log('📨 Loaded messages:', messageList);
      
      if (Array.isArray(messageList) && messageList.length > 0) {
        // Sort messages by timestamp (oldest first)
        const sortedMessages = messageList.sort((a: any, b: any) => {
          const aTime = a.created_timestamp || 0;
          const bTime = b.created_timestamp || 0;
          return aTime - bTime; // Ascending order (oldest first)
        });
        
        const formattedMessages: any[] = [];
        
        for (const msg of sortedMessages) {
          // Each message from the API is a user's question
          // When COMPLETED, it contains Genie's answer in attachments
          
          // Always add the user's question first
          formattedMessages.push({
            id: msg.message_id || msg.id,
            content: msg.content,
            role: 'user' as const,
            timestamp: new Date(msg.created_timestamp || Date.now()).toISOString(),
          });
          
          // If the message is completed, add Genie's response as a separate message
          if (msg.status === 'COMPLETED' && msg.attachments && msg.attachments.length > 0) {
            // Extract Genie's answer from attachments
            const textAttachment = msg.attachments.find((a: any) => a.text);
            const queryAttachment = msg.attachments.find((a: any) => a.query);
            
            let answerContent = '';
            if (textAttachment && textAttachment.text.content) {
              answerContent = textAttachment.text.content;
            } else if (queryAttachment && queryAttachment.query.description) {
              answerContent = queryAttachment.query.description;
            }
            
            // Fetch query results if available
            const processedAttachments = await Promise.all(msg.attachments.map(async (att: any) => {
              const attachment: any = {
                type: att.query ? 'query_result' : att.text ? 'text' : 'table',
                content: att.text?.content || att.query?.description || '',
                metadata: att.query || att.text || {},
              };
              
              // Fetch query results if statement_id is available
              if (att.query && att.query.statement_id) {
                try {
                  console.log('📊 Fetching query results for statement:', att.query.statement_id);
                  const statementResults = await genieApi.getStatementResults(att.query.statement_id);
                  attachment.results = statementResults;
                  console.log('✅ Got query results for old message');
                } catch (err) {
                  console.error('❌ Failed to fetch query results:', err);
                }
              }
              
              return attachment;
            }));
            
            // Add assistant's response
            formattedMessages.push({
              id: `${msg.message_id}-response`,
              content: answerContent,
              role: 'assistant' as const,
              timestamp: new Date(msg.last_updated_timestamp || msg.created_timestamp || Date.now()).toISOString(),
              attachments: processedAttachments,
            });
          }
        }
        
        console.log('✅ Formatted messages (sorted):', formattedMessages);
        setMessages(formattedMessages);
      } else {
        console.warn('⚠️ No messages found in conversation');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Failed to load conversation:', error);
      setError('Failed to load conversation');
    }
  };

  // Show splash screen only during first initialization
  if (showSplash) {
    return (
      <div className={splashFadeOut ? 'splash-wrapper fade-out' : 'splash-wrapper'}>
        <SplashScreen />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-error">
        <div className="error-container">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h2>Authentication Required</h2>
          <p>Please authenticate with Databricks to continue</p>
          <button className="retry-button" onClick={initializeApp}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app perplexity-layout">
      {/* Mobile Overlay */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
      )}

      {/* Left Sidebar */}
      <aside className={`sidebar ${showSidebar ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-top">
          {/* Logo */}
          <div className="sidebar-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l-5.5 9h11z"/>
              <circle cx="17.5" cy="17.5" r="4.5"/>
              <rect x="3" y="17" width="9" height="4"/>
            </svg>
          </div>

          {/* Navigation Icons */}
          <nav className="sidebar-nav">
            <button
              className="nav-item active"
              title="Home"
              onClick={() => {
                initializeApp();
                setShowSidebar(false);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span className="nav-label">Home</span>
            </button>

            <button
              className="nav-item"
              title="History"
              onClick={() => {
                setShowHistory(true);
                setShowSidebar(false);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
              <span className="nav-label">History</span>
            </button>

            <button
              className="nav-item"
              title="Refresh"
              onClick={() => {
                initializeApp();
                setShowSidebar(false);
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span className="nav-label">Refresh</span>
            </button>
          </nav>
        </div>

        {/* User Profile at Bottom - Empty spacer */}
        <div className="sidebar-bottom"></div>
      </aside>

      {/* Main Content */}
      <main className="main-container">
        {/* Top Bar with Branding and User */}
        <div className="top-bar">
          {/* Hamburger Menu (mobile only) */}
          <button
            className="hamburger-menu-button"
            onClick={() => setShowSidebar(!showSidebar)}
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>

          {/* Branding (center on mobile, left on desktop) */}
          <div className="brand-header">
            <h1 className="brand-title">
              genie<span className="brand-subtitle">{selectedRoom?.name || 'assistant'}</span>
            </h1>
          </div>

          {/* User Profile (right) */}
          {currentUser && (
            <div className="user-profile-top">
              <span className="user-name-full">{currentUser.displayName}</span>
              <div className="user-avatar-top">
                {currentUser.photos?.[0]?.value ? (
                  <img src={currentUser.photos[0].value} alt="User" />
                ) : (
                  <span className="user-initials">
                    {currentUser.displayName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Content */}
        <div className="content-wrapper">
          <ChatInterface />
        </div>
      </main>

      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectConversation={handleSelectConversation}
      />
    </div>
  );
}

export default App;

