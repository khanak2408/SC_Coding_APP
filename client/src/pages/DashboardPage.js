import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { problemsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ClockIcon, CpuChipIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { DIFFICULTY_LEVELS } from '../utils/constants';

const DashboardPage = () => {
  const { user } = useAuth();

  const {
    data: problemData,
    isLoading,
    error,
  } = useQuery('problemOfTheDay', problemsAPI.getProblemOfTheDay, {
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const getDifficultyColor = (difficulty) => {
    const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
    return level ? level.color : 'gray';
  };

  const renderProblemOfTheDay = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error || !problemData?.data) {
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Could not load Problem of the Day</h2>
          <p className="text-gray-600">
            {error?.message || 'There might be no problems available. Please check back later.'}
          </p>
        </div>
      );
    }

    const problem = problemData.data;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem of the Day</h2>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{problem.title}</h3>
          {problem.isSolved && (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Solved</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 mb-4">
          <span className={`badge difficulty-${getDifficultyColor(problem.difficulty)}`}>
            {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
          </span>
          <span className="text-sm text-gray-500">
            {problem.category.charAt(0).toUpperCase() + problem.category.slice(1)}
          </span>
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="h-4 w-4 mr-1" />
            {problem.timeLimit}s
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <CpuChipIcon className="h-4 w-4 mr-1" />
            {problem.memoryLimit}MB
          </div>
        </div>
        <p className="text-gray-700 mb-6 line-clamp-3">{problem.description}</p>
        <Link to={`/problems/${problem._id}`} className="btn btn-primary w-full sm:w-auto">
          Solve Problem
        </Link>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to CodeLearn, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Start your coding journey by tackling today's challenge.
        </p>
      </div>

      {renderProblemOfTheDay()}

      {/* You can add more dashboard widgets here in the future */}
    </div>
  );
};

export default DashboardPage;