const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['cpp', 'python', 'java', 'javascript'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',
      'compiling',
      'running',
      'accepted',
      'wrong-answer',
      'time-limit-exceeded',
      'memory-limit-exceeded',
      'runtime-error',
      'compilation-error',
      'partial-correct'
    ],
    default: 'pending'
  },
  result: {
    score: {
      type: Number,
      default: 0
    },
    maxScore: {
      type: Number,
      default: 0
    },
    timeTaken: {
      type: Number,
      default: 0 // in milliseconds
    },
    memoryUsed: {
      type: Number,
      default: 0 // in KB
    },
    testCasesPassed: {
      type: Number,
      default: 0
    },
    totalTestCases: {
      type: Number,
      default: 0
    },
    testCaseResults: [{
      testCaseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      passed: {
        type: Boolean,
        default: false
      },
      timeTaken: {
        type: Number,
        default: 0
      },
      memoryUsed: {
        type: Number,
        default: 0
      },
      input: String,
      expectedOutput: String,
      actualOutput: String,
      error: String
    }]
  },
  compilationInfo: {
    success: {
      type: Boolean,
      default: false
    },
    output: String,
    error: String,
    compilationTime: {
      type: Number,
      default: 0
    }
  },
  executionInfo: {
    startTime: Date,
    endTime: Date,
    totalTime: {
      type: Number,
      default: 0
    }
  },
  feedback: {
    type: String,
    default: ''
  },
  isPlagiarized: {
    type: Boolean,
    default: false
  },
  plagiarismScore: {
    type: Number,
    default: 0
  },
  similarSubmissions: [{
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    },
    similarity: {
      type: Number,
      default: 0
    }
  }],
  attemptNumber: {
    type: Number,
    default: 1
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient querying
submissionSchema.index({ user: 1, problem: 1 });
submissionSchema.index({ problem: 1, status: 1 });
submissionSchema.index({ user: 1, submittedAt: -1 });
submissionSchema.index({ status: 1, submittedAt: -1 });

// Method to get submission summary
submissionSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    user: this.user,
    problem: this.problem,
    language: this.language,
    status: this.status,
    score: this.result.score,
    maxScore: this.result.maxScore,
    timeTaken: this.result.timeTaken,
    memoryUsed: this.result.memoryUsed,
    testCasesPassed: this.result.testCasesPassed,
    totalTestCases: this.result.totalTestCases,
    submittedAt: this.submittedAt
  };
};

// Method to get detailed submission results
submissionSchema.methods.getDetails = function() {
  return {
    _id: this._id,
    user: this.user,
    problem: this.problem,
    code: this.code,
    language: this.language,
    status: this.status,
    result: this.result,
    compilationInfo: this.compilationInfo,
    executionInfo: this.executionInfo,
    feedback: this.feedback,
    isPlagiarized: this.isPlagiarized,
    plagiarismScore: this.plagiarismScore,
    attemptNumber: this.attemptNumber,
    submittedAt: this.submittedAt
  };
};

// Method to update submission status and results
submissionSchema.methods.updateStatus = function(status, result = null, compilationInfo = null) {
  this.status = status;
  if (result) {
    this.result = { ...this.result, ...result };
  }
  if (compilationInfo) {
    this.compilationInfo = { ...this.compilationInfo, ...compilationInfo };
  }
  return this.save();
};

// Pre-save middleware to update execution info
submissionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending') {
    this.executionInfo.endTime = new Date();
    if (this.executionInfo.startTime) {
      this.executionInfo.totalTime = this.executionInfo.endTime - this.executionInfo.startTime;
    }
  }
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);