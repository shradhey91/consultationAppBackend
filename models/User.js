const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("user", "expert"),
    defaultValue: "user",
  },
  walletBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.0,
  },
  feePerMin: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, 
    defaultValue: 0.0,
  },
});

module.exports = User;
