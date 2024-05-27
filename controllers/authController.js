/* eslint-disable import/no-extraneous-dependencies */
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/mail');

//flow:
//you signup- you get token as jwt in tests part of postman
//you choose get all tours which checks the jwt using the protect funtion
//in get all tours we have set authorizatio as Bearer Token
//check using jwt.verify and get the user id
//because signing token involves signing the user id with jwt secret
//once you recover user u check if he still exists and allow access
//2222
//you have an extra function to check that suppose yes user is logged in but that login token was created
//at a time before the password was changed
//since password changed we need user to login again
//this function is in model in changedPasswordAfter

//To change password:
//You go to forgot password and it sends a temporary token to your mail i.e PasswordResetToken
//if you use that token as parameter for resetPassword link
// then 1st it verifies your token
//then it checks that you are a user  and not expired and sets new password with validation checks
//now that password has changed we update the passwordChangedAt property by -1 second so that the error at 2222 does
//not occur because sometimes there can be delay

// eslint-disable-next-line arrow-body-style
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

//cookies are used to send text from server to client and when
//client receives a cookie , automtically store and send back
//for all future requests to server
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    //secure://true so that sends only over https
    httpOnly: true, //cannot be modified by browser
  };
  //in development no option for https
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  //we have specified every field because just giving
  //req.body then someone might assign and login as admin
  //so now you can just login as user and go in compass to
  //manually assign as admin
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1)Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2)Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  //+password becuase password is by default not selected
  // if(user){
  //   const correct = await user.correctPassword(password, user.password);
  // }

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
    //401--unauthorized
  }

  //3)If everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  //since due httpOnly we cannot delete cookie from browser
  //so override that cookie by this new one with random text as token
  //so this indicates that user will not be identified and thus logged out
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
//middleware function to protect routes- only access on login
exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if its there
  //we send token as header called Authorization
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
    //allows to authorize people based on cookies and not only authorization header
  }

  if (!token) {
    return next(new AppError('You are not logged in!', 401));
    //401--unauthorized
  }
  //2) Verification token
  //need to check that the payload is not changed i.e the user id
  //verify is an asychronous function so needs third parameter- callback function
  //verify if data has been manipulated or token is already expired
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token does not exist', 401),
    );
  }

  //4) Check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password ', 401));
  }

  //request object travels from middleware to middleware
  //so this request object can be used later
  req.user = freshUser;
  res.locals.user = freshUser;
  //THIS IS LATER USED IN UPDATE PASSWORD
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//protect runs only for protected routes, for every page we must know logged in or what,
//this we get to know from isLoggedIn
//Only for rendered pages, no errors!
// exports.isLoggedIn = async (req, res, next) => {
//   try {
//     //1) Getting token and check if its there
//     //only for api authorization header, for rendered pages only cookies
//     let token;
//     if (req.cookies.jwt) {
//       token = req.cookies.jwt;
//       //allows to authorize people based on cookies and not only authorization header
//     }

//     if (!token) {
//       return next();
//       //401--unauthorized
//     }

//     //2) Verification token
//     //need to check that the payload is not changed i.e the user id
//     //verify is an asychronous function so needs third parameter- callback function
//     //verify if data has been manipulated or token is already expired
//     const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

//     //3) Check if user still exists
//     const freshUser = await User.findById(decoded.id);
//     if (!freshUser) {
//       return next();
//     }

//     //4) Check if user changed password after the token was issued
//     if (freshUser.changedPasswordAfter(decoded.iat)) {
//       return next();
//     }

//     //There is a logged in user
//     res.locals.user = freshUser;
//     //each pug template will have access to locals.user
//     return next();
//   } catch (err) {
//     //simply catch the error such as not beig logged in so that we just render the next middleware
//     //no need to give errors
//     return next();
//   }
//   next();
// };

//authorization tells whether the logged in user has
//certain rights or not
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    ///roles is an array , we cannot get parameter into
    //middleware function so we use this closure way
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this function',
          403,
        ),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // const message = `Forgot your password? Submit a PATCH request with you new password and
  // passwordConfirm to :${resetURL}.\nIf you didn't forget your password, please ignore this
  // email`;

  try {
    // await sendEmail({
    //   email: req.body.email,
    //   subject: 'Your password reset token(valid for 10 min)',
    //   message,
    // });
    //3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'Sucess',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try Again later',
        500,
      ),
    );
    //500- server error
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  //3) Update changedPasswordAt property for the user
  //in model

  //4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get user from collection
  //For logged in user we already have user in current request
  const user = await User.findById(req.user.id).select('+password');

  //2)If posted password is correct
  if (
    !user ||
    !(await user.correctPassword(req.body.password, user.password))
  ) {
    return next(new AppError('Incorrect password'), 401);
    //401--unauthorized
  }

  //3) Update the password
  user.password = req.body.newpwd;
  user.passwordConfirm = req.body.confirmnewpwd;
  await user.save();

  //4)Log user in, send JWT
  createSendToken(user, 200, res);
  //password encryption is done with pre save and
  //passwordChangedAt function is done with pre save as well
});
