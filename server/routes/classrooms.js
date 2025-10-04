
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Classroom, User, Problem, Submission } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all classrooms with filtering and pagination
router.get('/', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
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
    
    // Build filter based on user role
    let filter = {};
    
    if (req.user.role === 'student') {
      // Students can only see classrooms they're enrolled in
      filter = {
        'students.user': req.user._id,
        'students.isActive': true
      };
    } else if (req.user.role === 'instructor') {
      // Instructors can see classrooms they own or are TAs in
      filter = {
        $or: [
          { instructor: req.user._id },
          { teachingAssistants: req.user._id }
        ]
      };
    }
    
    // Add search filter if provided
    if (req.query.search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { code: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }
    
    // Add public classrooms filter for students
    if (req.user.role === 'student') {
      filter.settings = { allowSelfEnrollment: true };
    }

    // Get classrooms
    const classrooms = await Classroom.find(filter)
      .populate('instructor', 'username firstName lastName avatar')
      .populate('teachingAssistants', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Classroom.countDocuments(filter);

    // Add user-specific information
    const classroomsWithUserInfo = classrooms.map(classroom => {
      const classroomObj = classroom.toObject();
      
      if (req.user.role === 'student') {
        // Check if student is enrolled
        const student = classroom.students.find(s => 
          s.user.toString() === req.user._id.toString()
        );
        classroomObj.isEnrolled = !!student;
        classroomObj.enrolledAt = student ? student.joinedAt : null;
      } else {
        // Check if user is instructor or TA
        classroomObj.isInstructor = classroom.instructor._id.toString() === req.user._id.toString();
        classroomObj.isTA = classroom.teachingAssistants.some(ta => 
          ta._id.toString() === req.user._id.toString()
        );
      }
      
      return classroomObj;
    });

    res.json({
      success: true,
      data: {
        classrooms: classroomsWithUserInfo.map(c => c.getSummary ? c.getSummary() : c),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching classrooms'
    });
  }
});

// Get classroom by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('instructor', 'username firstName lastName avatar email')
      .populate('teachingAssistants', 'username firstName lastName avatar email')
      .populate('students.user', 'username firstName lastName avatar email')
      .populate('problems.problem', 'title difficulty category points')
      .populate('announcements.author', 'username firstName lastName avatar');

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has access to this classroom
    const isInstructor = classroom.instructor._id.toString() === req.user._id.toString();
    const isTA = classroom.teachingAssistants.some(ta => 
      ta._id.toString() === req.user._id.toString()
    );
    const isStudent = classroom.isStudentEnrolled(req.user._id);

    if (!isInstructor && !isTA && !isStudent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this classroom'
      });
    }

    // Add user-specific information
    const classroomObj = classroom.toObject();
    classroomObj.userRole = isInstructor ? 'instructor' : (isTA ? 'ta' : 'student');
    classroomObj.canEdit = isInstructor || isTA;

    res.json({
      success: true,
      data: classroomObj
    });
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching classroom'
    });
  }
});

// Create a new classroom
router.post('/', authenticate, authorize('instructor', 'admin'), [
  body('name')
    .notEmpty()
    .withMessage('Classroom name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Classroom name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('settings.allowSelfEnrollment')
    .optional()
    .isBoolean()
    .withMessage('allowSelfEnrollment must be a boolean'),
  body('settings.requireInstructorApproval')
    .optional()
    .isBoolean()
    .withMessage('requireInstructorApproval must be a boolean'),
  body('settings.showLeaderboard')
    .optional()
    .isBoolean()
    .withMessage('showLeaderboard must be a boolean'),
  body('settings.enableDiscussion')
    .optional()
    .isBoolean()
    .withMessage('enableDiscussion must be a boolean'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date')
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

    const { name, description, settings, startDate, endDate } = req.body;

    // Create classroom
    const classroom = new Classroom({
      name,
      description: description || '',
      instructor: req.user._id,
      settings: {
        isPublic: false,
        allowSelfEnrollment: settings?.allowSelfEnrollment || true,
        requireInstructorApproval: settings?.requireInstructorApproval || false,
        showLeaderboard: settings?.showLeaderboard !== false,
        enableDiscussion: settings?.enableDiscussion !== false
      },
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null
    });

    await classroom.save();

    // Populate instructor details for response
    await classroom.populate('instructor', 'username firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: classroom.getSummary()
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating classroom'
    });
  }
});

