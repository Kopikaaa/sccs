import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Pending() {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      await user.reload();
      setVerified(user.emailVerified);
      setLoading(false);

      if (user.emailVerified) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-lg shadow-lg">
        <h1 className="text-3xl font-bold text-blue-400 mb-4">E-mail megerősítés</h1>
        {!verified ? (
          <>
            <p className="text-gray-300 mb-3">
              📧 Kérjük, erősítsd meg az e-mail címedet a regisztrációkor kapott levélben.
            </p>
            <p className="text-sm text-gray-400">
              Amint megerősítetted, automatikusan továbbítunk a főoldalra.
            </p>
          </>
        ) : (
          <p className="text-green-400 font-semibold">
            ✅ E-mail megerősítve, átirányítás...
          </p>
        )}
      </div>
    </div>
  );
}
