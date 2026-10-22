const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");
    try {
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      if (!hello.setName && !hello.msg?.includes("isdbgrid")) {
        console.warn("WARNING: MongoDB is not running as a replica set. Razorpay chip checkout is safely disabled until transaction support is configured.");
      } else {
        console.log("MongoDB transaction-capable topology detected");
      }
    } catch (diagnosticError) {
      console.warn("Could not verify MongoDB transaction support:", diagnosticError.message);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;