import mongoose from 'mongoose';

/**
 * Database Index Usage Analysis Script
 *
 * Analyzes MongoDB index usage across all collections to identify:
 * - Unused indexes (candidates for removal)
 * - Heavily used indexes (critical for performance)
 * - Index size and impact on write performance
 *
 * Usage: ts-node scripts/analyze-indexes.ts
 */

interface IndexStat {
  name: string;
  keys: Record<string, any>;
  accesses: number;
  since: Date;
  sizeBytes?: number;
  unique?: boolean;
  sparse?: boolean;
}

interface CollectionIndexReport {
  collection: string;
  documentCount: number;
  totalIndexes: number;
  indexes: IndexStat[];
  unusedIndexes: string[];
  recommendations: string[];
}

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/simplepro?authSource=admin';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function analyzeCollectionIndexes(collectionName: string): Promise<CollectionIndexReport> {
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);

  // Get all indexes
  const indexes = await collection.indexes();

  // Get index statistics
  let indexStats: IndexStat[] = [];
  try {
    const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();
    indexStats = stats.map((stat: any) => ({
      name: stat.name,
      keys: stat.key,
      accesses: stat.accesses?.ops || 0,
      since: stat.accesses?.since || new Date(),
    }));
  } catch (error) {
    console.warn(`Could not get index stats for ${collectionName}:`, (error as Error).message);
    indexStats = indexes.map((idx: any) => ({
      name: idx.name,
      keys: idx.key,
      accesses: 0,
      since: new Date(),
      unique: idx.unique,
      sparse: idx.sparse,
    }));
  }

  // Get collection stats
  const collStats = await collection.stats();
  const documentCount = collStats.count || 0;

  // Analyze indexes
  const unusedIndexes = indexStats
    .filter(idx => idx.accesses === 0 && idx.name !== '_id_')
    .map(idx => idx.name);

  // Generate recommendations
  const recommendations: string[] = [];

  // Check for unused indexes
  if (unusedIndexes.length > 0) {
    recommendations.push(`${unusedIndexes.length} unused indexes found. Consider removing: ${unusedIndexes.join(', ')}`);
  }

  // Check for too many indexes
  if (indexes.length > 15) {
    recommendations.push(`High index count (${indexes.length}). Each index slows down writes by ~${(indexes.length * 1.5).toFixed(1)}%`);
  }

  // Check for duplicate or overlapping compound indexes
  const compoundIndexes = indexes.filter((idx: any) => Object.keys(idx.key).length > 1);
  const singleFieldIndexes = indexes.filter((idx: any) => Object.keys(idx.key).length === 1);

  for (const compound of compoundIndexes) {
    const firstField = Object.keys(compound.key)[0];
    const hasSingleFieldIndex = singleFieldIndexes.some((single: any) =>
      Object.keys(single.key)[0] === firstField
    );

    if (hasSingleFieldIndex && compound.name !== '_id_') {
      recommendations.push(`Compound index ${compound.name} may make single-field index on '${firstField}' redundant`);
    }
  }

  // Check for low access indexes relative to document count
  const lowAccessThreshold = Math.max(10, documentCount * 0.001); // 0.1% of documents
  const lowAccessIndexes = indexStats.filter(idx =>
    idx.accesses > 0 &&
    idx.accesses < lowAccessThreshold &&
    idx.name !== '_id_'
  );

  if (lowAccessIndexes.length > 0) {
    recommendations.push(`${lowAccessIndexes.length} indexes with very low usage (<${lowAccessThreshold.toFixed(0)} accesses). Review: ${lowAccessIndexes.map(i => i.name).join(', ')}`);
  }

  return {
    collection: collectionName,
    documentCount,
    totalIndexes: indexes.length,
    indexes: indexStats,
    unusedIndexes,
    recommendations,
  };
}

async function analyzeAllIndexes() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  console.log('\n=== DATABASE INDEX USAGE ANALYSIS ===\n');
  console.log(`Database: ${db.databaseName}`);
  console.log(`Total collections: ${collections.length}\n`);

  const reports: CollectionIndexReport[] = [];
  let totalIndexes = 0;
  let totalUnusedIndexes = 0;

  for (const collectionInfo of collections) {
    const collectionName = collectionInfo.name;

    // Skip system collections
    if (collectionName.startsWith('system.')) {
      continue;
    }

    try {
      const report = await analyzeCollectionIndexes(collectionName);
      reports.push(report);
      totalIndexes += report.totalIndexes;
      totalUnusedIndexes += report.unusedIndexes.length;

      // Print report
      console.log(`\n--- ${report.collection} ---`);
      console.log(`Documents: ${report.documentCount.toLocaleString()}`);
      console.log(`Indexes: ${report.totalIndexes} (${report.unusedIndexes.length} unused)`);

      // Sort indexes by usage (most used first)
      const sortedIndexes = [...report.indexes].sort((a, b) => b.accesses - a.accesses);

      console.log('\nIndex Usage:');
      for (const idx of sortedIndexes) {
        const keyStr = JSON.stringify(idx.keys);
        const usage = idx.accesses === 0 ? 'UNUSED' : `${idx.accesses.toLocaleString()} ops`;
        const status = idx.accesses === 0 ? '❌' : idx.accesses > 1000 ? '✅' : '⚠️';
        console.log(`  ${status} ${idx.name.padEnd(40)} ${usage.padEnd(15)} ${keyStr}`);
      }

      // Print recommendations
      if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }
    } catch (error) {
      console.error(`Error analyzing ${collectionName}:`, error);
    }
  }

  // Print summary
  console.log('\n\n=== SUMMARY ===\n');
  console.log(`Total indexes: ${totalIndexes}`);
  console.log(`Total unused indexes: ${totalUnusedIndexes}`);

  const writeImpact = (totalIndexes * 1.5).toFixed(1);
  console.log(`Estimated write performance impact: ${writeImpact}% slower`);

  if (totalUnusedIndexes > 0) {
    console.log(`\nPotential improvement by removing unused indexes: ${(totalUnusedIndexes * 1.5).toFixed(1)}% faster writes`);
  }

  // Collections with most indexes
  const sortedByIndexCount = [...reports].sort((a, b) => b.totalIndexes - a.totalIndexes);
  console.log('\n\nCollections with most indexes:');
  sortedByIndexCount.slice(0, 5).forEach(r => {
    console.log(`  ${r.collection.padEnd(30)} ${r.totalIndexes} indexes`);
  });

  // Collections with most unused indexes
  const withUnused = reports.filter(r => r.unusedIndexes.length > 0);
  if (withUnused.length > 0) {
    console.log('\n\nCollections with unused indexes:');
    withUnused.forEach(r => {
      console.log(`  ${r.collection.padEnd(30)} ${r.unusedIndexes.length} unused: ${r.unusedIndexes.join(', ')}`);
    });
  }

  // Export full report to JSON
  const reportFile = 'index-analysis-report.json';
  const fs = await import('fs/promises');
  await fs.writeFile(
    reportFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      summary: {
        totalCollections: reports.length,
        totalIndexes,
        totalUnusedIndexes,
        writeImpactPercent: parseFloat(writeImpact),
      },
      collections: reports
    }, null, 2)
  );
  console.log(`\n\nFull report saved to: ${reportFile}`);
}

async function main() {
  try {
    await connectToDatabase();
    await analyzeAllIndexes();
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the analysis
main();
