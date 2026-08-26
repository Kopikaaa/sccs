import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = "baldarchi89@gmail.com";

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ ${email} mostantól ADMIN jogosultságot kapott!`);
  } catch (err) {
    console.error("❌ Hiba:", err);
  }
})();
