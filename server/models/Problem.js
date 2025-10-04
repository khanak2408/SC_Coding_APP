const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true
  },
  output: {
    type: String,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  explanation: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 10
  }
});

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
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
      'binary-search'
    ]
  },
  subcategory: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  timeLimit: {
    type: Number,
    required: true,
    default: 1 // in seconds
  },
  memoryLimit: {
    type: Number,
    required: true,
    default: 256 // in MB
  },
  inputFormat: {
    type: String,
    required: true
  },
  outputFormat: {
    type: String,
    required: true
  },
  constraints: {
    type: String,
    required: true
  },
  sampleInput: {
    type: String,
    required: true
  },
  sampleOutput: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },
  testCases: [testCaseSchema],
  solution: {
    cpp: String,
    python: String,
    java: String,
    javascript: String
  },
  hints: [{
    type: String
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  submissions: {
    total: {
      type: Number,
      default: 0
    },
    successful: {
      type: Number,
      default: 0
    },
    partial: {
      type: Number,
      default: 0
    }
  },
  points: {
    type: Number,
    required: true,
    default: 10
  },
  maxAttempts: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  allowedLanguages: [{
    type: String,
    enum: ['cpp', 'python', 'java', 'javascript'],
    default: ['cpp', 'python']
  }],
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient searching
problemSchema.index({ title: 'text', description: 'text', tags: 'text' });
problemSchema.index({ difficulty: 1, category: 1 });
problemSchema.index({ isPublic: 1, isApproved: 1 });

// Method to get problem summary for listings
problemSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    title: this.title,
    difficulty: this.difficulty,
    category: this.category,
    tags: this.tags,
    points: this.points,
    submissions: this.submissions,
    successRate: this.submissions.total > 0 ? 
      Math.round((this.submissions.successful / this.submissions.total) * 100) : 0,
    createdAt: this.createdAt
  };
};

// Method to get problem details for solving
problemSchema.methods.getDetails = function() {
  return {
    _id: this._id,
    title: this.title,
    description: this.description,
    difficulty: this.difficulty,
    category: this.category,
    subcategory: this.subcategory,
    tags: this.tags,
    timeLimit: this.timeLimit,
    memoryLimit: this.memoryLimit,
    inputFormat: this.inputFormat,
    outputFormat: this.outputFormat,
    constraints: this.constraints,
    sampleInput: this.sampleInput,
    sampleOutput: this.sampleOutput,
    explanation: this.explanation,
    hints: this.hints,
    points: this.points,
    allowedLanguages: this.allowedLanguages,
    submissions: this.submissions,
    successRate: this.submissions.total > 0 ? 
      Math.round((this.submissions.successful / this.submissions.total) * 100) : 0,
    createdAt: this.createdAt
  };
};

// Method to update submission statistics
problemSchema.methods.updateSubmissionStats = function(isSuccessful, isPartial = false) {
  this.submissions.total += 1;
  if (isSuccessful) {
    this.submissions.successful += 1;
  } else if (isPartial) {
    this.submissions.partial += 1;
  }
  return this.save();
};

module.exports = mongoose.model('Problem', problemSchema);