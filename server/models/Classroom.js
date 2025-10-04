const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teachingAssistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  students: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  problems: [{
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: Date,
    maxAttempts: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 10
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  announcements: [{
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPinned: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowSelfEnrollment: {
      type: Boolean,
      default: true
    },
    requireInstructorApproval: {
      type: Boolean,
      default: false
    },
    showLeaderboard: {
      type: Boolean,
      default: true
    },
    enableDiscussion: {
      type: Boolean,
      default: true
    }
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
classroomSchema.index({ code: 1 });
classroomSchema.index({ instructor: 1 });
classroomSchema.index({ 'students.user': 1 });

// Method to get classroom summary
classroomSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    code: this.code,
    instructor: this.instructor,
    studentCount: this.students.length,
    problemCount: this.problems.length,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

// Method to check if user is enrolled
classroomSchema.methods.isStudentEnrolled = function(userId) {
  return this.students.some(student => 
    student.user.toString() === userId && student.isActive
  );
};

// Method to check if user is instructor or TA
classroomSchema.methods.isInstructorOrTA = function(userId) {
  return this.instructor.toString() === userId || 
         this.teachingAssistants.some(ta => ta.toString() === userId);
};

// Method to add student
classroomSchema.methods.addStudent = function(userId) {
  if (!this.isStudentEnrolled(userId)) {
    this.students.push({
      user: userId,
      joinedAt: new Date(),
      isActive: true
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove student
classroomSchema.methods.removeStudent = function(userId) {
  const studentIndex = this.students.findIndex(student => 
    student.user.toString() === userId
  );
  
  if (studentIndex !== -1) {
    this.students[studentIndex].isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add problem
classroomSchema.methods.addProblem = function(problemId, options = {}) {
  if (!this.problems.some(p => p.problem.toString() === problemId)) {
    this.problems.push({
      problem: problemId,
      addedAt: new Date(),
      dueDate: options.dueDate || null,
      maxAttempts: options.maxAttempts || 0,
      points: options.points || 10,
      isRequired: options.isRequired || false
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Pre-save middleware to generate unique classroom code
classroomSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingClassroom = await this.constructor.findOne({ code });
      if (!existingClassroom) {
        isUnique = true;
      }
    }
    
    this.code = code;
  }
  next();
});

module.exports = mongoose.model('Classroom', classroomSchema);