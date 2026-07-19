import Counter from '../../modules/students/counter.model.js';

/**
 * Get the next sequence value for a counter
 * @param {string} id - The counter ID (e.g., 'studentCode')
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<number>}
 */
export const getNextSequenceValue = async (id, session = null) => {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return sequenceDocument.seq;
};

/**
 * Generate a formatted code (e.g., STD0001)
 * @param {string} id
 * @param {string} prefix
 * @param {Object} session - Mongoose session for transaction
 * @param {number} padding
 * @returns {Promise<string>}
 */
export const generateCode = async (id, prefix, session = null, padding = 4) => {
  const seq = await getNextSequenceValue(id, session);
  return `${prefix}-${seq.toString().padStart(padding, '0')}`;
};
