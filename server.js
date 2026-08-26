import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import uploadRouter from "./api/upload.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/upload", uploadRouter);

app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API működik!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend fut: http://localhost:${PORT}`));
