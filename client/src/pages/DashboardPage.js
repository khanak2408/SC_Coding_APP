import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to CodeLearn, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            This is your dashboard. Start solving problems to improve your coding skills.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;