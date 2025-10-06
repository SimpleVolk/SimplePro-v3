// MongoDB Replica Set Initialization Script
// This script initializes the replica set and creates necessary users

print('===============================================');
print('MongoDB Replica Set Initialization Starting...');
print('===============================================');

// Wait for MongoDB to be fully ready
sleep(5000);

try {
  // Check if replica set is already initialized
  try {
    const status = rs.status();
    print('Replica set already initialized: ' + status.set);
    print('Current configuration:');
    printjson(status);
  } catch (e) {
    // Replica set not initialized, proceed with initialization
    print('Initializing replica set...');

    const config = {
      _id: 'simplepro-rs',
      version: 1,
      members: [
        {
          _id: 0,
          host: 'mongodb-primary:27017',
          priority: 2,
          tags: { role: 'primary' },
        },
        {
          _id: 1,
          host: 'mongodb-secondary1:27017',
          priority: 1,
          tags: { role: 'secondary' },
        },
        {
          _id: 2,
          host: 'mongodb-secondary2:27017',
          priority: 1,
          tags: { role: 'secondary' },
        },
      ],
      settings: {
        electionTimeoutMillis: 10000,
        heartbeatIntervalMillis: 2000,
        heartbeatTimeoutSecs: 10,
        catchUpTimeoutMillis: 60000,
        chainingAllowed: true,
        getLastErrorDefaults: {
          w: 'majority',
          wtimeout: 10000,
        },
      },
    };

    const result = rs.initiate(config);
    printjson(result);

    if (result.ok === 1) {
      print('✓ Replica set initialized successfully');
    } else {
      print('✗ Failed to initialize replica set');
      quit(1);
    }
  }

  // Wait for replica set to stabilize and elect primary
  print('Waiting for primary election...');
  sleep(15000);

  // Verify we have a primary
  let attempts = 0;
  let isPrimary = false;
  while (attempts < 30 && !isPrimary) {
    try {
      const status = rs.status();
      const primary = status.members.find((m) => m.stateStr === 'PRIMARY');
      if (primary) {
        print('✓ Primary elected: ' + primary.name);
        isPrimary = true;
      } else {
        print(
          'Waiting for primary election... (attempt ' + (attempts + 1) + '/30)',
        );
        sleep(2000);
        attempts++;
      }
    } catch (e) {
      print('Error checking status: ' + e);
      sleep(2000);
      attempts++;
    }
  }

  if (!isPrimary) {
    print('✗ Failed to elect primary after 60 seconds');
    quit(1);
  }

  // Create admin user if not exists
  print('Setting up admin user...');
  const adminDb = db.getSiblingDB('admin');

  try {
    const adminUser = adminDb.getUser(process.env.MONGO_INITDB_ROOT_USERNAME);
    if (adminUser) {
      print('✓ Admin user already exists');
    }
  } catch (e) {
    print('Creating admin user...');
    adminDb.createUser({
      user: process.env.MONGO_INITDB_ROOT_USERNAME,
      pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
      roles: [
        { role: 'root', db: 'admin' },
        { role: 'userAdminAnyDatabase', db: 'admin' },
        { role: 'readWriteAnyDatabase', db: 'admin' },
        { role: 'dbAdminAnyDatabase', db: 'admin' },
        { role: 'clusterAdmin', db: 'admin' },
      ],
    });
    print('✓ Admin user created successfully');
  }

  // Create application database and user
  print('Setting up application database...');
  const simpleproDb = db.getSiblingDB(
    process.env.MONGO_INITDB_DATABASE || 'simplepro',
  );

  try {
    const appUser = simpleproDb.getUser('simplepro_app');
    if (appUser) {
      print('✓ Application user already exists');
    }
  } catch (e) {
    print('Creating application user...');
    simpleproDb.createUser({
      user: 'simplepro_app',
      pwd: process.env.MONGO_INITDB_ROOT_PASSWORD, // Use same password or create separate env var
      roles: [
        {
          role: 'readWrite',
          db: process.env.MONGO_INITDB_DATABASE || 'simplepro',
        },
        {
          role: 'dbAdmin',
          db: process.env.MONGO_INITDB_DATABASE || 'simplepro',
        },
      ],
    });
    print('✓ Application user created successfully');
  }

  // Create read-only user for monitoring
  print('Setting up monitoring user...');
  try {
    const monitorUser = adminDb.getUser('simplepro_monitor');
    if (monitorUser) {
      print('✓ Monitoring user already exists');
    }
  } catch (e) {
    print('Creating monitoring user...');
    adminDb.createUser({
      user: 'simplepro_monitor',
      pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
      roles: [
        { role: 'clusterMonitor', db: 'admin' },
        { role: 'read', db: 'local' },
        { role: 'read', db: process.env.MONGO_INITDB_DATABASE || 'simplepro' },
      ],
    });
    print('✓ Monitoring user created successfully');
  }

  // Display final replica set status
  print('');
  print('===============================================');
  print('Replica Set Configuration Complete!');
  print('===============================================');
  const finalStatus = rs.status();
  print('Replica Set Name: ' + finalStatus.set);
  print('Members:');
  finalStatus.members.forEach(function (member) {
    print(
      '  - ' +
        member.name +
        ': ' +
        member.stateStr +
        ' (health: ' +
        member.health +
        ')',
    );
  });
  print('');
  print('Connection String (Application):');
  print(
    'mongodb://' +
      process.env.MONGO_INITDB_ROOT_USERNAME +
      ':***@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/' +
      (process.env.MONGO_INITDB_DATABASE || 'simplepro') +
      '?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority',
  );
  print('===============================================');
} catch (error) {
  print('✗ Error during replica set initialization:');
  print(error);
  quit(1);
}
