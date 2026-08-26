import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  updatePassword,
  updateEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import Navbar from "./Navbar";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [newName, setNewName] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.currentUser) return;
      const refDoc = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(refDoc);
      setProfile(snap.exists() ? snap.data() : {});
    };
    loadProfile();
  }, []);

  const reauthenticateUser = async () => {
    if (!currentPassword) throw new Error("Add meg a jelenlegi jelszavad!");
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const handleSubmitRequest = async () => {
    if (!newName.trim() || !reason.trim()) {
      setError("❌ Tölts ki minden mezőt!");
      return;
    }

    try {
      await addDoc(collection(db, "nameChangeRequests"), {
        userId: auth.currentUser.uid,
        oldName: profile?.displayName || "Nincs megadva",
        newName,
        reason,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      setMessage("✅ Névváltoztatási kérelem elküldve!");
      setError("");
      setNewName("");
      setReason("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangeEmail = async () => {
    try {
      await reauthenticateUser();
      await updateEmail(auth.currentUser, newEmail);
      await sendEmailVerification(auth.currentUser);

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        email: newEmail,
        emailVerified: false,
      });

      setMessage("✅ E-mail frissítve!");
      setError("");
      setNewEmail("");
      setCurrentPassword("");
    } catch (err) {
      setError("E-mail hiba: " + err.message);
    }
  };

  const handleChangePassword = async () => {
    try {
      await reauthenticateUser();
      await updatePassword(auth.currentUser, newPassword);

      setMessage("✅ Jelszó frissítve!");
      setError("");
      setNewPassword("");
      setCurrentPassword("");
    } catch (err) {
      setError("Jelszó hiba: " + err.message);
    }
  };

  return (
    <>
      <Navbar />

      <div
        className="min-h-screen text-white pt-28 bg-cover bg-center"
        style={{
          backgroundImage: "url('/background.webp')",
        }}
      >
        <div className="fixed inset-0 bg-black/60 -z-10" />

        <main className="max-w-5xl mx-auto px-4 pb-12">
          <div className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)]">

            <h1 className="text-2xl font-bold text-[#ffb870] mb-6">
              Profil beállítások
            </h1>

            <div className="grid md:grid-cols-3 gap-6">

              <div className="space-y-4 text-sm opacity-90">
                <Info label="Ingame név" value={profile?.displayName} />
                <Info label="Felhasználónév" value={profile?.username} />
                <Info label="E-mail" value={auth.currentUser?.email} />
                <Info
                  label="Státusz"
                  value={
                    auth.currentUser?.emailVerified
                      ? "✅ Megerősítve"
                      : "❌ Nincs megerősítve"
                  }
                />
              </div>

              <div className="md:col-span-2 space-y-8">

                <Section title="Névváltoztatási kérelem">
                  <Input value={newName} onChange={setNewName} placeholder="Új név..." />
                  <Textarea value={reason} onChange={setReason} placeholder="Indoklás..." />
                  <PrimaryButton onClick={handleSubmitRequest}>
                    Kérelem elküldése
                  </PrimaryButton>
                </Section>

                <Section title="Biztonsági módosítások">
                  <Input
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Jelenlegi jelszó"
                    type="password"
                  />

                  <div className="grid md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Input
                        value={newEmail}
                        onChange={setNewEmail}
                        placeholder="Új e-mail"
                        type="email"
                      />
                      <PrimaryButton onClick={handleChangeEmail}>
                        E-mail frissítése
                      </PrimaryButton>
                    </div>

                    <div className="space-y-2">
                      <Input
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Új jelszó"
                        type="password"
                      />
                      <PrimaryButton onClick={handleChangePassword}>
                        Jelszó módosítása
                      </PrimaryButton>
                    </div>

                  </div>
                </Section>

              </div>
            </div>

            {message && <p className="mt-4 text-green-400">{message}</p>}
            {error && <p className="mt-4 text-red-400">{error}</p>}

          </div>
        </main>
      </div>
    </>
  );
}


function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-[#ffb870] font-semibold mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs opacity-60">{label}</p>
      <p className="font-semibold text-[#f8e4c3]">{value || "Nincs megadva"}</p>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 bg-black/40 border border-orange-500/20 rounded-lg focus:ring focus:ring-[#ff9b42]/30 outline-none text-[#f8e4c3]"
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-3 bg-black/40 border border-orange-500/20 rounded-lg focus:ring focus:ring-[#ff9b42]/30 outline-none text-[#f8e4c3]"
    />
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#72b584] text-white py-2 rounded-lg font-semibold"
    >
      {children}
    </button>
  );
}
