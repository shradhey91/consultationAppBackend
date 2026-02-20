const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Message = sequelize.define('Message', {
    text: { type: DataTypes.TEXT, allowNull: false },
});

module.exports = Message;