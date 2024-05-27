/* eslint-disable import/no-extraneous-dependencies */
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Your name is required'],
  },
  email: {
    type: String,
    required: [true, 'Your email is required'],
    unique: true,
    lowercase: true, //transforms the email into lowercase
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String, //store photo and path of photo will be stored as string
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //works only on save
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//to encrypt password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  //basically if password has not been modified, no
  //need to call this
  this.password = await bcrypt.hash(this.password, 12); //or instead of 12 can generate
  //salt, 12 denotes cost, default is 10
  //we use this asynchronous function
  this.passwordConfirm = undefined;
  //no need to store passwordconfirm
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  //this points to current query
  this.find({ active: { $ne: false } });
  next();
});

//instance method-available on all documents
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  //since password select is false-- this.password is not applicable
  return await bcrypt.compare(candidatePassword, userPassword);
};

//timestamp to see when token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //we do not need this to be very strong so we can
  //use inbuilt crypto function
  const resetToken = crypto.randomBytes(32).toString('hex');

  //to store safely in database to prevent hackers from stealing
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
