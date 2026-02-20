const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Consultation = sequelize.define('Consultation', {
    status: { 
        type: DataTypes.ENUM('pending', 'active', 'ended'), 
        defaultValue: 'pending' 
    },
    price: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    }
});

module.exports = Consultation;