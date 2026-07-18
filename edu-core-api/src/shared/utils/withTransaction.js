import mongoose from 'mongoose';

/**
 * Utility to wrap operations in a MongoDB transaction.
 * Requires a replica set to be active.
 */
export const withTransaction = async (fn) => {
  // Gracefully fallback to non-transactional execution if MongoDB is not running in a replica set (e.g. in basic test/dev setups)
  const client = mongoose.connection.getClient();
  const topologyType = client?.topology?.description?.type || client?.topology?.type;
  const isReplicaSet = topologyType && (topologyType.includes('ReplicaSet') || topologyType === 'replica-set' || topologyType === 'ReplicaSetWithPrimary');

  if (!isReplicaSet) {
    return fn(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
