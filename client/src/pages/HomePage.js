import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CodeBracketIcon, 
  TrophyIcon, 
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      name: 'Practice Coding',
      description: 'Solve programming problems in multiple languages with real-time feedback.',
      icon: CodeBracketIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Compete & Learn',
      description: 'Participate in contests and climb the leaderboard to showcase your skills.',
      icon: TrophyIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Join Discussions',
      description: 'Connect with other learners, ask questions, and share knowledge.',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Virtual Classrooms',
      description: 'Instructors can create classrooms and manage student progress.',
      icon: AcademicCapIcon,
      color: 'bg-purple-500'
    }
  ];

  const stats = [
    { name: 'Problems', value: '500+' },
    { name: 'Users', value: '10,000+' },
    { name: 'Submissions', value: '100,000+' },
    { name: 'Classrooms', value: '500+' }
  ];

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="block">Master Coding</span>
              <span className="block text-blue-300">One Problem at a Time</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Improve your programming skills with our comprehensive platform featuring 
              interactive coding challenges, real-time feedback, and a vibrant learning community.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                {isAuthenticated ? (
                  <Link
                    to="/problems"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Start Coding
                    <PlayIcon className="ml-2 h-5 w-5" />
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Get Started Free
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                )}
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  to="/problems"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Browse Problems
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.name} className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="mt-2 text-sm font-medium text-gray-600">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to master coding
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Our platform provides all the tools and resources you need to become a better programmer.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              {features.map((feature) => (
                <div key={feature.name} className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                  <p className="mt-2 ml-16 text-base text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to start your coding journey?
            </h2>
            <p className="mt-4 text-lg text-blue-200">
              Join thousands of learners improving their coding skills every day.
            </p>
            <div className="mt-8">
              {isAuthenticated ? (
                <Link
                  to="/problems"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10"
                >
                  Start Solving Problems
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10"
                >
                  Sign Up for Free
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;