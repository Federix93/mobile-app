/**
 * Animated splash screen component
 */

import React from 'react';
import './SplashScreen.css';

export const SplashScreen: React.FC = () => {
  return (
    <div className="splash-screen-inner">
      <div className="splash-content">
        {/* Animated Logo */}
        <div className="splash-logo">
          <svg viewBox="0 0 100 100" className="logo-svg">
            {/* Databricks-style hexagons */}
            <g className="hexagon-group">
              <polygon 
                points="50,10 80,25 80,55 50,70 20,55 20,25" 
                className="hexagon hexagon-1"
              />
              <polygon 
                points="50,15 75,27 75,51 50,63 25,51 25,27" 
                className="hexagon hexagon-2"
              />
            </g>
            
            {/* Genie spark icon */}
            <g className="spark-group">
              <path 
                d="M50,30 L55,40 L50,45 L55,55 L45,50 L50,45 L45,40 Z" 
                className="spark"
              />
            </g>
            
            {/* Pulsing circle */}
            <circle cx="50" cy="40" r="3" className="pulse-dot" />
          </svg>
        </div>

        {/* App Title */}
        <h1 className="splash-title">
          <span className="title-genie">Genie</span>
          <span className="title-mobile">Mobile</span>
        </h1>

        {/* Loading Animation */}
        <div className="splash-loader">
          <div className="loader-bar">
            <div className="loader-progress"></div>
          </div>
          <p className="loader-text">Initializing your workspace...</p>
        </div>

        {/* Powered by badge */}
        <div className="powered-by">
          <span>Powered by</span>
          <strong>Databricks</strong>
        </div>
      </div>

      {/* Animated background particles */}
      <div className="splash-particles">
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
      </div>
    </div>
  );
};

