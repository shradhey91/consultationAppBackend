const { sequelize } = require('../config/db.config');
const User = require('./User');
const Consultation = require('./Consultation');
const Message = require('./Message');

// --- Define Associations ---

// User <-> Consultation (A user can have many bookings)
User.hasMany(Consultation, { foreignKey: 'userId', as: 'bookings' });
Consultation.belongsTo(User, { foreignKey: 'userId', as: 'client' });

// Expert <-> Consultation (An expert can have many sessions)
User.hasMany(Consultation, { foreignKey: 'expertId', as: 'sessions' });
Consultation.belongsTo(User, { foreignKey: 'expertId', as: 'expert' });

// Consultation <-> Message (A session has many chat messages)
Consultation.hasMany(Message, { foreignKey: 'consultationId' });
Message.belongsTo(Consultation, { foreignKey: 'consultationId' });

// User <-> Message (A message belongs to a sender)
User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = { User, Consultation, Message, sequelize };