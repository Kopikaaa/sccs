import { useEffect, useState, useRef } from "react";
import { auth, db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
  Info,
  Trophy,
} from "lucide-react";

export default function Navbar() {
  const [name, setName] = useState("Felhasználó");
  const [rank, setRank] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const prevNotifRef = useRef([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = currentTime.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateText = currentTime.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  useEffect(() => {
    const loadUser = async () => {
      if (!auth.currentUser) return;
      const ref = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.displayName || data.username || "Felhasználó");
        setRank(data.rank || "");
        setIsAdmin(data.role === "admin");
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "notifications"),
      where("target", "in", ["all", uid]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const count = notifications.filter(
      (n) => !(n.readBy && n.readBy.includes(uid))
    ).length;

    setUnreadCount(count);
  }, [notifications]);

  useEffect(() => {
    if (!notifications.length) return;

    const prev = prevNotifRef.current;
    if (prev.length && notifications[0].id !== prev[0].id) {
      setToast(notifications[0]);
      setTimeout(() => setToast(null), 4000);
    }

    prevNotifRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, []);

  const toggleMenu = () => {
    setMenuOpen((p) => !p);
    setNotifOpen(false);
  };

  const toggleNotifications = () => {
    setNotifOpen((p) => !p);
    setMenuOpen(false);

    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    notifications.slice(0, 10).forEach(async (n) => {
      const readBy = n.readBy || [];
      if (!readBy.includes(uid)) {
        await updateDoc(doc(db, "notifications", n.id), {
          readBy: [...readBy, uid],
        });
      }
    });
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const getNotificationMeta = (n) => {
    const text = n.body || n.message || n.title || "Új értesítés";

    if (n.type === "report_closed")
      return { text, icon: CheckCircle, color: "text-green-400" };

    if (n.type === "report_rejected")
      return { text, icon: XCircle, color: "text-red-400" };

    if (n.type === "rank_update")
      return { text, icon: Trophy, color: "text-yellow-400" };

    return { text, icon: Info, color: "text-blue-400" };
  };

return (
  <>
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div
        className="flex items-center justify-between rounded-2xl px-6 py-3 border bg-[#090a0c]/95"
        style={{
          background: "rgba(15,15,18,0.7)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
        }}
      >
<div onClick={() => navigate("/dashboard")} className="cursor-pointer">
  <img src="/logo.webp" alt="Logo" className="h-14 w-auto" />




        </div>

        {auth.currentUser && (
          <div className="absolute left-1/2 -translate-x-1/2 text-gray-300 text-sm">
            Jó szolgálatot,{" "}
            <span className="text-white font-semibold">{name}</span>
            {rank && <span className="text-gray-400 ml-1">({rank})</span>}
          </div>
        )}

        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <div className="hidden sm:flex flex-col items-end mr-1 text-xs leading-tight text-gray-400">
            <span className="font-mono text-[#ffddb0]">{timeText}</span>
            <span>{dateText}</span>
          </div>

          <button
            onClick={toggleNotifications}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <Bell className="w-5 h-5 text-gray-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#72b584] text-black text-xs px-1.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <Shield className="w-5 h-5 text-gray-200" />
            </button>
          )}

          <button
            onClick={toggleMenu}
            className={`p-2 rounded-xl transition ${
              menuOpen
                ? "bg-[#72b584] text-black"
                : "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200"
            }`}
          >
            ☰
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-14 w-80 max-h-96 overflow-y-auto rounded-2xl border bg-[#111114]/95 border-white/10 p-2 animate-slideDown">
              {notifications.map((n) => {
                const { text, icon: Icon, color } = getNotificationMeta(n);
                const unread = !(n.readBy && n.readBy.includes(auth.currentUser?.uid));

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border-b border-white/5 ${
                      unread ? "bg-white/5" : ""
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${color} shrink-0`} />
                    <div className="text-gray-200 text-sm">{text}</div>
                  </div>
                );
              })}
            </div>
          )}

          {menuOpen && (
            <div className="absolute right-0 top-14 w-64 rounded-2xl border bg-[#111114]/95 border-white/10 p-2 flex flex-col">
              <Link className="menuItemDark" to="/">Főoldal</Link>
              <Link className="menuItemDark" to="/jelenteseim">
  Jelentéseim
</Link>

              <Link className="menuItemDark" to="/profile">Profil</Link>
              
              {isAdmin && (
                <Link className="menuItemDark" to="/admin">
                  Admin panel
                </Link>
              )}
              <button onClick={handleLogout} className="menuItemDark text-red-400">
                Kijelentkezés
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>

    {toast && (
      <div className="fixed top-20 right-6 z-[999] animate-toastIn">
        <div className="bg-[#111114]/95 border border-white/10 rounded-xl px-4 py-3 shadow-xl">
          <div className="text-gray-200 text-sm font-medium">
            {getNotificationMeta(toast).text}
          </div>
        </div>
      </div>
    )}
  </>
);

}
