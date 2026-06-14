const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === "your_mongodb_connection_string_here") {
    console.error(
      "\n  ❌  MONGO_URI is not set!\n" +
      "      Open the root .env file and replace 'your_mongodb_connection_string_here'\n" +
      "      with your real MongoDB Atlas connection string.\n" +
      "      Example: MONGO_URI=mongodb+srv://user:pass@cluster0.abcde.mongodb.net/tathya\n"
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("");
    console.log("  ✅  Connected Successfully to MongoDB Atlas Cluster! 🎉");
  } catch (error) {
    console.error(`\n  ❌  MongoDB connection error: ${error.message}\n`);
    process.exit(1);
  }
};

module.exports = connectDB;