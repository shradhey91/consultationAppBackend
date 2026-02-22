const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const Consultation = sequelize.define(
  "Consultation",
  {
    // Session status
    status: {
      type: DataTypes.ENUM("pending", "active", "ended"),
      defaultValue: "pending",
      allowNull: false,
    },

    // Price per minute (copied from expert at booking time)
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // When expert accepts session
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // When session ends
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Final calculated amount (duration × price)
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt automatically
  },
);

module.exports = Consultation;
