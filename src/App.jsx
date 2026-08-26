import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, reload } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import Pending from "./Pending";
import Profile from "./Profile";
import AdminPanel from "./AdminPanel";
import Home from "./Home";
import MyReports from "./MyReports";
import Suspended from "./Suspended";

export default function App() {
  const [user, setUser] = useState(null);
  const [approved, setApproved] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.location.hash.startsWith("#/")) return;

    const basePath = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : window.location.pathname.slice(0, window.location.pathname.lastIndexOf("/") + 1);

    if (window.location.pathname !== basePath) {
      window.history.replaceState(null, "", `${basePath}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        try {
          await reload(currentUser);

          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          const data = snap.exists() ? snap.data() : {};

          if (currentUser.emailVerified && !data.emailVerified) {
            await updateDoc(userRef, { emailVerified: true });
          }

          setApproved(data.approved !== true);
          setEmailVerified(currentUser.emailVerified);
          setIsAdmin(data.role === "admin");
          setSuspended(data.suspended === true);
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-xl">
        Betöltés...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {user && suspended ? (
          <>
            <Route path="/suspended" element={<Suspended />} />
            <Route path="*" element={<Navigate to="/suspended" />} />
          </>
        ) : !user ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : !emailVerified ? (
          <>
            <Route path="/pending" element={<Pending />} />
            <Route path="*" element={<Navigate to="/pending" />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/home" element={<Home />} />
            <Route path="/jelenteseim" element={<MyReports />} />
            {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
