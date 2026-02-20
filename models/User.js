const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { 
        type: DataTypes.ENUM('user', 'expert'), 
        defaultValue: 'user' 
    },
    walletBalance: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0.00 
    }
});

module.exports = User;