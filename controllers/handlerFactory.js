const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = await Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    //to fill up the fielf called guides by the users actual data it is referencing
    //only in query not actual database
    //too many populates in queries can affect performance
    if (!query) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: query,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //to allow for nested get reviews on tours

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();
    //404 error not implemented here because request was correctly received
    //and null responses are there
    //for database errors, mongoose does catchAsync
    const tours = await features.query;
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  });

//When we are querying the read performance depends on indexing
//MongoDB had to scan 9 documents to get the 3 documents with price 100which is not efficient if we scale
//Indexes are special data structures [1] that store a small portion of the collection's data set in
//an easy to traverse form. The index stores the value of a specific field or set of fields, ordered by the value of the field.
//default index is created on _id
//we set our index as the field we query most often
//can get these stats by ...query.explain()

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that id', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
//Works due to JavaScript closures i.e internal variables have access to external (like Model)
//even after it returns

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedDoc) {
      return next(new AppError('No document found with that id', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);
    //One way- const newTour =new Tour({}) and newTour.save()
    //async and await are used to handle promises
    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });
