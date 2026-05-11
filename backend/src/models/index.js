import User from '../modules/auth/user.model.js';
import Driver from '../modules/drivers/driver.model.js';
import Partner from '../modules/partners/partner.model.js';
import Task from '../modules/tasks/task.model.js';

// User and Driver associations
Driver.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Driver, { foreignKey: 'user_id' });

// Task associations
Task.belongsTo(Partner, { foreignKey: 'partner_id' });
Partner.hasMany(Task, { foreignKey: 'partner_id' });

Task.belongsTo(Driver, { foreignKey: 'driver_id' });
Driver.hasMany(Task, { foreignKey: 'driver_id' });

export { User, Driver, Partner, Task };
