import { 
  Plus, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BarChart2,
  Settings, 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { logout, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
    { icon: Plus, label: 'Projects', path: '/projects' },
    { icon: BarChart2, label: 'Reports', path: '/reports' },
    { icon: Users, label: 'Team', path: '/team' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <CheckSquare className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamFlow</span>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
