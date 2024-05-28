/* eslint-disable import/no-extraneous-dependencies */
const mongoose = require('mongoose');
// eslint-disable-next-line import/no-extraneous-dependencies
const slugify = require('slugify');
const validator = require('validator');

//validation such as required, min and max is carried out here because fat model, thin controller
//first object is schema definition and second is for the options
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      //validator
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minlength: [10, 'The name must have 10 or more characters'],
      maxlength: [40, 'The name must have 40 or less characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain alphabets'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be only easy,medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above or equal to 1'],
      max: [5, 'Rating must be less or equal to 5'],
      set: (val) => Math.round(10 * val) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this will not work on update
          return val < this.price;
        },
        message: 'Discount {VALUE} should be lower than the price',
      },
    },
    summary: {
      type: String,
      trim: true, //to remove extra space
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
      //so that user cannot ever access this
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      //embedded object
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
      //this is embedding the data
      //by creating an array
    ],
    //For embedding
    //guides: Array,
    //For referencing
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
//virtual properties- properties that can be derived and therefore need not be stored
//these properties provide business logic - part of models and not controller thus
//cannot use find() for them
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

////////////VIRTUAL POPULATE//////////////
//we use virtual populate so that we get all the reviews related to a tour
//without doing child referencing because that array could grow indefinetely
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //tells where in the other model reference is stored
  localField: '_id', //tells where in the current model the reference is stored
});

// tourSchema.index({ price: 1 });
//1 for ascending and -1 for descending
// we set unique for a field-- it becomes index because index needs t be uniqe
//can also use compound index to query based on multiple
tourSchema.index({ price: 1, ratingsAverage: -1 });
//indexes that we create take up more space than documents themselves
//each index needds to be updated everytime underlying collection is updated
//so not suggested for high write-read ratio
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

/////DOCUMENT MIDDLEWARE
//this acts before event therefore-- pre
//this works only on create and save and not on insertMany
//between accessing document and saving it
//this points to document
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.post('save', (doc, next) => {
  //console.log(doc);
  next();
});

//Referencing is getting info about tour guides from user documents without saving them here in tours

//IF U WISH TO DO EMBEDDING OF USERS INTO TOURS( NOT RECOMMENDED IN CASE OF CHANGES)
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   //async returns promises
//   this.guides = await Promise.all(guidesPromises);
//   //this gives us the user documents
//   next();
// });

////QUERY MIDDLEWARE
//to hide secret tours while using any type of find- find, findOne, findById etc
//this points to query
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } }); //since other documents do not yet have this attribute and are
  //not set to false
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});
//also works for update Tour because findByIdandUpdate

// tourSchema.post(/^find/, function (doc, next) {
//   console.log(`The query took ${Date.now() - this.start} milliseconds`);
//   next();
// });

///AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   //pipeline is an array
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });
//did not use arrow function here because we do not get this keyword in arrow function
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
