const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  size: {
    type: Number,
    default: 0
  },
  fileData: {
    type: Buffer,
    default: null
  },
  extractedText: {
    type: String,
    default: ''
  },
  skills: [{
    type: String,
    trim: true
  }],
  projects: [{
    name: { type: String, default: '' },
    desc: { type: String, default: '' },
    stack: [{ type: String }],
    status: { type: String, default: 'Completed' }
  }],
  certifications: [{
    title: { type: String, default: '' },
    issuer: { type: String, default: 'Verified Platform' },
    tag: { type: String, default: 'Core Tech' }
  }],
  isCurrent: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  bufferCommands: false
});

module.exports = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
