import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { UserRole } from '../../shared/constants/enums.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'الاسم الأول مطلوب'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'الاسم الأخير مطلوب'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.RECEPTIONIST,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false, // Optional for retro-compatibility, required in SaaS operations
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
    },
    accessibleBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
      },
    ],
    activeBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, branchId: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Query middleware to exclude deleted users
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
