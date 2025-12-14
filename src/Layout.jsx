import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-black">
      <style>{`
        /* Custom scrollbar for a futuristic look */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #001a1a;
        }
        ::-webkit-scrollbar-thumb {
          background: #00b8b8;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #00ffff;
        }
        
        /* Custom styles for Slider component */
        .slider-track {
            background-color: #003333;
        }
        .slider-range {
            background-color: #00ffff;
        }
        .slider-thumb {
            border: 2px solid #00ffff;
            background-color: #000;
            box-shadow: 0 0 5px #00ffff;
        }
        .slider-thumb:focus-visible {
            outline: none;
            box-shadow: 0 0 0 3px #000, 0 0 0 5px #00ffff;
        }
      `}</style>
      <main>{children}</main>
    </div>
  );
}