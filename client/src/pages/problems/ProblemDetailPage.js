import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  CpuChipIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  BookmarkIcon,
  BookmarkSlashIcon
} from '@heroicons/react/24/outline';
import { problemsAPI, submissionsAPI } from '../../services/api';
import { SUPPORTED_LANGUAGES, DIFFICULTY_LEVELS, SUBMISSION_STATUSES } from '../../utils/constants';
import CodeEditor from '../../components/editor/CodeEditor';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const ProblemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('problem');
  const [testResults, setTestResults] = useState(null);

  // Fetch problem details
  const { data: problem, isLoading, error } = useQuery(
    ['problem', id],
    () => problemsAPI.getProblem(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        // Set default language based on user preference or problem's first allowed language
        if (user?.profile?.preferredLanguage) {
          setLanguage(user.profile.preferredLanguage);
        } else if (data.data.allowedLanguages?.length > 0) {
          setLanguage(data.data.allowedLanguages[0]);
        }
      }
    }
  );

  // Bookmark mutation
  const bookmarkMutation = useMutation(
    () => problemsAPI.bookmarkProblem(id),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['problem', id]);
        toast.success(data.data.isBookmarked ? 'Problem bookmarked!' : 'Bookmark removed!');
      },
      onError: (error) => {
        toast.error(error.message);
      }
    }
  );

  // Submit code mutation
  const submitMutation = useMutation(
    (submissionData) => submissionsAPI.submitCode(submissionData),
    {
      onSuccess: (data) => {
        toast.success('Code submitted successfully!');
        setActiveTab('submissions');
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['problem', id]);
        
        // Poll for submission results
        const submissionId = data.data.submissionId;
        pollSubmissionResults(submissionId);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsSubmitting(false);
      }
    }
  );

  // Poll for submission results
  const pollSubmissionResults = async (submissionId) => {
    const maxAttempts = 30; // Maximum 30 attempts (30 seconds)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const result = await submissionsAPI.getSubmission(submissionId);
        
        if (result.data.status === SUBMISSION_STATUSES.PENDING || 
            result.data.status === SUBMISSION_STATUSES.COMPILING || 
            result.data.status === SUBMISSION_STATUSES.RUNNING) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll every second
          } else {
            toast.error('Submission is taking too long. Please check back later.');
            setIsSubmitting(false);
          }
        } else {
          setTestResults(result.data);
          setIsSubmitting(false);
          
          // Show success/error message based on status
          if (result.data.status === SUBMISSION_STATUSES.ACCEPTED) {
            toast.success('Congratulations! Your solution passed all test cases.');
          } else {
            toast.error(`Submission ${result.data.status.replace('-', ' ')}.`);
          }
        }
      } catch (error) {
        console.error('Error polling submission results:', error);
        setIsSubmitting(false);
      }
    };
    
    poll();
  };

  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error('Please write some code before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    submitMutation.mutate({
      problem: id,
      code,
      language
    });
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate();
  };

  const getDifficultyColor = (difficulty) => {
    const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty);
    return level ? level.color : 'gray';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      [SUBMISSION_STATUSES.ACCEPTED]: 'green',
      [SUBMISSION_STATUSES.WRONG_ANSWER]: 'red',
      [SUBMISSION_STATUSES.TIME_LIMIT_EXCEEDED]: 'orange',
      [SUBMISSION_STATUSES.MEMORY_LIMIT_EXCEEDED]: 'purple',
      [SUBMISSION_STATUSES.RUNTIME_ERROR]: 'red',
      [SUBMISSION_STATUSES.COMPILATION_ERROR]: 'red',
      [SUBMISSION_STATUSES.PARTIAL_CORRECT]: 'yellow',
      [SUBMISSION_STATUSES.PENDING]: 'gray',
      [SUBMISSION_STATUSES.COMPILING]: 'blue',
      [SUBMISSION_STATUSES.RUNNING]: 'blue'
    };
    return statusColors[status] || 'gray';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Problem not found</h2>
        <p className="text-gray-600 mb-4">The problem you're looking for doesn't exist or you don't have access to it.</p>
        <button
          onClick={() => navigate('/problems')}
          className="btn btn-primary"
        >
          Back to Problems
        </button>
      </div>
    );
  }

  const problemData = problem?.data;

  if (!problemData) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{problemData.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`badge difficulty-${getDifficultyColor(problemData.difficulty)}`}>
                {problemData.difficulty.charAt(0).toUpperCase() + problemData.difficulty.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                {problemData.category.charAt(0).toUpperCase() + problemData.category.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                {problemData.points} points
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                {problemData.timeLimit}s
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <CpuChipIcon className="h-4 w-4 mr-1" />
                {problemData.memoryLimit}MB
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {problemData.isSolved && (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                <span className="text-sm font-medium">Solved</span>
              </div>
            )}
            
            <button
              onClick={handleBookmark}
              className="btn btn-ghost"
              disabled={bookmarkMutation.isLoading}
            >
              {problemData.isBookmarked ? (
                <BookmarkSlashIcon className="h-5 w-5" />
              ) : (
                <BookmarkIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Description */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Problem Description</h2>
            </div>
            <div className="card-body">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{problemData.description}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Input Format</h3>
            </div>
            <div className="card-body">
              <div className="code-block">
                <pre>{problemData.inputFormat}</pre>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Output Format</h3>
            </div>
            <div className="card-body">
              <div className="code-block">
                <pre>{problemData.outputFormat}</pre>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Constraints</h3>
            </div>
            <div className="card-body">
              <div className="code-block">
                <pre>{problemData.constraints}</pre>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Sample Input</h3>
            </div>
            <div className="card-body">
              <div className="code-block">
                <pre>{problemData.sampleInput}</pre>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Sample Output</h3>
            </div>
            <div className="card-body">
              <div className="code-block">
                <pre>{problemData.sampleOutput}</pre>
              </div>
            </div>
          </div>

          {problemData.explanation && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Explanation</h3>
              </div>
              <div className="card-body">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{problemData.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Code Editor */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Solution</h2>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input text-sm"
                  disabled={isSubmitting}
                >
                  {SUPPORTED_LANGUAGES.filter(lang => 
                    problemData.allowedLanguages.includes(lang.value)
                  ).map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body p-0">
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
                height="500px"
                readOnly={isSubmitting}
              />
            </div>
            <div className="card-footer">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !code.trim()}
                className="btn btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Submitting...</span>
                  </>
                ) : (
                  'Submit Solution'
                )}
              </button>
            </div>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`badge badge-${getStatusColor(testResults.status)}`}>
                      {testResults.status.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      Score: {testResults.result?.score || 0}/{testResults.result?.maxScore || 0}
                    </span>
                  </div>
                  
                  {testResults.result?.testCaseResults && (
                    <div className="space-y-2">
                      {testResults.result.testCaseResults.map((testCase, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Test Case {index + 1}</span>
                            <div className="flex items-center">
                              {testCase.passed ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              )}
                              <span className="ml-2 text-sm">
                                {testCase.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                          
                          {!testCase.passed && testCase.error && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {testCase.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Previous Submissions */}
          {problemData.userSubmissions && problemData.userSubmissions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Previous Submissions</h3>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {problemData.userSubmissions.map((submission) => (
                    <div key={submission._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className={`badge badge-${getStatusColor(submission.status)}`}>
                          {submission.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">
                          {submission.language.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;