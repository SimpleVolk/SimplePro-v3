// Check for users with invalid role values
const invalidRoleUser = db.users.findOne({
  role: { $nin: ['super_admin', 'admin', 'dispatcher', 'crew'] }
});

if (invalidRoleUser) {
  print('Found user with invalid role:');
  printjson(invalidRoleUser);
} else {
  print('No users with invalid roles found');
}

// Check all users for potential validation issues
const allUsers = db.users.find({}).toArray();
print('\nTotal users: ' + allUsers.length);

allUsers.forEach(user => {
  const issues = [];

  if (!user.email) issues.push('Missing email');
  if (!user.firstName) issues.push('Missing firstName');
  if (!user.lastName) issues.push('Missing lastName');
  if (!user.role) issues.push('Missing role');
  if (!user.password) issues.push('Missing password');
  if (user.isActive === undefined) issues.push('Missing isActive');

  // Check role enum
  const validRoles = ['super_admin', 'admin', 'dispatcher', 'crew'];
  if (user.role && !validRoles.includes(user.role)) {
    issues.push('Invalid role: ' + user.role);
  }

  if (issues.length > 0) {
    print('\n=== User ' + user._id + ' (' + user.email + ') has validation issues:');
    issues.forEach(issue => print('  - ' + issue));
  }
});
