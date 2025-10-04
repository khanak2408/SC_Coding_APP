import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  CodeBracketIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  UserCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: location.pathname === '/dashboard' },
    { name: 'Problems', href: '/problems', icon: CodeBracketIcon, current: location.pathname.startsWith('/problems') },
    { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon, current: location.pathname === '/leaderboard' },
    { name: 'Forum', href: '/forum', icon: ChatBubbleLeftRightIcon, current: location.pathname.startsWith('/forum') },
    { name: 'Classrooms', href: '/classrooms', icon: AcademicCapIcon, current: location.pathname.startsWith('/classrooms') },
  ];

  const userNavigation = [
    { name: 'Your Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <Link to="/dashboard" className="text-xl font-bold text-gray-900">
          CodeLearn
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`${
              item.current
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md border`}
          >
            <item.icon
              className={`${
                item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
              } mr-3 h-5 w-5`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* User navigation */}
      <div className="flex-shrink-0 border-t border-gray-200 p-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          User
        </div>
        {userNavigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <item.icon className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;