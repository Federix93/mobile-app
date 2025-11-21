/**
 * Suggested questions component for new conversations
 */

import React, { useEffect, useState } from 'react';
import { genieApi } from '../services/genieApi';
import { useAppStore } from '../store/useAppStore';
import './SuggestedQuestions.css';

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const DEFAULT_QUESTIONS = [
  {
    icon: '📊',
    text: 'Explain the dataset',
    category: 'Overview'
  },
  {
    icon: '📋',
    text: 'Show me the available tables',
    category: 'Data'
  }
];

// Icons based on question content
const getIconForQuestion = (question: string): string => {
  const q = question.toLowerCase();
  if (q.includes('top') || q.includes('most') || q.includes('highest')) return '🏆';
  if (q.includes('trend') || q.includes('over time') || q.includes('growth')) return '📈';
  if (q.includes('city') || q.includes('region') || q.includes('location') || q.includes('where')) return '🌍';
  if (q.includes('product') || q.includes('item') || q.includes('medicine')) return '💊';
  if (q.includes('revenue') || q.includes('sales') || q.includes('profit')) return '💰';
  if (q.includes('month') || q.includes('year') || q.includes('date') || q.includes('when')) return '📅';
  if (q.includes('compare') || q.includes('difference') || q.includes('versus')) return '⚖️';
  if (q.includes('customer') || q.includes('user') || q.includes('client')) return '👥';
  if (q.includes('performance') || q.includes('metric') || q.includes('kpi')) return '📊';
  return '💡';
};

