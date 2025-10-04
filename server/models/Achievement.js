const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['solving', 'streak', 'participation', 'helping', 'mastery', 'special'],
    required: true
  },
  type: {
    type: String,
    enum: ['count', 'streak', 'special'],
    required: true
  },
  criteria: {
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['>=', '==', '>', '<', '<=', 'contains'],
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all-time'],
      default: 'all-time'
    }
  },
  points: {
    type: Number,
    required: true,
    default: 10
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ rarity: 1, isActive: 1 });

// Method to check if user meets achievement criteria
achievementSchema.methods.checkCriteria = function(userStats) {
  const { field, operator, value } = this.criteria;
  const userValue = userStats[field];
  
  if (userValue === undefined) return false;
  
  switch (operator) {
    case '>=':
      return userValue >= value;
    case '==':
      return userValue == value;
    case '>':
      return userValue > value;
    case '<':
      return userValue < value;
    case '<=':
      return userValue <= value;
    case 'contains':
      if (Array.isArray(userValue)) {
        return userValue.includes(value);
      }
      return false;
    default:
      return false;
  }
};

// Static method to get achievements by category
achievementSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static method to get achievements by rarity
achievementSchema.statics.getByRarity = function(rarity) {
  return this.find({ rarity, isActive: true });
};

// Static method to check user achievements
achievementSchema.statics.checkUserAchievements = async function(userId, userStats) {
  const achievements = await this.find({ isActive: true });
  const earnedAchievements = [];
  
  for (const achievement of achievements) {
    if (achievement.checkCriteria(userStats)) {
      earnedAchievements.push(achievement._id);
    }
  }
  
  return earnedAchievements;
};

module.exports = mongoose.model('Achievement', achievementSchema);