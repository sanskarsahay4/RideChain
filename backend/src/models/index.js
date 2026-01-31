import User from '../modules/auth/user.model.js';
import Driver from '../modules/drivers/driver.model.js';

// If you add associations later, do it here
// User.hasOne(Driver, { foreignKey: 'user_id' });
// Driver.belongsTo(User, { foreignKey: 'user_id' });
Driver.belongsTo(User, { foreignKey: 'user_id' });

export { User, Driver };
