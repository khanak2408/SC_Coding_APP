const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    enum: ['cpp', 'python', 'java', 'javascript', ''],
    default: ''
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  voters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['up', 'down']
    }
  }],
  isAnswer: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
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
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    default: null
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    default: null
  },
  category: {
    type: String,
    enum: ['question', 'discussion', 'announcement', 'bug-report', 'feature-request'],
    default: 'question'
  },
  tags: [{
    type: String,
    trim: true
  }],
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    enum: ['cpp', 'python', 'java', 'javascript', ''],
    default: ''
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  voters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['up', 'down']
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  replies: [replySchema],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  solvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

// Index for efficient querying
postSchema.index({ author: 1 });
postSchema.index({ problem: 1 });
postSchema.index({ classroom: 1 });
postSchema.index({ category: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ upvotes: -1 });

// Method to get post summary
postSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    title: this.title,
    author: this.author,
    problem: this.problem,
    classroom: this.classroom,
    category: this.category,
    tags: this.tags,
    upvotes: this.upvotes,
    downvotes: this.downvotes,
    views: this.views,
    replyCount: this.replies.length,
    isPinned: this.isPinned,
    isLocked: this.isLocked,
    isSolved: this.isSolved,
    solvedBy: this.solvedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Method to add reply
postSchema.methods.addReply = function(authorId, content, code = '', language = '') {
  this.replies.push({
    author: authorId,
    content,
    code,
    language,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to upvote/downvote
postSchema.methods.vote = function(userId, voteType) {
  const existingVoteIndex = this.voters.findIndex(voter => 
    voter.user.toString() === userId
  );
  
  if (existingVoteIndex !== -1) {
    // User has already voted
    const existingVote = this.voters[existingVoteIndex];
    
    if (existingVote.vote === voteType) {
      // Remove vote if same type
      this.voters.splice(existingVoteIndex, 1);
      if (voteType === 'up') {
        this.upvotes -= 1;
      } else {
        this.downvotes -= 1;
      }
    } else {
      // Change vote type
      this.voters[existingVoteIndex].vote = voteType;
      if (voteType === 'up') {
        this.upvotes += 1;
        this.downvotes -= 1;
      } else {
        this.upvotes -= 1;
        this.downvotes += 1;
      }
    }
  } else {
    // New vote
    this.voters.push({
      user: userId,
      vote: voteType
    });
    
    if (voteType === 'up') {
      this.upvotes += 1;
    } else {
      this.downvotes += 1;
    }
  }
  
  return this.save();
};

// Method to mark as solved
postSchema.methods.markAsSolved = function(userId) {
  this.isSolved = true;
  this.solvedBy = userId;
  this.updatedAt = new Date();
  return this.save();
};

// Method to increment view count
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);