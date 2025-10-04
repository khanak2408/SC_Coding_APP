const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Problem, Submission, User } = require('../models');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all problems with filtering and pagination
router.get('/', optionalAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  query('category')
    .optional()
    .isAlpha()
    .withMessage('Category must contain only letters'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('classroom')
    .optional()
    .isMongoId()
    .withMessage('Invalid classroom ID')
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
    let filter = { isPublic: true, isApproved: true };
    
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.classroom) {
      filter.classroom = req.query.classroom;
      delete filter.isPublic; // Classroom problems can be private
    }
    
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Get problems
    const problems = await Problem.find(filter)
      .populate('author', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-testCases -solution');

    // Get total count for pagination
    const total = await Problem.countDocuments(filter);

    // Add user-specific information if authenticated
    let problemsWithUserInfo = problems;
    if (req.user) {
      problemsWithUserInfo = await Promise.all(problems.map(async (problem) => {
        const problemObj = problem.toObject();
        
        // Check if user has solved this problem
        const solvedSubmission = await Submission.findOne({
          user: req.user._id,
          problem: problem._id,
          status: 'accepted'
        });
        
        problemObj.isSolved = !!solvedSubmission;
        
        // Check if user has bookmarked this problem
        if (req.user.bookmarks.includes(problem._id)) {
          problemObj.isBookmarked = true;
        }
        
        return problemObj;
      }));
    }

    res.json({
      success: true,
      data: {
        problems: problemsWithUserInfo.map(p => p.getSummary ? p.getSummary() : p),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching problems'
    });
  }
});

// Get Problem of the Day
router.get('/problem-of-the-day', authenticate, async (req, res) => {
  try {
    const randomProblem = await Problem.aggregate([
      { $match: { isPublic: true, isApproved: true } },
      { $sample: { size: 1 } }
    ]);

    if (!randomProblem || randomProblem.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No "Problem of the Day" found.'
      });
    }

    const problem = await Problem.findById(randomProblem[0]._id)
      .populate('author', 'username firstName lastName')
      .select('-testCases -solution');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem of the Day details not found.'
      });
    }

    const problemSummary = problem.getSummary ? problem.getSummary() : problem.toObject();

    // Check if user has solved this problem
    const solvedSubmission = await Submission.findOne({
      user: req.user._id,
      problem: problem._id,
      status: 'accepted'
    });

    problemSummary.isSolved = !!solvedSubmission;

    // Check if user has bookmarked this problem
    if (req.user.bookmarks.includes(problem._id)) {
      problemSummary.isBookmarked = true;
    }

    res.json({
      success: true,
      data: problemSummary
    });
  } catch (error) {
    console.error('Get Problem of the Day error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching Problem of the Day'
    });
  }
});

// Get problem by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('author', 'username firstName lastName');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if user has access to this problem
    if (!problem.isPublic || !problem.isApproved) {
      if (!req.user || (
        problem.author._id.toString() !== req.user._id.toString() &&
        req.user.role !== 'admin' &&
        !problem.classroom
      )) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this problem'
        });
      }
    }

    // Get problem details without test cases
    const problemDetails = problem.getDetails();

    // Add user-specific information if authenticated
    if (req.user) {
      // Check if user has solved this problem
      const solvedSubmission = await Submission.findOne({
        user: req.user._id,
        problem: problem._id,
        status: 'accepted'
      });
      
      problemDetails.isSolved = !!solvedSubmission;
      
      // Check if user has bookmarked this problem
      if (req.user.bookmarks.includes(problem._id)) {
        problemDetails.isBookmarked = true;
      }
      
      // Get user's submissions for this problem
      const userSubmissions = await Submission.find({
        user: req.user._id,
        problem: problem._id
      })
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('status result.score result.maxScore submittedAt language');
      
      problemDetails.userSubmissions = userSubmissions;
    }

    res.json({
      success: true,
      data: problemDetails
    });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching problem'
    });
  }
});

