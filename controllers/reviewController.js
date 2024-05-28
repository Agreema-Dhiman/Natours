const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);

exports.setTourUserdIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
// exports.createReview = catchAsync(async (req, res, next) => {
//   console.log('Here!');
//   const existDoc = await Review.find({
//     tour: req.body.tour,
//     user: req.body.user,
//   });

//   if (!existDoc) {
//     console.log('Not found');
//     const newDoc = await Review.create(req.body);
//     //One way- const newTour =new Tour({}) and newTour.save()
//     //async and await are used to handle promises
//     res.status(201).json({
//       status: 'success',
//       data: {
//         data: newDoc,
//       },
//     });
//   } else {
//     res.status(401).json({
//       status: 'error',
//       message: 'You cannot put more than one review for a tour',
//     });
//   }
// });

exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
