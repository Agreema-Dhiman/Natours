const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

//express will look in views folder for the template with name base and send response

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview,
);

router.get(
  '/tour/:tourSlug',
  authController.isLoggedIn,
  viewController.getTour,
);
router.get(
  '/createReview/:tourID',
  authController.protect,
  viewController.getReviewForm,
);
//TIMELINE FOR LOGIN
//ON CLIENT SIDE THERE IS JAVASCRIPT CODE IN LOGIN.JS
//THERE UPON THE EVENT OF SUBMITTING FORM IT TRIGGERS THE JS FUNCTION LOGIN
//THAT FUNCTION MAKES A CALL TO API LOGIN FUNCTION
//API CHECKS IF CORRECT NAME AND PASSWORD AND THEN SENDS COOKIE
//THEN WITH EVERY REQUEST THAT COOKIE IS SENT BACK TO SERVER SIDE AND
// WE CHECK THAT WITH isLoggedIn and it puts the user onto response.locals.user
//this allows pug to access that user and then adjust based on that for example in _header
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewController.getSignupForm);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);

//POST IS FOR FORMS
router.post('/submit-user-data', viewController.updateUserData);

module.exports = router;
