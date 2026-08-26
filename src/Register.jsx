import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getDocs,
  getDoc,
  updateDoc,
  collection,
  where,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const Register = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [loading, setLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [error, setError] = useState("");
  const [inviteDocId, setInviteDocId] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteToken) {
        setError("❌ Hiányzó meghívó token.");
        setLoading(false);
        return;
      }

      try {
        const invitesRef = collection(db, "inviteLinks");
        const q = query(invitesRef, where("token", "==", inviteToken));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("❌ Érvénytelen meghívó link.");
          setLoading(false);
          return;
        }

        const docData = snap.docs[0].data();
        setInviteDocId(snap.docs[0].id);

        if (docData.used) {
          setError("⚠️ Meghívó már felhasználva.");
        } else {
          setInviteValid(true);
        }
      } catch (err) {
        setError("⚠️ Hiba történt.");
      } finally {
        setLoading(false);
      }
    };

    checkInvite();
  }, [inviteToken]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!inviteValid || !inviteDocId) return;

    try {
      const usernameRef = doc(db, "usernames", username);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        setError("❌ Ez a felhasználónév már foglalt.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });
      await sendEmailVerification(user);

      await updateDoc(doc(db, "inviteLinks", inviteDocId), {
        used: true,
        usedBy: user.uid,
        usedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        username,
        createdAt: serverTimestamp(),
        role: "user",
      });

      await setDoc(doc(db, "usernames", username), {
        email: user.email,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      alert("✅ Sikeres regisztráció! Ellenőrizd az emailed.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#ffddb0]"
        style={{
          backgroundImage: "url('/background.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
        🔄 Meghívó ellenőrzése...
      </div>
    );
  }

  if (!inviteValid || !inviteDocId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#ffddb0]"
        style={{ backgroundImage: "url('/background.webp')", backgroundSize: "cover" }}>
        <div className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-semibold text-orange-300 mb-2">
            Regisztráció
          </h2>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#f8e4c3]"
      style={{
        backgroundImage: "url('/background.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <form
        onSubmit={handleRegister}
        className="
          w-[380px] p-8 rounded-2xl
          bg-[#1a1a1a]/90
          border border-orange-500/20
          shadow-xl
        "
      >
        <h2 className="text-2xl font-bold text-orange-300 text-center mb-6">
          Felhasználói regisztráció
        </h2>

        {error && (
          <p className="text-red-400 text-center mb-4">{error}</p>
        )}

        <input
          type="text"
          placeholder="Teljes név [IG]"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full p-3 mb-3 rounded-lg bg-black/40 border border-orange-500/20 focus:ring-2 focus:ring-orange-500/30 outline-none"
        />

        <input
          type="text"
          placeholder="Felhasználónév"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 mb-3 rounded-lg bg-black/40 border border-orange-500/20 focus:ring-2 focus:ring-orange-500/30 outline-none"
        />

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-3 rounded-lg bg-black/40 border border-orange-500/20 focus:ring-2 focus:ring-orange-500/30 outline-none"
        />

        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-5 rounded-lg bg-black/40 border border-orange-500/20 focus:ring-2 focus:ring-orange-500/30 outline-none"
        />

        <button
          type="submit"
          className="
            w-full py-3 rounded-lg font-semibold
            bg-[#72b584]
            text-[#0f1a14]
            hover:brightness-110
            transition
          "
        >
          Regisztráció
        </button>
      </form>
    </div>
  );
};

export default Register;
