import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantContextStore = new AsyncLocalStorage();

/**
 * Run a callback within a specific tenant and branch context.
 * @param {string} tenantId
 * @param {string} branchId
 * @param {Function} callback
 */
export const runWithTenant = (tenantId, branchId, callback) => {
  return tenantContextStore.run({ tenantId, branchId }, callback);
};

/**
 * Get the active tenant and branch context.
 * @returns {{ tenantId: string, branchId: string } | undefined}
 */
export const getTenantContext = () => {
  return tenantContextStore.getStore();
};
