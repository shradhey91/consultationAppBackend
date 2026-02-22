const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, feePerMin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      // Only set fee if role is expert
      feePerMin: role === "expert" ? feePerMin : 0,
    });
    res.status(201).json({ message: "User created", userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExperts = async (req, res) => {
  try {
    const experts = await User.findAll({
      where: { role: "expert" },
      attributes: ["id", "name", "walletBalance", "feePerMin"],
    });
    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        wallet: user.walletBalance,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
