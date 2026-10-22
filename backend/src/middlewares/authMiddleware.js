const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    if (!userId) return res.status(401).json({ success: false, message: "Invalid authentication token" });
    // Always use the current database role/status, not a potentially stale JWT role.
    const user = await User.findById(userId).select("name email role status");
    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, message: "Account is unavailable or inactive" });
    }
    req.user = { id: user._id.toString(), name: user.name, role: user.role, email: user.email };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    next(error);
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "You do not have permission" });
  }
  next();
};

module.exports = { protect, allowRoles };
