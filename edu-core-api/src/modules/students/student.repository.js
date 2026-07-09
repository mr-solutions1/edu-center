import Student from './student.model.js';

export const findById = async (id, session = null) => {
  return Student.findById(id).session(session);
};

export const findOne = async (filter, session = null) => {
  return Student.findOne(filter).session(session);
};

export const create = async (data, session = null) => {
  return Student.create([data], { session });
};

export const find = async (filter, options = {}) => {
  const { skip = 0, limit = 10, sort = { createdAt: -1 }, populate } = options;
  const query = Student.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) {
    query.populate(populate);
  }
  return query;
};

export const countDocuments = async (filter) => {
  return Student.countDocuments(filter);
};

export const findByIdAndUpdate = async (id, update, options = {}) => {
  return Student.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    ...options,
  });
};
