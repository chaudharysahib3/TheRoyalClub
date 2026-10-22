const { loginUser } = require("../services/authService");
const { requestPlayerRegistrationOtp, verifyPlayerRegistrationOtp } = require("../services/playerAuthService");
const jwt = require("jsonwebtoken");

const login = async (req, res, next) => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginIdentifier = identifier || email || phone;

    if (
      typeof loginIdentifier !== "string" ||
      typeof password !== "string" ||
      !loginIdentifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile number and password are required"
      });
    }

    const result = await loginUser(loginIdentifier, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      ...result
    });
  } catch (error) {
    if (
      error.message === "Invalid email or password" ||
      error.message === "Your account is inactive"
    ) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

const requestSignupOtp = async (req, res, next) => {
  try {
    const result = await requestPlayerRegistrationOtp(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const verifySignupOtp = async (req, res, next) => {
  try {
    const result = await verifyPlayerRegistrationOtp(req.body);
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    const token = jwt.sign({ userId: result.user.id, role: "player", email: result.user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.status(201).json({ success: true, message: "Email verified and player account created successfully", token, user: result.user, player: result.player });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, requestSignupOtp, verifySignupOtp };
