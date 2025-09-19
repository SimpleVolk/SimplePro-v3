export { DeterministicEstimator } from './estimator';
export * from './schemas/rules.schema';
export { sampleInputs } from './test-data/sample-inputs';

// Re-export default rules and inventory catalog for easy access
import defaultRulesData from './data/default-rules.json';
import inventoryCatalog from './data/inventory-catalog.json';

export const defaultRules = defaultRulesData;
export const inventoryItems = inventoryCatalog;