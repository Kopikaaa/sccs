import express from "express";
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Feltöltési hiba:", err);
      return res.status(500).json({ error: "Hiba a fájl feldolgozása közben." });
    }

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: "Nincs feltöltött fájl." });
    }

    try {
      const imageBase64 = fs.readFileSync(file.filepath, { encoding: "base64" });

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
        {
          method: "POST",
          body: new URLSearchParams({ image: imageBase64 }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        console.error("❌ ImgBB hiba:", result);
        return res.status(500).json({ error: "Nem sikerült feltölteni az Imgbb-re." });
      }

      res.json({
        message: "✅ Feltöltés sikeres!",
        imageUrl: result.data.url,
      });
    } catch (error) {
      console.error("❌ Feltöltési hiba:", error);
      res.status(500).json({ error: "Kép feltöltési hiba történt." });
    }
  });
});

export default router;
