import express from "express";
import uploadRoute from "../api/upload.js";
import { onRequest } from "firebase-functions/v2/https";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/upload", uploadRoute);

export const api = onRequest(app);
