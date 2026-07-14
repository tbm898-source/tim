import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Bot,
  MonitorSmartphone,
  Wrench,
  ShieldCheck,
  Settings,
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Megaphone,
  FileEdit,
} from 'lucide-react';
import { DESKTOP_NAV_ITEMS } from '@/nav.config';

const ICONS = {
  SETH: Bot,
  ClassroomPublisher: Megaphone,
  ClassroomDraftHelper: FileEdit,
  CourseGenerator: BookOpen,
  InstructorFeedbackAssistant: MessageSquare,
  Devices: MonitorSmartphone,
  Dashboard: BarChart3,
  AssetManagement: Wrench,
  IntegrityMonitoring: ShieldCheck,
  TalentInsights: Users,
  UserSettings: Settings,
};

export default function TopNav() {
  const location = useLocation();

  const isActive = (item) => {
    const path = item.path || createPageUrl(item.page);
    if (item.alsoActive?.includes(location.pathname)) return true;
    if (path === '/') return location.pathname === '/' || location.pathname === '/SETH';
    return location.pathname === path;
  };

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-white/10 sticky top-0 z-50">
      <div className="flex items-center gap-1">
        <Link to="/" className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-lg font-bold text-cyan-300 tracking-wider">TIM</span>
        </Link>
        {DESKTOP_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.page] || GraduationCap;
          const path = item.path || createPageUrl(item.page);
          const active = isActive(item);
          return (
            <Link
              key={item.name}
              to={path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
