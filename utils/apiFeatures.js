class APIFeatures {
  //queryStr is req.quert
  //query is the variable which we are continuosly changing so that we can put it
  //const tours= await query i.e our final result after executing all features
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    const tempObj = { ...this.queryStr };
    const removedFields = ['sort', 'limit', 'page', 'fields'];
    removedFields.forEach((el) => delete tempObj[el]);

    let filterStr = JSON.stringify(tempObj);
    filterStr = filterStr.replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`,
    );
    this.query = this.query.find(JSON.parse(filterStr));
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortStr = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortStr);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  pagination() {
    const page = this.queryStr.page * 1 || 1;
    const limit = this.queryStr.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fieldStr = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fieldStr);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }
}

module.exports = APIFeatures;

//IMP- IN FIND WE REQUIRE DATA IN JSON FORMAT AND IN SELECT,SORT,SKIP,LIMIT- we just need strings and
//the req.query is A STRING
