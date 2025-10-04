const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Post, User, Problem, Classroom } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all posts with filtering and pagination
router.get('/', optionalAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('category')
    .optional()
    .isIn(['question', 'discussion', 'announcement', 'bug-report', 'feature-request'])
    .withMessage('Invalid category'),
  query('problem')
    .optional()
    .isMongoId()
    .withMessage('Invalid problem ID'),
  query('classroom')
    .optional()
    .isMongoId()
    .withMessage('Invalid classroom ID'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('sort')
    .optional()
    .isIn(['latest', 'popular', 'unanswered'])
    .withMessage('Invalid sort option')
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
    const sort = req.query.sort || 'latest';
    
    // Build filter
    let filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.problem) {
      filter.problem = req.query.problem;
    }
    
    if (req.query.classroom) {
      filter.classroom = req.query.classroom;
    }
    
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'popular':
        sortOptions = { upvotes: -1, views: -1, createdAt: -1 };
        break;
      case 'unanswered':
        sortOptions = { replies: 1, createdAt: -1 };
        break;
      default:
        sortOptions = { isPinned: -1, createdAt: -1 };
    }

    // Get posts
    const posts = await Post.find(filter)
      .populate('author', 'username firstName lastName avatar')
      .populate('problem', 'title difficulty')
      .populate('classroom', 'name code')
      .populate('solvedBy', 'username firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Post.countDocuments(filter);

    // Increment view count for each post (only for non-search requests)
    if (!req.query.search && req.user) {
      posts.forEach(async (post) => {
        await post.incrementViews();
      });
    }

    res.json({
      success: true,
      data: {
        posts: posts.map(post => post.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching posts'
    });
  }
});

// Get post by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username firstName lastName avatar role')
      .populate('problem', 'title difficulty')
      .populate('classroom', 'name code')
      .populate('solvedBy', 'username firstName lastName')
      .populate('replies.author', 'username firstName lastName avatar role');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    if (req.user) {
      await post.incrementViews();
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching post'
    });
  }
});

// Create a new post
router.post('/', authenticate, [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .trim(),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10,000 characters'),
  body('category')
    .isIn(['question', 'discussion', 'announcement', 'bug-report', 'feature-request'])
    .withMessage('Invalid category'),
  body('problem')
    .optional()
    .isMongoId()
    .withMessage('Invalid problem ID'),
  body('classroom')
    .optional()
    .isMongoId()
    .withMessage('Invalid classroom ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('code')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Code cannot exceed 10,000 characters'),
  body('language')
    .optional()
    .isIn(['cpp', 'python', 'java', 'javascript', ''])
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

    const { title, content, category, problem, classroom, tags, code, language } = req.body;

    // Validate problem and classroom if provided
    if (problem) {
      const problemExists = await Problem.findById(problem);
      if (!problemExists) {
        return res.status(400).json({
          success: false,
          message: 'Problem not found'
        });
      }
    }

    if (classroom) {
      const classroomExists = await Classroom.findById(classroom);
      if (!classroomExists) {
        return res.status(400).json({
          success: false,
          message: 'Classroom not found'
        });
      }
    }

    // Create post
    const post = new Post({
      title,
      content,
      author: req.user._id,
      category,
      problem,
      classroom,
      tags: tags || [],
      code: code || '',
      language: language || ''
    });

    await post.save();

    // Populate author details for response
    await post.populate('author', 'username firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post.getSummary()
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating post'
    });
  }
});

// Update a post
router.put('/:id', authenticate, [
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .trim(),
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10,000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('code')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Code cannot exceed 10,000 characters'),
  body('language')
    .optional()
    .isIn(['cpp', 'python', 'java', 'javascript', ''])
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

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has permission to edit this post
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to edit this post'
      });
    }

    // Update allowed fields
    const allowedFields = ['title', 'content', 'tags', 'code', 'language'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        post[field] = req.body[field];
      }
    });

    post.updatedAt = new Date();
    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: post.getSummary()
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating post'
    });
  }
});

// Delete a post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has permission to delete this post
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this post'
      });
    }

    await Post.findByIdAndDelete(post._id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting post'
    });
  }
});

// Vote on a post
router.post('/:id/vote', authenticate, [
  body('voteType')
    .isIn(['up', 'down'])
    .withMessage('Vote type must be up or down')
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

    const { voteType } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.vote(req.user._id, voteType);

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        upvotes: post.upvotes,
        downvotes: post.downvotes
      }
    });
  } catch (error) {
    console.error('Vote post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while voting on post'
    });
  }
});

// Add a reply to a post
router.post('/:id/reply', authenticate, [
  body('content')
    .notEmpty()
    .withMessage('Reply content is required')
    .isLength({ min: 5, max: 5000 })
    .withMessage('Reply content must be between 5 and 5,000 characters'),
  body('code')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Code cannot exceed 10,000 characters'),
  body('language')
    .optional()
    .isIn(['cpp', 'python', 'java', 'javascript', ''])
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

    const { content, code, language } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is locked
    if (post.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Post is locked for new replies'
      });
    }

    await post.addReply(req.user._id, content, code || '', language || '');

    // Populate the new reply
    await post.populate('replies.author', 'username firstName lastName avatar');

    const newReply = post.replies[post.replies.length - 1];

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: newReply
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reply'
    });
  }
});

// Mark post as solved
router.post('/:id/solve', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has permission to mark as solved
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to mark this post as solved'
      });
    }

    await post.markAsSolved(req.user._id);

    res.json({
      success: true,
      message: 'Post marked as solved successfully',
      data: {
        isSolved: post.isSolved,
        solvedBy: post.solvedBy
      }
    });
  } catch (error) {
    console.error('Mark post as solved error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking post as solved'
    });
  }
});

// Pin/unpin a post (admin/instructor only)
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has permission to pin
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to pin this post'
      });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({
      success: true,
      message: `Post ${post.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: {
        isPinned: post.isPinned
      }
    });
  } catch (error) {
    console.error('Pin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while pinning post'
    });
  }
});

// Lock/unlock a post (admin/instructor only)
router.post('/:id/lock', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user has permission to lock
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to lock this post'
      });
    }

    post.isLocked = !post.isLocked;
    await post.save();

    res.json({
      success: true,
      message: `Post ${post.isLocked ? 'locked' : 'unlocked'} successfully`,
      data: {
        isLocked: post.isLocked
      }
    });
  } catch (error) {
    console.error('Lock post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while locking post'
    });
  }
});

module.exports = router;