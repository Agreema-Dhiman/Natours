const express = require('express');
//this router is a middleware function
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
//since we simple get a cookie
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//all the subsequent routes need valid login so we call the protect function here
//since middleware is sequential we will do that
router.use(authController.protect);
router.patch('/updatePassword', authController.updatePassword);

router.route('/me').get(userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);
//for app .use () but for routers .route

//Following are all admininstrator actions

router.use(authController.restrictTo('admin'));
router
  .route('/:id')
  .patch(userController.updateUser)
  .delete(userController.deleteUser)
  .get(userController.getUser);

router.route('/').put(userController.addUser).get(userController.getAllUsers);

module.exports = router;
