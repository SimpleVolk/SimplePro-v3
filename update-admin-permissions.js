// MongoDB script to add tariff_settings permissions to admin user
const result = db.users.updateOne(
  { username: 'admin' },
  {
    $push: {
      permissions: {
        $each: [
          {
            id: 'perm_all_tariff_settings',
            resource: 'tariff_settings',
            action: 'read',
          },
          {
            id: 'perm_all_tariff_settings_create',
            resource: 'tariff_settings',
            action: 'create',
          },
          {
            id: 'perm_all_tariff_settings_update',
            resource: 'tariff_settings',
            action: 'update',
          },
          {
            id: 'perm_all_tariff_settings_delete',
            resource: 'tariff_settings',
            action: 'delete',
          },
          {
            id: 'perm_all_tariff_settings_activate',
            resource: 'tariff_settings',
            action: 'activate',
          },
        ],
      },
    },
  },
);

print('Update Result:', JSON.stringify(result));

// Verify the update
const updatedUser = db.users.findOne({ username: 'admin' }, { permissions: 1 });
const tariffPerms = updatedUser.permissions.filter(
  (p) => p.resource === 'tariff_settings',
);
print('Tariff Settings Permissions Added:', tariffPerms.length);
print(JSON.stringify(tariffPerms, null, 2));
