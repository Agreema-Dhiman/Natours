const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch((err) => next(err));
  //catch  is used to capture the errors in async functions
  //we use this function for every tour request so that we can capture any errors
  //without repeated try-catch blocks
  //this function returns the function which express is later going to call
};
module.exports = catchAsync;
