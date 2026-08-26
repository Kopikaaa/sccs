import { useState } from "react";
import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let email;
      let displayName = loginInput;

      const usernameRef = doc(db, "usernames", displayName);
      const snap = await getDoc(usernameRef);

      if (snap.exists()) {
        email = snap.data().email;
      } else {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);
        if (!isEmail) throw new Error("Nincs ilyen felhasználó!");
        email = loginInput;
      }

      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistence);

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      await user.reload();

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let finalDisplayName = displayName;

      if (userSnap.exists()) {
        const data = userSnap.data();
        finalDisplayName = data.displayName || displayName;
      }

      await setDoc(
        doc(db, "usernames", finalDisplayName),
        {
          uid: user.uid,
          email: user.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      if (user.emailVerified) {
        await updateDoc(userRef, { emailVerified: true });
      }

      if (!user.emailVerified) {
        navigate("/pending");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      if (err.message === "Nincs ilyen felhasználó!") {
        setError("❌ Nincs ilyen felhasználó!");
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setError("❌ Hibás jelszó!");
      } else {
        setError("⚠️ Hiba történt: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    try {
      const ref = doc(db, "usernames", loginInput);
      const snap = await getDoc(ref);

      let email;

      if (snap.exists()) {
        email = snap.data().email;
      } else {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);
        if (!isEmail) throw new Error("Nincs ilyen felhasználó!");
        email = loginInput;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage(`📧 Email elküldve: ${email}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white bg-cover bg-center"
      style={{
        backgroundImage: "url('/background.webp')",
      }}
    >
      <div className="w-full max-w-md bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center mb-5">
          <img src="/logo.webp" alt="SeeCity Car Service" className="h-20 w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-orange-300 text-center mb-6">
          Bejelentkezés
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Felhasználónév vagy email"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/40 border border-orange-500/20 text-[#f8e4c3]"
            required
          />

          <input
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/40 border border-orange-500/20 text-[#f8e4c3]"
            required
          />

          <label className="flex items-center text-sm text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2 accent-orange-400"
            />
            Jegyezzen meg
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`py-2 rounded-lg font-semibold ${
              loading
                ? "bg-gray-600"
                : "bg-[#72b584] hover:bg-[#5aa56d]"
            }`}
          >
            {loading ? "Bejelentkezés..." : "Bejelentkezés"}
          </button>
        </form>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        {message && (
          <p className="text-green-400 mt-4 text-center">{message}</p>
        )}

        <button
          onClick={handleForgotPassword}
          className="text-sm text-orange-300 hover:underline mt-4 block mx-auto"
        >
          Elfelejtett jelszó?
        </button>
      </div>
    </div>
  );
}