// Update a classroom
router.put('/:id', authenticate, [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Classroom name cannot be empty')
    .isLength({ min: 3, max: 100 })
    .withMessage('Classroom name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('settings.allowSelfEnrollment')
    .optional()
    .isBoolean()
    .withMessage('allowSelfEnrollment must be a boolean'),
  body('settings.requireInstructorApproval')
    .optional()
    .isBoolean()
    .withMessage('requireInstructorApproval must be a boolean'),
  body('settings.showLeaderboard')
    .optional()
    .isBoolean()
    .withMessage('showLeaderboard must be a boolean'),
  body('settings.enableDiscussion')
    .optional()
    .isBoolean()
    .withMessage('enableDiscussion must be a boolean'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date')
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

    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to edit this classroom
    const isInstructor = classroom.instructor.toString() === req.user._id.toString();
    const isTA = classroom.teachingAssistants.some(ta => 
      ta.toString() === req.user._id.toString()
    );

    if (!isInstructor && !isTA && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to edit this classroom'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'settings', 'startDate', 'endDate'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'settings') {
          classroom.settings = { ...classroom.settings, ...req.body[field] };
        } else if (field === 'startDate' || field === 'endDate') {
          classroom[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          classroom[field] = req.body[field];
        }
      }
    });

    await classroom.save();

    res.json({
      success: true,
      message: 'Classroom updated successfully',
      data: classroom.getSummary()
    });
  } catch (error) {
    console.error('Update classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating classroom'
    });
  }
});

// Delete a classroom
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to delete this classroom
    if (classroom.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this classroom'
      });
    }

    await Classroom.findByIdAndDelete(classroom._id);

    res.json({
      success: true,
      message: 'Classroom deleted successfully'
    });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting classroom'
    });
  }
});

// Join a classroom (for students)
router.post('/:id/join', authenticate, [
  body('code')
    .notEmpty()
    .withMessage('Classroom code is required')
    .isLength({ min: 4, max: 10 })
    .withMessage('Classroom code must be between 4 and 10 characters')
    .toUpperCase()
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

    const { code } = req.body;
    const classroomId = req.params.id;

    const classroom = await Classroom.findById(classroomId);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if code matches
    if (classroom.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid classroom code'
      });
    }

    // Check if self-enrollment is allowed
    if (!classroom.settings.allowSelfEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Self-enrollment is not allowed for this classroom'
      });
    }

    // Check if user is already enrolled
    if (classroom.isStudentEnrolled(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this classroom'
      });
    }

    // Add student to classroom
    await classroom.addStudent(req.user._id);

    res.json({
      success: true,
      message: 'Successfully joined the classroom',
      data: {
        classroomId: classroom._id,
        classroomName: classroom.name
      }
    });
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while joining classroom'
    });
  }
});

// Leave a classroom (for students)
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user is enrolled
    if (!classroom.isStudentEnrolled(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not enrolled in this classroom'
      });
    }

    // Remove student from classroom
    await classroom.removeStudent(req.user._id);

    res.json({
      success: true,
      message: 'Successfully left the classroom',
      data: {
        classroomId: classroom._id,
        classroomName: classroom.name
      }
    });
  } catch (error) {
    console.error('Leave classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while leaving classroom'
    });
  }
});

// Add a teaching assistant
router.post('/:id/ta', authenticate, authorize('instructor', 'admin'), [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
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

    const { userId } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to add TA
    if (classroom.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to add teaching assistant'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a TA
    if (classroom.teachingAssistants.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a teaching assistant'
      });
    }

    // Add TA
    classroom.teachingAssistants.push(userId);
    await classroom.save();

    // Populate TA details for response
    await classroom.populate('teachingAssistants', 'username firstName lastName avatar email');

    res.json({
      success: true,
      message: 'Teaching assistant added successfully',
      data: {
        teachingAssistants: classroom.teachingAssistants
      }
    });
  } catch (error) {
    console.error('Add TA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding teaching assistant'
    });
  }
});

// Remove a teaching assistant
router.delete('/:id/ta/:userId', authenticate, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to remove TA
    if (classroom.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to remove teaching assistant'
      });
    }

    const userId = req.params.userId;

    // Check if user is a TA
    if (!classroom.teachingAssistants.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a teaching assistant'
      });
    }

    // Remove TA
    classroom.teachingAssistants = classroom.teachingAssistants.filter(
      ta => ta.toString() !== userId
    );
    await classroom.save();

    res.json({
      success: true,
      message: 'Teaching assistant removed successfully'
    });
  } catch (error) {
    console.error('Remove TA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing teaching assistant'
    });
  }
});

