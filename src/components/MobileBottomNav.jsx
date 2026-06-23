import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MonitorSmartphone, Wrench, ShieldCheck } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/SETH';
    return location.pathname === path;
  };

  const navItems = [
    { name: 'TIM', path: '/', icon: Bot },
    { name: 'Devices', path: '/Devices', icon: MonitorSmartphone },
    { name: 'Systems', path: '/AssetManagement', icon: Wrench },
    { name: 'Integrity', path: '/IntegrityMonitoring', icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
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