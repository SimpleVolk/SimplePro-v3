const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://admin:simplepro_dev_2024@localhost:27017/simplepro_dev?authSource=admin';

async function findFailingDocument() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('simplepro_dev');

    // Search for the failing document IDs from the error
    const failingIds = [
      '68ea48cfec812f20253a6ef0',
      '68ea49fd88694bc7e77ef39b'
    ];

    console.log('\n=== Searching for failing documents ===\n');

    for (const idStr of failingIds) {
      console.log(`\nSearching for document ID: ${idStr}`);

      try {
        const objectId = new ObjectId(idStr);

        // Search all collections
        const collections = await db.listCollections().toArray();

        for (const collInfo of collections) {
          const collection = db.collection(collInfo.name);
          const doc = await collection.findOne({ _id: objectId });

          if (doc) {
            console.log(`\n  FOUND in collection: ${collInfo.name}`);
            console.log('  Document:');
            console.log(JSON.stringify(doc, null, 2));

            // Check validation rules for this collection
            const collectionInfo = await db.listCollections({ name: collInfo.name }).toArray();
            if (collectionInfo[0]?.options?.validator) {
              console.log('\n  Validation rules for this collection:');
              console.log(JSON.stringify(collectionInfo[0].options.validator, null, 2));
            }

            break;
          }
        }
      } catch (error) {
        console.log(`  Error searching for ${idStr}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
  }
}

findFailingDocument().catch(console.error);
