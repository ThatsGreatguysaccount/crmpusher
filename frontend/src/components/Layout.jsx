import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Megaphone, LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-slate-900">
      <aside className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">CRMPusher</div>
              <div className="text-slate-500 text-xs">Lead Forwarding</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <Link
            to="/campaigns"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/campaigns')
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Campaigns
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-300 flex-1 truncate">{user?.username}</span>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
