const express = require('express');

const router = express.Router({ mergeParams: true });
//each route has access to only url for it so to get tourId from the url in tours routes
//we use merge params
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

//WORKS FOR
//POST /tour/234fdab/reviews
//POST /reviews

// reviews only for logged in users

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserdIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .get(reviewController.getReview);

module.exports = router;
