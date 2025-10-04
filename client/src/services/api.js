import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (!response.data?.data?.token || !response.data?.data?.user) {
      throw new Error('Invalid server response');
    }
    return response;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (!response.data?.data?.token || !response.data?.data?.user) {
      throw new Error('Invalid server response');
    }
    return response;
  },
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/password', passwordData),
};

// Problems API
export const problemsAPI = {
  getProblems: (params) => api.get('/problems', { params }),
  getProblemOfTheDay: () => api.get('/problems/problem-of-the-day'),
  getProblem: (id) => api.get(`/problems/${id}`),
  createProblem: (problemData) => api.post('/problems', problemData),
  updateProblem: (id, problemData) => api.put(`/problems/${id}`, problemData),
  deleteProblem: (id) => api.delete(`/problems/${id}`),
  bookmarkProblem: (id) => api.post(`/problems/${id}/bookmark`),
  getCategories: () => api.get('/problems/categories/list'),
};

// Submissions API
export const submissionsAPI = {
  submitCode: (submissionData) => api.post('/submissions', submissionData),
  getSubmission: (id) => api.get(`/submissions/${id}`),
  getProblemSubmissions: (problemId, params) => api.get(`/submissions/problem/${problemId}`, { params }),
  getUserSubmissions: (params) => api.get('/submissions/user/all', { params }),
  getStats: () => api.get('/submissions/stats/overview'),
};

// Users API
export const usersAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  searchUsers: (params) => api.get('/users/search/query', { params }),
  getUserSubmissions: (id, params) => api.get(`/users/${id}/submissions`, { params }),
  getSolvedProblems: (id) => api.get(`/users/${id}/solved`),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, null, { params: { role } }),
  updateUserStatus: (id, isActive) => api.put(`/users/${id}/status`, null, { params: { isActive } }),
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobalLeaderboard: (params) => api.get('/leaderboard', { params }),
  getInstitutionLeaderboard: (institution, params) => api.get(`/leaderboard/institution/${institution}`, { params }),
  getTopContributors: (params) => api.get('/leaderboard/contributors/top', { params }),
};

// Forum API
export const forumAPI = {
  getPosts: (params) => api.get('/forum', { params }),
  getPost: (id) => api.get(`/forum/${id}`),
  createPost: (postData) => api.post('/forum', postData),
  updatePost: (id, postData) => api.put(`/forum/${id}`, postData),
  deletePost: (id) => api.delete(`/forum/${id}`),
  votePost: (id, voteType) => api.post(`/forum/${id}/vote`, { voteType }),
  replyToPost: (id, replyData) => api.post(`/forum/${id}/reply`, replyData),
  markPostAsSolved: (id) => api.post(`/forum/${id}/solve`),
  pinPost: (id) => api.post(`/forum/${id}/pin`),
  lockPost: (id) => api.post(`/forum/${id}/lock`),
};

// Classrooms API
export const classroomsAPI = {
  getClassrooms: (params) => api.get('/classrooms', { params }),
  getClassroom: (id) => api.get(`/classrooms/${id}`),
  createClassroom: (classroomData) => api.post('/classrooms', classroomData),
  updateClassroom: (id, classroomData) => api.put(`/classrooms/${id}`, classroomData),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),
  joinClassroom: (id, joinCode) => api.post(`/classrooms/${id}/join`, { joinCode }),
  leaveClassroom: (id) => api.post(`/classrooms/${id}/leave`),
  addTeachingAssistant: (id, userId) => api.post(`/classrooms/${id}/ta`, { userId }),
  removeTeachingAssistant: (id, userId) => api.delete(`/classrooms/${id}/ta/${userId}`),
  addProblemToClassroom: (id, problemData) => api.post(`/classrooms/${id}/problems`, problemData),
  removeProblemFromClassroom: (id, problemId) => api.delete(`/classrooms/${id}/problems/${problemId}`),
  getClassroomAnalytics: (id) => api.get(`/classrooms/${id}/analytics`),
};

export default api;