// Create a new problem
router.post('/', authenticate, authorize('instructor', 'admin'), [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim(),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('category')
    .isIn([
      'arrays', 'strings', 'sorting', 'searching', 'graph', 'tree',
      'dynamic-programming', 'greedy', 'backtracking', 'math', 'geometry',
      'bit-manipulation', 'recursion', 'linked-list', 'stack', 'queue',
      'hash-table', 'heap', 'trie', 'binary-search'
    ])
    .withMessage('Invalid category'),
  body('timeLimit')
    .isInt({ min: 0.1, max: 10 })
    .withMessage('Time limit must be between 0.1 and 10 seconds'),
  body('memoryLimit')
    .isInt({ min: 16, max: 1024 })
    .withMessage('Memory limit must be between 16 and 1024 MB'),
  body('inputFormat')
    .notEmpty()
    .withMessage('Input format is required'),
  body('outputFormat')
    .notEmpty()
    .withMessage('Output format is required'),
  body('constraints')
    .notEmpty()
    .withMessage('Constraints are required'),
  body('sampleInput')
    .notEmpty()
    .withMessage('Sample input is required'),
  body('sampleOutput')
    .notEmpty()
    .withMessage('Sample output is required'),
  body('testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),
  body('testCases.*.input')
    .notEmpty()
    .withMessage('Test case input is required'),
  body('testCases.*.output')
    .notEmpty()
    .withMessage('Test case output is required'),
  body('points')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000')
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

    const problemData = {
      ...req.body,
      author: req.user._id
    };

    // Auto-approve problems created by admins
    if (req.user.role === 'admin') {
      problemData.isApproved = true;
    }

    const problem = new Problem(problemData);
    await problem.save();

    res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      data: problem.getSummary()
    });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating problem'
    });
  }
});

// Update a problem
router.put('/:id', authenticate, authorize('instructor', 'admin'), [
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .trim(),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('category')
    .optional()
    .isIn([
      'arrays', 'strings', 'sorting', 'searching', 'graph', 'tree',
      'dynamic-programming', 'greedy', 'backtracking', 'math', 'geometry',
      'bit-manipulation', 'recursion', 'linked-list', 'stack', 'queue',
      'hash-table', 'heap', 'trie', 'binary-search'
    ])
    .withMessage('Invalid category')
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

    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if user has permission to edit this problem
    if (problem.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to edit this problem'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'difficulty', 'category', 'subcategory', 'tags',
      'timeLimit', 'memoryLimit', 'inputFormat', 'outputFormat', 'constraints',
      'sampleInput', 'sampleOutput', 'explanation', 'hints', 'testCases',
      'solution', 'points', 'maxAttempts', 'allowedLanguages', 'isPublic'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        problem[field] = req.body[field];
      }
    });

    problem.updatedAt = new Date();
    await problem.save();

    res.json({
      success: true,
      message: 'Problem updated successfully',
      data: problem.getSummary()
    });
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating problem'
    });
  }
});

// Delete a problem
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if user has permission to delete this problem
    if (problem.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this problem'
      });
    }

    // Check if there are any submissions for this problem
    const submissionCount = await Submission.countDocuments({ problem: problem._id });
    
    if (submissionCount > 0 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete problem with existing submissions'
      });
    }

    await Problem.findByIdAndDelete(problem._id);

    res.json({
      success: true,
      message: 'Problem deleted successfully'
    });
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting problem'
    });
  }
});

// Bookmark/unbookmark a problem
router.post('/:id/bookmark', authenticate, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    const user = req.user;
    const bookmarkIndex = user.bookmarks.indexOf(problem._id);

    if (bookmarkIndex === -1) {
      // Add bookmark
      user.bookmarks.push(problem._id);
      await user.save();
      
      res.json({
        success: true,
        message: 'Problem bookmarked successfully',
        data: { isBookmarked: true }
      });
    } else {
      // Remove bookmark
      user.bookmarks.splice(bookmarkIndex, 1);
      await user.save();
      
      res.json({
        success: true,
        message: 'Bookmark removed successfully',
        data: { isBookmarked: false }
      });
    }
  } catch (error) {
    console.error('Bookmark problem error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while bookmarking problem'
    });
  }
});

// Get problem categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { value: 'arrays', label: 'Arrays' },
      { value: 'strings', label: 'Strings' },
      { value: 'sorting', label: 'Sorting' },
      { value: 'searching', label: 'Searching' },
      { value: 'graph', label: 'Graph' },
      { value: 'tree', label: 'Tree' },
      { value: 'dynamic-programming', label: 'Dynamic Programming' },
      { value: 'greedy', label: 'Greedy' },
      { value: 'backtracking', label: 'Backtracking' },
      { value: 'math', label: 'Math' },
      { value: 'geometry', label: 'Geometry' },
      { value: 'bit-manipulation', label: 'Bit Manipulation' },
      { value: 'recursion', label: 'Recursion' },
      { value: 'linked-list', label: 'Linked List' },
      { value: 'stack', label: 'Stack' },
      { value: 'queue', label: 'Queue' },
      { value: 'hash-table', label: 'Hash Table' },
      { value: 'heap', label: 'Heap' },
      { value: 'trie', label: 'Trie' },
      { value: 'binary-search', label: 'Binary Search' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

module.exports = router;