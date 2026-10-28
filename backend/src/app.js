import mongoose from "mongoose";

export const connectDb = async () => {
  await mongoose.connect(() => {
    console.log("mongoDb connected successfully");
  });
};
