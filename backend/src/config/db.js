import mongoose from "mongoose";

export const connecctDb = async () => {
  try {
    await mongoose.connect("0.0.0.0/user-profile");
    console.log("MongoDb connected Successfully");
  } catch (error) {
    console.error("MongoDB connection Failed", error.message);
  }
};
