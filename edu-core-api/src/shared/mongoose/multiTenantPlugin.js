import mongoose from 'mongoose';

/**
 * Mongoose plugin to automatically inject tenantId and branchId
 * along with scoping query helpers to any registered schema.
 */
export const multiTenantPlugin = (schema) => {
  // Add tenantId and branchId if they don't already exist
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: false, // Optional to preserve backwards compatibility and simple tests
        index: true,
      },
    });
  }

  if (!schema.path('branchId')) {
    schema.add({
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: false,
        index: true,
      },
    });
  }

  // Query helpers to easily apply tenant and branch filters
  schema.query.byTenant = function (tenantId) {
    if (!tenantId) return this;
    return this.where({ tenantId });
  };

  schema.query.byBranch = function (branchId) {
    if (!branchId) return this;
    return this.where({ branchId });
  };

  schema.query.byTenantAndBranch = function (tenantId, branchId) {
    let query = this;
    if (tenantId) {
      query = query.where({ tenantId });
    }
    if (branchId) {
      query = query.where({ branchId });
    }
    return query;
  };
};
