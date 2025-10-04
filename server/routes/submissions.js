const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Submission, Problem, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const codeExecutor = require('../services/codeExecutor');

const router = express.Router();

// Submit code for a problem
router.post('/', authenticate, [
  body('problem')
    .isMongoId()
    .withMessage('Invalid problem ID'),
  body('code')
    .notEmpty()
    .withMessage('Code cannot be empty')
    .isLength({ max: 100000 })
    .withMessage('Code cannot exceed 100,000 characters'),
  body('language')
    .isIn(['cpp', 'python', 'java', 'javascript'])
    .withMessage('Invalid programming language')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { problem: problemId, code, language } = req.body;
    const userId = req.user._id;

    // Check if problem exists and is accessible
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if problem is public or user has access
    if (!problem.isPublic || !problem.isApproved) {
      if (problem.author.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this problem'
        });
      }
    }

    // Check if language is allowed for this problem
    if (!problem.allowedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: `Language ${language} is not allowed for this problem`
      });
    }

    // Check max attempts if specified
    if (problem.maxAttempts > 0) {
      const submissionCount = await Submission.countDocuments({
        user: userId,
        problem: problemId
      });
      
      if (submissionCount >= problem.maxAttempts) {
        return res.status(400).json({
          success: false,
          message: `Maximum attempts (${problem.maxAttempts}) reached for this problem`
        });
      }
    }

    // Get attempt number
    const attemptNumber = await Submission.countDocuments({
      user: userId,
      problem: problemId
    }) + 1;

    // Create submission record
    const submission = new Submission({
      user: userId,
      problem: problemId,
      code,
      language,
      status: 'pending',
      attemptNumber,
      executionInfo: {
        startTime: new Date()
      }
    });

    await submission.save();

    // Start asynchronous execution
    processSubmission(submission._id, problem, code, language);

    res.status(201).json({
      success: true,
      message: 'Submission received and is being processed',
      data: {
        submissionId: submission._id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing submission'
    });
  }
});

// Get submission by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('user', 'username firstName lastName')
      .populate('problem', 'title difficulty');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user has access to this submission
    if (submission.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        submission.problem.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this submission'
      });
    }

    res.json({
      success: true,
      data: submission.getDetails()
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submission'
    });
  }
});

// Get user's submissions for a problem
router.get('/problem/:problemId', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if problem exists
    const problem = await Problem.findById(req.params.problemId);
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Get submissions
    const submissions = await Submission.find({
      user: req.user._id,
      problem: req.params.problemId
    })
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('status result.score result.maxScore submittedAt language attemptNumber');

    // Get total count for pagination
    const total = await Submission.countDocuments({
      user: req.user._id,
      problem: req.params.problemId
    });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get problem submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions'
    });
  }
});

// Get all user submissions with pagination
router.get('/user/all', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn([
      'pending', 'compiling', 'running', 'accepted', 'wrong-answer',
      'time-limit-exceeded', 'memory-limit-exceeded', 'runtime-error',
      'compilation-error', 'partial-correct'
    ])
    .withMessage('Invalid status'),
  query('language')
    .optional()
    .isIn(['cpp', 'python', 'java', 'javascript'])
    .withMessage('Invalid programming language')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { user: req.user._id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.language) {
      filter.language = req.query.language;
    }

    // Get submissions
    const submissions = await Submission.find(filter)
      .populate('problem', 'title difficulty')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('status result.score result.maxScore submittedAt language problem');

    // Get total count for pagination
    const total = await Submission.countDocuments(filter);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions'
    });
  }
});

// Get submission statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get submission statistics
    const stats = await Submission.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get language statistics
    const languageStats = await Submission.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent submissions
    const recentSubmissions = await Submission.find({ user: userId })
      .populate('problem', 'title difficulty')
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('status result.score submittedAt problem');

    // Get solved problems count
    const solvedProblems = await Submission.distinct('problem', {
      user: userId,
      status: 'accepted'
    });

    res.json({
      success: true,
      data: {
        totalSubmissions: stats.reduce((sum, stat) => sum + stat.count, 0),
        acceptedSubmissions: stats.find(s => s._id === 'accepted')?.count || 0,
        solvedProblems: solvedProblems.length,
        stats,
        languageStats,
        recentSubmissions
      }
    });
  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submission statistics'
    });
  }
});

// Process submission asynchronously
async function processSubmission(submissionId, problem, code, language) {
  try {
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      console.error(`Submission ${submissionId} not found`);
      return;
    }

    // Update status to compiling
    submission.status = 'compiling';
    await submission.save();

    // Execute code
    const result = await codeExecutor.execute(
      submissionId,
      code,
      language,
      problem.testCases,
      problem.timeLimit * 1000, // Convert to milliseconds
      problem.memoryLimit * 1024 * 1024 // Convert to bytes
    );

    // Update submission with results
    if (result.success) {
      submission.status = result.status;
      submission.result = {
        score: result.score,
        maxScore: result.maxScore,
        timeTaken: result.timeTaken,
        memoryUsed: result.memoryUsed,
        testCasesPassed: result.testCasesPassed,
        totalTestCases: result.totalTestCases,
        testCaseResults: result.testCaseResults
      };
    } else {
      submission.status = result.status;
      submission.compilationInfo = {
        success: false,
        error: result.error
      };
    }

    await submission.save();

    // Update problem statistics
    await problem.updateSubmissionStats(
      submission.status === 'accepted',
      submission.status === 'partial-correct'
    );

    // Update user statistics
    await updateUserStats(submission.user, submission.status, submission.status === 'accepted');

  } catch (error) {
    console.error('Process submission error:', error);
    
    // Update submission with error
    try {
      const submission = await Submission.findById(submissionId);
      if (submission) {
        submission.status = 'runtime-error';
        submission.compilationInfo = {
          success: false,
          error: error.message
        };
        await submission.save();
      }
    } catch (saveError) {
      console.error('Error updating submission status:', saveError);
    }
  }
}

// Update user statistics after submission
async function updateUserStats(userId, status, isSuccessful) {
  try {
    const user = await User.findById(userId);
    
    if (!user) return;

    // Update submission statistics
    user.statistics.totalSubmissions += 1;
    
    if (isSuccessful) {
      user.statistics.successfulSubmissions += 1;
      
      // Check if this is a new problem solved
      const submission = await Submission.findOne({
        user: userId,
        status: 'accepted'
      }).sort({ submittedAt: -1 });
      
      if (submission) {
        const alreadySolved = await Submission.exists({
          user: userId,
          problem: submission.problem,
          status: 'accepted',
          _id: { $ne: submission._id }
        });
        
        if (!alreadySolved) {
          user.statistics.problemsSolved += 1;
          user.statistics.points += 10; // Default points for solving a problem
        }
      }
    }

    await user.save();
  } catch (error) {
    console.error('Update user stats error:', error);
  }
}

module.exports = router;