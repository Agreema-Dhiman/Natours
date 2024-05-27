const fs = require('fs');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();
//Buffer Storage

//checks if input is image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image!Please upload only images', 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
//middleware used to upload multi form data

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

//upload.array('images',5)--> if there was no imageCover--> produces req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  //1) Cover Image
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFilename}`);

  req.body.imageCover = imageCoverFilename;
  //2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    }),
  );
  //waits for each iteration to be pushed into array

  next();
});
//this is the middleware function which is used to construct the query correctly
//when the user asks for top 5 tours
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.addTour = factory.createOne(Tour);

exports.getAllTours = factory.getAll(Tour);

exports.getTourByID = factory.getOne(Tour, { path: 'reviews' });

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    //match is necessary in pipeline and in group first specify what you want to group by
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$difficulty',
        num: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    stats: {
      stats,
    },
  });
});

///Solving the business problem-finding the tours booked in a year month wise so that
//they know how to allocate resources

exports.monthlyTours = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', //so that each entry has only 1 date and we can count correctly
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          $month: '$startDates',
        },
        numTours: { $sum: 1 },
        names: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTours: -1 },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.01;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
// //////////FILES
// const tourdata = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

//For Param middleware, there are 4 parameters
// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour ID is ${val}`);
//   if (req.params.id * 1 > tourdata.length) {
//     //cannot send multiple headers so return statement is essential
//     return res.status(404).json({
//       status: 'Failed',
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'Failed',
//       message: 'Invalid request',
//     });
//   }
//   next();
// };
// //////////////////////ROUTE HANDLERS/////////////////////////
// ///////////////////
// //route handler functions- these functions are separated so that
// //they can be exported
// //express sends the headers on its own
// exports.getAllTours = (req, res) => {
//   res.status(200).json({
//     status: 'success',
//     // time: req.requestTime,
//     // results: tourdata.length,
//     // data: {
//     //   tourdata,
//     // },
//   });
// };

// exports.getTourByID = (req, res) => {
//   //to convert string into number
//   const id = req.params.id * 1;
//   // const tour = tourdata.find((el) => el.id === id);

//   //if we didnt find id
//   // if (!tour) {
//   //   res.status(404).json({
//   //     status: 'failed',
//   //     message: 'Invalid ID',
//   //   });
//   // }

//   //if we find id
//   res.status(200).json({
//     status: 'success',
//     // data: {
//     //   tour: tour,
//     // },
//   });
// };

// exports.addTour = (req, res) => {
//   // const newId = tourdata[tourdata.length - 1].id + 1;
//   // //allows to create a new object by merging -assign
//   // const newEntry = Object.assign({ id: newId }, req.body);
//   // tourdata.push(newEntry);
//   //not Sync or leads to blocking in event loop
//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tourdata),
//     (err) => {
//       res.status(201).json({
//         status: 'success',
//         data: {
//           tour: newEntry,
//         },
//       });
//     },
//   );
// };

// exports.updateTour = (req, res) => {
//   const givenID = req.params.id * 1;
//   const reqdObj = tourdata.find((el) => el.id === givenID);
//   res.status(200).json({
//     status: 'Success',
//     data: 'Updated tour info here',
//   });
// };

// exports.deleteTour = (req, res) => {
//   const givenID = req.params.id * 1;
//   const reqdObj = tourdata.find((el) => el.id === givenID);
//   //204 to return no content
//   res.status(204).json({
//     status: 'Success',
//     data: null,
//   });
// };

///////////////API FEATURES
//BUILD QUERY
// let queryObj = { ...req.query }; //to create the query fields into object copy
// const excludedFields = ['page', 'sort', 'limit', 'fields'];
// excludedFields.forEach((el) => delete queryObj[el]);

// //to filter:
// //mongodb--  const tours=await Tour.find({duration:5,difficulty:'easy})
// //mongoose-- const tours=await Tour.find().where('duration').equals(5).where(difficulty).equals('easy')

// //ADVANCED FILTERING
// //For commands like greater than, lesser than etc
// //because when we do price[gt] in postman query we need to add the $ too
// //so this string manipulation is required
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
// queryObj = JSON.parse(queryStr);

// let query = Tour.find(queryObj); // you cannot do await here , doesnt let sort go ahead

// ///SORTING
// if (req.query.sort) {
//   const sortQuery = req.query.sort.split(',').join(' ');
//   //you can sort on multiple fields sort(price duration)
//   query = query.sort(sortQuery);
// } else {
//   query = query.sort('-createdAt');
// }

// ///PROJECTING
// if (req.query.fields) {
//   const fieldQuery = req.query.fields.split(',').join(' ');
//   query = query.select(fieldQuery);
// } else {
//   query.select('-__v'); //unnecessary info for user so unselect
// }

// //PAGINATION
// const page = req.query.page * 1 || 1;
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit;

// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numTours = await Tour.countDocuments();
//   if (skip >= numTours) {
//     throw new Error('This page does not exist');
//   }
// }
//EXECUTE QUERY
