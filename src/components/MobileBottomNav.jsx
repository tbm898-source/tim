import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bot, MonitorSmartphone, Wrench, ShieldCheck, Settings, BarChart3, Users, Home, QrCode, Award } from 'lucide-react';
import { MOBILE_NAV_ITEMS } from '@/nav.config';

const ICONS = {
  Dashboard: Home,
  AssetScanner: QrCode,
  SETH: Bot,
  Achievements: Award,
};

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.page];
          const path = createPageUrl(item.page);
          const active = location.pathname === path;
          return (
            <Link
              key={item.name}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full select-none ${
                active ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
