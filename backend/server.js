import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./src/app.js";
dotenv.config();

const app = express();
connectDb();
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
