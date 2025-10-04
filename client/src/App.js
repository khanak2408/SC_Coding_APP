import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout components
import Layout from './components/layout/Layout';

// Route protection
import PrivateRoute from './components/common/PrivateRoute';
import PublicRoute from './components/common/PublicRoute';

// Page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProblemsPage from './pages/problems/ProblemsPage';
import ProblemDetailPage from './pages/problems/ProblemDetailPage';
import SubmissionsPage from './pages/SubmissionsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ForumPage from './pages/forum/ForumPage';
import PostDetailPage from './pages/forum/PostDetailPage';
import CreatePostPage from './pages/forum/CreatePostPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ClassroomsPage from './pages/classrooms/ClassroomsPage';
import ClassroomDetailPage from './pages/classrooms/ClassroomDetailPage';
import CreateClassroomPage from './pages/classrooms/CreateClassroomPage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicRoute>
                        <RegisterPage />
                      </PublicRoute>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Layout />
                      </PrivateRoute>
                    }
                  >
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="problems" element={<ProblemsPage />} />
                    <Route path="problems/:id" element={<ProblemDetailPage />} />
                    <Route path="submissions" element={<SubmissionsPage />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="forum" element={<ForumPage />} />
                    <Route path="forum/create" element={<CreatePostPage />} />
                    <Route path="forum/:id" element={<PostDetailPage />} />
                    <Route path="profile/:id" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="classrooms" element={<ClassroomsPage />} />
                    <Route path="classrooms/create" element={<CreateClassroomPage />} />
                    <Route path="classrooms/:id" element={<ClassroomDetailPage />} />
                  </Route>

                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#4ade80',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;