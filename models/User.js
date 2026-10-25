const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  desc: { type: String, default: '' },
  stack: [{ type: String }],
  status: { type: String, default: 'Completed' },
  githubUrl: { type: String, default: '' },
  liveUrl: { type: String, default: '' }
}, { _id: false });

const CertificateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  issuer: { type: String, default: 'Verified Platform' },
  tag: { type: String, default: 'Core Tech' },
  issueDate: { type: String, default: '' }
}, { _id: false });

const ResumeRefSchema = new mongoose.Schema({
  title: { type: String, default: 'Resume' },
  detail: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  filename: { type: String, default: '' },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['student', 'recruiter', 'admin'],
    default: 'student'
  },
  rollNumber: {
    type: String,
    default: '2024CS-NEW',
    trim: true
  },
  branch: {
    type: String,
    default: 'Computer Science & Engineering',
    trim: true
  },
  graduationYear: {
    type: Number,
    default: 2026
  },
  cgpa: {
    type: Number,
    default: 8.5
  },
  careerGoal: {
    type: String,
    default: 'Build a strong placement-ready profile with organized documents, visible projects, and structured interview preparation.'
  },
  skills: [{
    type: String,
    trim: true
  }],
  projects: [ProjectSchema],
  certificates: [CertificateSchema],
  resumes: [ResumeRefSchema],
  activeResume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume'
  },
  resumeName: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  bufferCommands: false
});

// Pre-save hook to hash password with bcryptjs before saving to MongoDB
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  // Prevent double-hashing if password is already a bcrypt hash
  if (typeof this.password === 'string' && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  try {
    if (await bcrypt.compare(candidatePassword, this.password)) {
      return true;
    }
    // Also test trimmed password in case of accidental leading/trailing space
    if (typeof candidatePassword === 'string') {
      const trimmed = candidatePassword.trim();
      if (trimmed !== candidatePassword && await bcrypt.compare(trimmed, this.password)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Password comparison error:', err.message);
  }
  return false;
};

// Instance method to export user data without sensitive password hash
UserSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
