import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function MobileHeader({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we should show back button (URL depth > 1)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const showBackButton = pathSegments.length > 1 || location.search;

  if (!showBackButton) return null;

  return (
    <div className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="min-w-[44px] min-h-[44px] -ml-2 text-cyan-400 hover:bg-cyan-400/10"
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      {title && (
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
      )}
    </div>
  );
}