const getCategoryForQuestion = (question: string): string => {
  const q = question.toLowerCase();
  if (q.includes('top') || q.includes('most') || q.includes('highest') || q.includes('best')) return 'Rankings';
  if (q.includes('trend') || q.includes('over time') || q.includes('growth')) return 'Trends';
  if (q.includes('city') || q.includes('region') || q.includes('location')) return 'Geography';
  if (q.includes('revenue') || q.includes('sales') || q.includes('profit')) return 'Finance';
  if (q.includes('compare') || q.includes('difference') || q.includes('versus')) return 'Comparison';
  if (q.includes('customer') || q.includes('user')) return 'Customer';
  if (q.includes('performance') || q.includes('metric')) return 'Performance';
  return 'Analysis';
};

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onQuestionClick }) => {
  const { selectedRoom } = useAppStore();
  const [questions, setQuestions] = useState<Array<{ icon: string; text: string; category: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSuggestedQuestions = async () => {
      if (!selectedRoom) return;

      setIsLoading(true);
      try {
        const suggested = await genieApi.getSuggestedQuestions(selectedRoom.id);
        
        if (suggested.length > 0) {
          // Convert API questions to our format
          const formattedQuestions = suggested.slice(0, 6).map(q => ({
            icon: getIconForQuestion(q),
            text: q,
            category: getCategoryForQuestion(q)
          }));
          setQuestions(formattedQuestions);
        } else {
          // Use default questions if none provided
          setQuestions(DEFAULT_QUESTIONS);
        }
      } catch (error) {
        console.error('Failed to load suggested questions:', error);
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestedQuestions();
  }, [selectedRoom]);

  if (isLoading) {
    return (
      <div className="suggested-questions">
        <div className="suggested-header">
          <div className="suggested-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </div>
          <div className="suggested-text">
            <h3>Loading suggestions...</h3>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="suggested-questions">
      <div className="suggested-header">
        <svg className="magic-lamp-large" width="100" height="100" viewBox="0 0 100 100" fill="none">
          {/* Magic smoke/genie coming out */}
          <g className="genie-smoke">
            <path d="M50 25 Q45 20, 43 15 Q42 10, 45 8 Q48 6, 50 8 Q52 6, 55 8 Q58 10, 57 15 Q55 20, 50 25 Z" 
                  fill="url(#smokeGradient)" opacity="0.7">
              <animateTransform attributeName="transform" type="scale" 
                values="1 1; 1.1 1.2; 1 1" dur="3s" repeatCount="indefinite"/>
            </path>
            <path d="M50 20 Q48 17, 47 14 Q46 11, 48 10 Q50 9, 52 10 Q54 11, 53 14 Q52 17, 50 20 Z" 
                  fill="url(#smokeGradient2)" opacity="0.5">
              <animateTransform attributeName="transform" type="scale" 
                values="1 1; 1.15 1.3; 1 1" dur="2.5s" repeatCount="indefinite"/>
            </path>
          </g>

          {/* Lamp body - more elegant shape */}
          <path d="M35 70 Q32 65, 33 58 L35 45 Q36 38, 40 35 Q45 32, 50 32 Q55 32, 60 35 Q64 38, 65 45 L67 58 Q68 65, 65 70 Z" 
                fill="url(#lampBodyGradient)" stroke="#D4AF37" strokeWidth="1.5"/>
          
          {/* Lamp decorative bands */}
          <ellipse cx="50" cy="45" rx="17" ry="2" fill="#B8860B" opacity="0.6"/>
          <ellipse cx="50" cy="52" rx="18" ry="2" fill="#B8860B" opacity="0.6"/>
          
          {/* Lamp spout - elegant curve */}
          <path d="M33 55 Q25 52, 22 48 Q20 45, 22 43" 
                stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round"/>
          
          {/* Lamp handle - elegant curve */}
          <path d="M67 55 Q75 52, 78 48 Q80 45, 78 43" 
                stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round"/>
          
          {/* Lamp top/lid */}
          <ellipse cx="50" cy="32" rx="11" ry="4" fill="url(#lampTopGradient)"/>
          <path d="M45 28 L45 25 Q45 23, 47 23 L53 23 Q55 23, 55 25 L55 28" 
                fill="#D4AF37" stroke="#B8860B" strokeWidth="1"/>
          
          {/* Lamp base */}
          <ellipse cx="50" cy="70" rx="15" ry="5" fill="url(#lampBaseGradient)"/>
          
          {/* Sparkles - more dynamic */}
          <g className="sparkles-dynamic">
            <circle cx="50" cy="15" r="2.5" fill="#FFD700">
              <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="r" values="2;3;2" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="43" cy="18" r="1.5" fill="#FFA500">
              <animate attributeName="opacity" values="0;0.8;0" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
              <animate attributeName="cy" values="18;12;18" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="57" cy="18" r="1.5" fill="#FFA500">
              <animate attributeName="opacity" values="0;0.8;0" dur="2s" begin="0.6s" repeatCount="indefinite"/>
              <animate attributeName="cy" values="18;12;18" dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="48" cy="12" r="1" fill="#FFD700">
              <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="0.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="52" cy="12" r="1" fill="#FFD700">
              <animate attributeName="opacity" values="0;1;0" dur="1.7s" begin="0.8s" repeatCount="indefinite"/>
            </circle>
            
            {/* Star sparkles */}
            <g transform="translate(45, 10)">
              <path d="M0,-2 L0.5,0 L2,0.5 L0.5,0 L0,2 L-0.5,0 L-2,0.5 L-0.5,0 Z" fill="white">
                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
                <animateTransform attributeName="transform" type="rotate" 
                  values="0 0 0; 180 0 0; 360 0 0" dur="3s" repeatCount="indefinite"/>
              </path>
            </g>
            <g transform="translate(55, 10)">
              <path d="M0,-2 L0.5,0 L2,0.5 L0.5,0 L0,2 L-0.5,0 L-2,0.5 L-0.5,0 Z" fill="white">
                <animate attributeName="opacity" values="0;1;0" dur="2.3s" begin="0.5s" repeatCount="indefinite"/>
                <animateTransform attributeName="transform" type="rotate" 
                  values="0 0 0; -180 0 0; -360 0 0" dur="3.5s" repeatCount="indefinite"/>
              </path>
            </g>
          </g>
          
          <defs>
            <linearGradient id="lampBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700"/>
              <stop offset="30%" stopColor="#FFA500"/>
              <stop offset="70%" stopColor="#FF8C00"/>
              <stop offset="100%" stopColor="#FFD700"/>
            </linearGradient>
            <linearGradient id="lampTopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700"/>
              <stop offset="100%" stopColor="#DAA520"/>
            </linearGradient>
            <linearGradient id="lampBaseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B8860B"/>
              <stop offset="100%" stopColor="#DAA520"/>
            </linearGradient>
            <linearGradient id="smokeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#764ba2" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3"/>
            </linearGradient>
            <linearGradient id="smokeGradient2" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#764ba2" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="suggested-text">
          <h3>How can I help you today?</h3>
          <p>Try asking one of these questions to get started</p>
        </div>
      </div>

      <div className="suggestions-grid">
        {questions.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-card"
            onClick={() => onQuestionClick(suggestion.text)}
          >
            <div className="suggestion-icon">{suggestion.icon}</div>
            <div className="suggestion-content">
              <span className="suggestion-category">{suggestion.category}</span>
              <span className="suggestion-text">{suggestion.text}</span>
            </div>
            <div className="suggestion-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="suggestions-footer">
        <p>Or ask your own question about your data</p>
      </div>
    </div>
  );
};

