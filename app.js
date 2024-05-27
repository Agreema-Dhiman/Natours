/* eslint-disable import/no-extraneous-dependencies */
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

///////////////////// GLOBAL MIDDLEWARE/////////////////////////
////////////////

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

///set security http headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

//Body parser, reading data from req.body
//Data more than 10 kilobyte will not be accepted
app.use(express.json({ limit: '10kb' }));
//the way form sends data to server is urlencoded
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data Sanitization against NoSQL Query injection
//query like {"email":{"$gt":""}} will be always true so
//it allows login to pass with any valid password that is in
//database
app.use(mongoSanitize());
//filters use dollar signs

//Data sanitization again XSS
//if user puts javascript code in html code to
//cause disruption
app.use(xss());

//to prevent parameter pollution
//for example ?sort=price&sort=duration this creates array
//but we want ?sort=price,duration so that we can
//split the string
//so if we use hpp, only sort=duration applies
//but we need to whitelist parameters like duration for duration=4
//&duration=9
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);
if (process.env.NODE_ENV === 'development') {
  //shows in console all the requests being made
  app.use(morgan('dev'));
}

//this is used to limit the requests from an ip to prevent
//denial of service attacks or try to guess password through
//brute force
//therefore implemented here in global middleware
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //allows 100 requests rom same ip in 1 hour
  message: 'Too many requests from this IP,please try again in an hour!',
});

//apply to the routes through api
app.use('/api', limiter);

//so that the client can request static files like html and image
//so when 127.0.0.1:3000/overview.html, it looks in public folder and returns that
app.use(express.static(path.join(__dirname, 'public')));

//Test middleware
//applies on all requests in order
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //importat to call next to end request-response cycle
  next();
});

//////////////////////////ROUTING////////////////////////////
//////////////////
app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
///for wrong url entered: since middleware follows order
app.all('*', (req, res, next) => {
  //WAY 1
  // res.status(404).json({
  //   status: 'failed',
  //   message: `Cannot find ${req.originalUrl} on this server`,
  // });

  //WAY 2
  // const err = new Error(`Cannot find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
  //if next has any argument the middleware assumes it as error
});

//ERROR HANDLER MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
///////////////END//////////////////
//////////////
/////////////
//TRIAL
// app.get('/',(req,res)=>{
//     // res.status(200).send('Hello from serve side!')
//     res.status(200).json({message:"Hello from server side",app:'Natours'});
// });

// app.post('/',(req,res)=>{
//     res.status(200).send('You can post here');
// });
