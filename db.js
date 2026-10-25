/**
 * MongoDB Database Connection Manager
 * Connects directly to MongoDB / MongoDB Atlas using Mongoose.
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

function resolveMongoUri() {
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('YOUR_MONGODB_URI')) {
    return process.env.MONGODB_URI.trim();
  }
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const match = fs.readFileSync(envPath, 'utf8').match(/^\s*MONGODB_URI\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1] && !match[1].includes('YOUR_MONGODB_URI')) {
        return match[1].trim();
      }
    } catch (_) {}
  }
  return 'mongodb://127.0.0.1:27017/elevate';
}

async function seedDefaultUser() {
  try {
    const { User } = require('./models');
    const existing = await User.findOne({ email: 'aarav@elevate.edu' });
    if (!existing) {
      const defaultUser = new User({
        name: 'Aarav Sharma',
        email: 'aarav@elevate.edu',
        password: 'password123',
        role: 'student',
        rollNumber: '2024CS101',
        branch: 'Computer Science & Engineering',
        graduationYear: 2026,
        cgpa: 8.9,
        careerGoal: 'Full-Stack Software Engineer & JavaScript Developer',
        skills: [
          'JavaScript ES6+',
          'HTML5',
          'CSS3',
          'Bootstrap 5',
          'DOM & Events',
          'Async/Await',
          'REST APIs',
          'MongoDB',
          'Node.js',
          'Express'
        ],
        projects: [
          {
            name: 'Elevate Platform',
            desc: 'Student placement & portfolio portal built using Vanilla JS, Express, and MongoDB.',
            stack: ['HTML5', 'CSS3', 'Bootstrap 5', 'Node.js', 'MongoDB'],
            status: 'Active'
          }
        ],
        certificates: [
          {
            title: 'JavaScript Algorithms & Data Structures',
            issuer: 'freeCodeCamp',
            tag: 'JS Core'
          }
        ]
      });
      await defaultUser.save();
      console.log('Seeded demo student user into MongoDB (aarav@elevate.edu)');
    }
  } catch (err) {
    console.warn('MongoDB seed warning:', err.message);
  }
}

async function connectDb(customUri) {
  const uri = customUri || resolveMongoUri();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`Connected to MongoDB database (${mongoose.connection.name || 'elevate'})`);
    await seedDefaultUser();
    return mongoose.connection;
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to ${uri}: ${err.message}`);
    return null;
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function closeDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectDb,
  isDbConnected,
  closeDb,
  resolveMongoUri,
  seedDefaultUser
};
