const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
});

// Check if the model is already defined, if not, define it
const User = mongoose.models.User || mongoose.model('User', UserSchema, 'Registered_users');

module.exports = User;
  