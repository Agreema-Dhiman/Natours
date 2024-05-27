/* eslint-disable import/no-extraneous-dependencies */
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be above or equal to 1'],
      max: [5, 'Rating must be less or equal to 5'],
      set: (val) => Math.round(10 * val) / 10,
      //used whenever value for this field is set
      //usually give a callback function val=>
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  //we do not populate with tour data because we will use
  //these reviews for a particular tour . so to prevent
  //tour-> review-> tour
  next();
});

//static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', //to group based on tour
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
  //because if all reviews on a particular tour are deleted then stats will be empty and this
  //will be invalid
};

//post so that we can include current review which is saved to calculate
//post does not get access to next
reviewSchema.post('save', function () {
  //this points to current review
  this.constructor.calcAverageRatings(this.tour);
  //points to model that created the document
});

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
//We do not want a user to make multiple reviews on a tour but if we make user unique then a user can leave only
//1 review and not for other tours. So we need tour and user combination to be unique thats why we use indexes

//for update and delete we do not have document middleware,we have only query middleware
//In query middleware we do not have access to current document
//findByIdAndUpdate is just shorthand for finOneandupdate for that id
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  //passing the pre variable to post variable
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

//Nested routes are used when there is a clear parent child relationship of resources
//We can use this since reviews is a child of tours so we do
//POST tour/tour id/review and get the user id from the logged in user
