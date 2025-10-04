const express = require('express');
const { query } = require('express-validator');
const { User, Submission } = require('../models');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get global leaderboard
router.get('/', optionalAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('timeframe')
    .optional()
    .isIn(['all-time', 'monthly', 'weekly', 'daily'])
    .withMessage('Invalid timeframe'),
  query('category')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const timeframe = req.query.timeframe || 'all-time';
    const category = req.query.category;

    // Calculate date range based on timeframe
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'daily':
        dateFilter = {
          $gte: new Date(now.setHours(0, 0, 0, 0))
        };
        break;
      case 'weekly':
        dateFilter = {
          $gte: new Date(now.setDate(now.getDate() - 7))
        };
        break;
      case 'monthly':
        dateFilter = {
          $gte: new Date(now.setMonth(now.getMonth() - 1))
        };
        break;
      default:
        dateFilter = null;
    }

    // Build aggregation pipeline
    let pipeline = [
      {
        $match: {
          isActive: true
        }
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          role: 1,
          'statistics.points': 1,
          'statistics.problemsSolved': 1,
          'statistics.successfulSubmissions': 1,
          'statistics.totalSubmissions': 1
        }
      }
    ];

    // Add timeframe filter if specified
    if (dateFilter) {
      pipeline.unshift({
        $lookup: {
          from: 'submissions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$status', 'accepted'] },
                    { $gte: ['$submittedAt', dateFilter.$gte] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                recentPoints: { $sum: 10 }, // Assuming 10 points per accepted submission
                recentSolved: { $addToSet: '$problem' }
              }
            }
          ],
          as: 'recentStats'
        }
      });

      pipeline.push({
        $addFields: {
          'statistics.points': {
            $ifNull: [{ $arrayElemAt: ['$recentStats.recentPoints', 0] }, 0]
          },
          'statistics.problemsSolved': {
            $ifNull: [{ $size: { $arrayElemAt: ['$recentStats.recentSolved', 0] } }, 0]
          }
        }
      });
    }

    // Add category filter if specified
    if (category) {
      pipeline.unshift({
        $lookup: {
          from: 'submissions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$status', 'accepted'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'problems',
                localField: 'problem',
                foreignField: '_id',
                as: 'problem'
              }
            },
            { $unwind: '$problem' },
            {
              $match: {
                'problem.category': category
              }
            },
            {
              $group: {
                _id: null,
                categoryPoints: { $sum: 10 }, // Assuming 10 points per accepted submission
                categorySolved: { $addToSet: '$problem' }
              }
            }
          ],
          as: 'categoryStats'
        }
      });

      pipeline.push({
        $addFields: {
          'statistics.points': {
            $ifNull: [{ $arrayElemAt: ['$categoryStats.categoryPoints', 0] }, 0]
          },
          'statistics.problemsSolved': {
            $ifNull: [{ $size: { $arrayElemAt: ['$categoryStats.categorySolved', 0] } }, 0]
          }
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      {
        $sort: {
          'statistics.points': -1,
          'statistics.problemsSolved': -1,
          'statistics.successfulSubmissions': -1,
          username: 1
        }
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          count: [
            { $count: 'total' }
          ]
        }
      }
    );

    const result = await User.aggregate(pipeline);
    const users = result[0].data;
    const total = result[0].count[0]?.total || 0;

    // Add rank to each user
    const rankedUsers = users.map((user, index) => ({
      ...user,
      rank: skip + index + 1
    }));

    // Find current user's rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const currentUserPipeline = [...pipeline];
      
      // Remove pagination and find current user
      currentUserPipeline.pop();
      currentUserPipeline.push(
        {
          $match: { _id: req.user._id }
        },
        {
          $project: {
            rank: { $add: [{ $indexOfArray: ['$_id', req.user._id] }, 1] }
          }
        }
      );

      const currentUserResult = await User.aggregate(currentUserPipeline);
      if (currentUserResult.length > 0) {
        currentUserRank = currentUserResult[0].rank;
      }
    }

    res.json({
      success: true,
      data: {
        users: rankedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        timeframe,
        category,
        currentUserRank
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard'
    });
  }
});

// Get leaderboard by institution
router.get('/institution/:institution', optionalAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
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
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const institution = req.params.institution;

    const users = await User.find({
      institution: { $regex: institution, $options: 'i' },
      isActive: true
    })
    .select('username firstName lastName avatar role statistics')
    .sort({
      'statistics.points': -1,
      'statistics.problemsSolved': -1,
      'statistics.successfulSubmissions': -1,
      username: 1
    })
    .skip(skip)
    .limit(limit);

    const total = await User.countDocuments({
      institution: { $regex: institution, $options: 'i' },
      isActive: true
    });

    // Add rank to each user
    const rankedUsers = users.map((user, index) => ({
      ...user.toObject(),
      rank: skip + index + 1
    }));

    res.json({
      success: true,
      data: {
        users: rankedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        institution
      }
    });
  } catch (error) {
    console.error('Get institution leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching institution leaderboard'
    });
  }
});

// Get top contributors (by problems created)
router.get('/contributors/top', [
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

    const limit = parseInt(req.query.limit) || 20;

    const contributors = await User.aggregate([
      {
        $lookup: {
          from: 'problems',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$author', '$$userId'] },
                    { $eq: ['$isApproved', true] },
                    { $eq: ['$isPublic', true] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                problemsCreated: { $sum: 1 },
                totalSubmissions: { $sum: '$submissions.total' }
              }
            }
          ],
          as: 'contributions'
        }
      },
      {
        $addFields: {
          problemsCreated: { $ifNull: [{ $arrayElemAt: ['$contributions.problemsCreated', 0] }, 0] },
          totalSubmissions: { $ifNull: [{ $arrayElemAt: ['$contributions.totalSubmissions', 0] }, 0] }
        }
      },
      {
        $match: {
          problemsCreated: { $gt: 0 }
        }
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          role: 1,
          problemsCreated: 1,
          totalSubmissions: 1
        }
      },
      {
        $sort: {
          problemsCreated: -1,
          totalSubmissions: -1,
          username: 1
        }
      },
      {
        $limit: limit
      }
    ]);

    res.json({
      success: true,
      data: contributors
    });
  } catch (error) {
    console.error('Get top contributors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top contributors'
    });
  }
});

module.exports = router;