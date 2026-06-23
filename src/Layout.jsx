import React from 'react';
import TopNav from './components/TopNav';
import MobileBottomNav from './components/MobileBottomNav';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-black dark:bg-slate-950 overscroll-none">
      <style>{`
        /* CSS Variables for dark mode support */
        :root {
          --color-background: #000000;
          --color-foreground: #ffffff;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --color-background: #020617;
            --color-foreground: #f1f5f9;
          }
        }

        /* Safe area padding for mobile notches */
        .pt-safe {
          padding-top: env(safe-area-inset-top);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .pl-safe {
          padding-left: env(safe-area-inset-left);
        }
        .pr-safe {
          padding-right: env(safe-area-inset-right);
        }

        /* Disable overscroll bounce */
        body, html {
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }

        .overscroll-none {
          overscroll-behavior: none;
        }

        /* Disable text selection on UI elements */
        button, .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Custom scrollbar */
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

        /* Dark mode scrollbar */
        @media (prefers-color-scheme: dark) {
          ::-webkit-scrollbar-track {
            background: #0f172a;
          }
          ::-webkit-scrollbar-thumb {
            background: #06b6d4;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #22d3ee;
          }
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

        /* Mobile bottom nav padding */
        @media (max-width: 768px) {
          .min-h-screen {
            padding-bottom: calc(4rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <TopNav />
      <main className="pt-safe pl-safe pr-safe">{children}</main>
      <MobileBottomNav />
    </div>
  );
}