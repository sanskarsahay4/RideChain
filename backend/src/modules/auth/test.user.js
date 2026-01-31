import User from './user.model.js';

(async () => {
  try {
    const user = await User.create({
      phone: '+911234567890',
      role: 'admin',
      firebase_uid: 'dummy-firebase-uid',
    });
    console.log('User created:', user.toJSON());
  } catch (err) {
    console.error(err);
  }
})();
