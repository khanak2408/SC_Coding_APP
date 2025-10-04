export const SUPPORTED_LANGUAGES = [
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'hard', label: 'Hard', color: 'red' },
];

export const SUBMISSION_STATUSES = {
  PENDING: { value: 'pending', label: 'Pending', color: 'gray' },
  COMPILING: { value: 'compiling', label: 'Compiling', color: 'blue' },
  RUNNING: { value: 'running', label: 'Running', color: 'blue' },
  ACCEPTED: { value: 'accepted', label: 'Accepted', color: 'green' },
  WRONG_ANSWER: { value: 'wrong-answer', label: 'Wrong Answer', color: 'red' },
  TIME_LIMIT_EXCEEDED: { value: 'time-limit-exceeded', label: 'Time Limit Exceeded', color: 'orange' },
  MEMORY_LIMIT_EXCEEDED: { value: 'memory-limit-exceeded', label: 'Memory Limit Exceeded', color: 'purple' },
  RUNTIME_ERROR: { value: 'runtime-error', label: 'Runtime Error', color: 'red' },
  COMPILATION_ERROR: { value: 'compilation-error', label: 'Compilation Error', color: 'red' },
  PARTIAL_CORRECT: { value: 'partial-correct', label: 'Partial Correct', color: 'yellow' },
};

export const PROBLEM_CATEGORIES = [
  'arrays',
  'strings',
  'sorting',
  'searching',
  'graph',
  'tree',
  'dynamic-programming',
  'greedy',
  'backtracking',
  'math',
  'geometry',
  'bit-manipulation',
  'recursion',
  'linked-list',
  'stack',
  'queue',
  'hash-table',
  'heap',
  'trie',
  'binary-search',
];