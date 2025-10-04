const express = require('express');
const { query } = require('express-validator');
const { User, Submission } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('achievements', 'name description icon category points');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional statistics
    const submissionStats = await Submission.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const solvedProblems = await Submission.distinct('problem', {
      user: user._id,
      status: 'accepted'
    });

    const userProfile = user.getPublicProfile();
    userProfile.additionalStats = {
      submissionStats,
      solvedProblemsCount: solvedProblems.length
    };

    res.json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

// Search users
router.get('/search/query', [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters'),
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
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.q;

    // Search users
    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username firstName lastName role avatar statistics.points statistics.problemsSolved')
    .sort({ 'statistics.points': -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
});

// Get user's submissions
router.get('/:id/submissions', [
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
    .withMessage('Invalid status')
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

    // Check if user exists
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build filter
    let filter = { user: req.params.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
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
      message: 'Server error while fetching user submissions'
    });
  }
});

// Get user's solved problems
router.get('/:id/solved', async (req, res) => {
  try {
    // Check if user exists
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get solved problems
    const solvedProblems = await Submission.aggregate([
      { $match: { user: user._id, status: 'accepted' } },
      { $group: { _id: '$problem', firstSolvedAt: { $min: '$submittedAt' } } },
      { $sort: { firstSolvedAt: -1 } },
      {
        $lookup: {
          from: 'problems',
          localField: '_id',
          foreignField: '_id',
          as: 'problem'
        }
      },
      { $unwind: '$problem' },
      {
        $project: {
          _id: '$problem._id',
          title: '$problem.title',
          difficulty: '$problem.difficulty',
          category: '$problem.category',
          points: '$problem.points',
          firstSolvedAt: '$firstSolvedAt'
        }
      }
    ]);

    res.json({
      success: true,
      data: solvedProblems
    });
  } catch (error) {
    console.error('Get solved problems error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching solved problems'
    });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticate, authorize('admin'), [
  query('role')
    .isIn(['student', 'instructor', 'admin'])
    .withMessage('Invalid role')
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

    const { role } = req.query;
    const userId = req.params.id;

    // Don't allow users to change their own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        userId: user._id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
});

// Deactivate/activate user (admin only)
router.put('/:id/status', authenticate, authorize('admin'), [
  query('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

    const { isActive } = req.query;
    const userId = req.params.id;

    // Don't allow users to deactivate themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive === 'true';
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        userId: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

module.exports = router;