// Add a problem to classroom
router.post('/:id/problems', authenticate, authorize('instructor', 'admin'), [
  body('problemId')
    .isMongoId()
    .withMessage('Invalid problem ID'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date'),
  body('maxAttempts')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max attempts must be a non-negative integer'),
  body('points')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),
  body('isRequired')
    .optional()
    .isBoolean()
    .withMessage('isRequired must be a boolean')
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

    const { problemId, dueDate, maxAttempts, points, isRequired } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to add problem
    const isInstructor = classroom.instructor.toString() === req.user._id.toString();
    const isTA = classroom.teachingAssistants.some(ta =>
      ta.toString() === req.user._id.toString()
    );

    if (!isInstructor && !isTA && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to add problem to classroom'
      });
    }

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Add problem to classroom
    await classroom.addProblem(problemId, {
      dueDate: dueDate ? new Date(dueDate) : null,
      maxAttempts: maxAttempts || 0,
      points: points || problem.points,
      isRequired: isRequired || false
    });

    // Populate problem details for response
    await classroom.populate('problems.problem', 'title difficulty category points');

    res.json({
      success: true,
      message: 'Problem added to classroom successfully',
      data: {
        problems: classroom.problems
      }
    });
  } catch (error) {
    console.error('Add problem to classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding problem to classroom'
    });
  }
});

// Remove a problem from classroom
router.delete('/:id/problems/:problemId', authenticate, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to remove problem
    const isInstructor = classroom.instructor.toString() === req.user._id.toString();
    const isTA = classroom.teachingAssistants.some(ta =>
      ta.toString() === req.user._id.toString()
    );

    if (!isInstructor && !isTA && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to remove problem from classroom'
      });
    }

    const problemId = req.params.problemId;

    // Remove problem
    classroom.problems = classroom.problems.filter(
      p => p.problem.toString() !== problemId
    );
    await classroom.save();

    res.json({
      success: true,
      message: 'Problem removed from classroom successfully'
    });
  } catch (error) {
    console.error('Remove problem from classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing problem from classroom'
    });
  }
});

// Get classroom analytics
router.get('/:id/analytics', authenticate, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Check if user has permission to view analytics
    const isInstructor = classroom.instructor.toString() === req.user._id.toString();
    const isTA = classroom.teachingAssistants.some(ta =>
      ta.toString() === req.user._id.toString()
    );

    if (!isInstructor && !isTA && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to view classroom analytics'
      });
    }

    // Get student statistics
    const studentStats = await Submission.aggregate([
      {
        $match: {
          user: { $in: classroom.students.map(s => s.user) },
          problem: { $in: classroom.problems.map(p => p.problem) }
        }
      },
      {
        $group: {
          _id: '$user',
          totalSubmissions: { $sum: 1 },
          successfulSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          problemsSolved: { $addToSet: '$problem' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          totalSubmissions: 1,
          successfulSubmissions: 1,
          problemsSolvedCount: { $size: '$problemsSolved' },
          successRate: {
            $cond: [
              { $eq: ['$totalSubmissions', 0] },
              0,
              { $multiply: [{ $divide: ['$successfulSubmissions', '$totalSubmissions'] }, 100] }
            ]
          }
        }
      },
      { $sort: { problemsSolvedCount: -1, successfulSubmissions: -1 } }
    ]);

    // Get problem statistics
    const problemStats = await Submission.aggregate([
      {
        $match: {
          problem: { $in: classroom.problems.map(p => p.problem) }
        }
      },
      {
        $group: {
          _id: '$problem',
          totalSubmissions: { $sum: 1 },
          successfulSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          }
        }
      },
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
          title: '$problem.title',
          difficulty: '$problem.difficulty',
          category: '$problem.category',
          totalSubmissions: 1,
          successfulSubmissions: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalSubmissions', 0] },
              0,
              { $multiply: [{ $divide: ['$successfulSubmissions', '$totalSubmissions'] }, 100] }
            ]
          }
        }
      },
      { $sort: { successRate: -1, totalSubmissions: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        studentStats,
        problemStats,
        totalStudents: classroom.students.length,
        totalProblems: classroom.problems.length
      }
    });
  } catch (error) {
    console.error('Get classroom analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching classroom analytics'
    });
  }
});

module.exports = router;