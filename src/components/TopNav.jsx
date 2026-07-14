import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MonitorSmartphone, Wrench, ShieldCheck, Settings, BarChart3, Users, GraduationCap, BookOpen, MessageSquare, Megaphone, FileEdit } from 'lucide-react';

const navItems = [
  { name: 'TIM', path: '/', icon: Bot },
  { name: 'SETH', path: '/SETH', icon: GraduationCap },
  { name: 'Classroom AI', path: '/ClassroomPublisher', icon: Megaphone },
  { name: 'Classroom Draft', path: '/ClassroomDraftHelper', icon: FileEdit },
  { name: 'Courses', path: '/CourseGenerator', icon: BookOpen },
  { name: 'Feedback', path: '/InstructorFeedbackAssistant', icon: MessageSquare },
  { name: 'Devices', path: '/Devices', icon: MonitorSmartphone },
  { name: 'Dashboard', path: '/Dashboard', icon: BarChart3 },
  { name: 'Assets', path: '/AssetManagement', icon: Wrench },
  { name: 'Integrity', path: '/IntegrityMonitoring', icon: ShieldCheck },
  { name: 'Talent', path: '/TalentInsights', icon: Users },
  { name: 'Settings', path: '/UserSettings', icon: Settings },
];

export default function TopNav() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/SETH') return location.pathname === '/SETH' || location.pathname === '/';
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
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