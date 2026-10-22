const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  if (err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "KYC document must be 5 MB or smaller" : "Invalid KYC upload";
  }
  if (process.env.NODE_ENV === "production" && statusCode >= 500) message = "Internal server error";
  res.status(statusCode).json({ success: false, message });
};
module.exports = errorMiddleware;
