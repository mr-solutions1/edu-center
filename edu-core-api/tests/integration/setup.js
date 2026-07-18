import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { multiTenantPlugin } from '../../src/shared/mongoose/multiTenantPlugin.js';

// Ensure the multi-tenant plugin is registered globally before compiling models in tests
mongoose.plugin(multiTenantPlugin);

let mongod;

export const connectDB = async () => {
  mongod = await MongoMemoryServer.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

export const closeDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

export const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};
