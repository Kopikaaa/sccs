import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import Navbar from "./Navbar";
import { v4 as uuidv4 } from "uuid";

const reportTypeLabels = {
  normal: "Normál",
  alap: "Alap",
  dupla: "Dupla",
  casco: "Casco",
  forgalmi: "Forgalmi",
};


export default function AdminPanel() {
  const [reports, setReports] = useState([]);
  const [nameRequests, setNameRequests] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [meetingSummary, setMeetingSummary] = useState([]);
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [archived, setArchived] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);


  const [expandedArchive, setExpandedArchive] = useState(null);
  const [expandedUserReports, setExpandedUserReports] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const data = userSnap.exists() ? userSnap.data() : null;
          setCurrentUserData(data);

          if (data && data.suspended) {
            try {
              await firebaseSignOut(auth);
            } catch (errSign) {
              console.error("Error signing out suspended user (client):", errSign);
            }
            alert("Hozzáférés megtagadva. Fiókod felfüggesztve lett.");
            return;
          }
        } catch (err) {
          console.error("Error fetching current user doc:", err);
          setCurrentUserData(null);
        }
      } else {
        setCurrentUserData(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const qReports = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsubReports = onSnapshot(qReports, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qNames = query(collection(db, "nameChangeRequests"), orderBy("timestamp", "desc"));
    const unsubNames = onSnapshot(qNames, (snap) => {
      setNameRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qMeet = query(collection(db, "meetingSummary"), orderBy("createdAt", "desc"));
    const unsubMeet = onSnapshot(qMeet, (snap) => {
      setMeetingSummary(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qUsers = query(collection(db, "users"), where("approved", "==", false), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setPendingUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qAllUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubAllUsers = onSnapshot(qAllUsers, (snap) => {
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);

    return () => {
      try { unsubReports(); } catch (e) { }
      try { unsubNames(); } catch (e) { }
      try { unsubMeet(); } catch (e) { }
      try { unsubUsers(); } catch (e) { }
      try { unsubAllUsers(); } catch (e) { }
    };
  }, []);

  useEffect(() => {
    let unsubArchived = null;

    if (!currentUser) {
      return;
    }

    const loadArchived = async () => {
      try {
        let userData = currentUserData;
        if (!userData) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const uSnap = await getDoc(userRef);
            userData = uSnap.exists() ? uSnap.data() : {};
            setCurrentUserData(userData || null);
          } catch (err) {
            console.error("Failed to fetch user doc for archived load:", err);
            userData = {};
          }
        }

        let qArchived;
        if (userData?.role === "admin") {
          qArchived = query(collection(db, "archivedMeetings"), orderBy("archivedAt", "desc"));
        } else {
          qArchived = query(
            collection(db, "archivedMeetings"),
            where("userId", "==", currentUser.uid),
            orderBy("archivedAt", "desc")
          );
        }

        unsubArchived = onSnapshot(qArchived, (snap) => {
          setArchived(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
      } catch (err) {
        console.error("Error loading archived meetings:", err);
      }
    };

    loadArchived();

    return () => {
      try {
        if (typeof unsubArchived === "function") unsubArchived();
      } catch (e) {
      }
    };
  }, [currentUser, currentUserData]);

  useEffect(() => {
    const total =
      (nameRequests.filter((n) => !n.status || n.status === "pending").length || 0) +
      (pendingUsers.length || 0);
    setPendingCount(total);
  }, [nameRequests, pendingUsers]);

  const normalize = (s) => {
    if (!s) return "";
    return String(s).replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();
  };

  const isExtraChargeApplicable = (report) => {
    if (!report) return false;
    if ((report.reportType || "").toString().toLowerCase() !== "extra") return false;

    const fine = Number(report.fineAmount || 0);
    if (fine > 0) return false;
    return true;
  };

  const handleApproveUser = async (uid) => {
    if (!window.confirm("Biztosan jóváhagyod a felhasználót?")) return;
    try {
      await updateDoc(doc(db, "users", uid), { approved: true, approvedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        target: uid,
        title: "Fiók jóváhagyva",
        body: "Az admin jóváhagyta a regisztrációdat — most már használhatod az oldalt.",
        createdAt: serverTimestamp(),
        readBy: [],
      });
      setPendingUsers((prev) => prev.filter((u) => u.id !== uid));
      alert("Felhasználó jóváhagyva.");
    } catch (err) {
      console.error(err);
      alert("Hiba a jóváhagyás során: " + (err.message || err));
    }
  };

  const handleToggleSuspendUser = async (uid, currentlySuspended) => {
    const action = currentlySuspended ? "visszaállítod" : "felfüggeszted";
    if (!window.confirm(`Biztosan ${action} a felhasználót?`)) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        suspended: !currentlySuspended,
        suspendedAt: !currentlySuspended ? serverTimestamp() : null,
      });
      await addDoc(collection(db, "notifications"), {
        target: uid,
        title: !currentlySuspended ? "Fiók felfüggesztve" : "Fiók visszaállítva",
        body: !currentlySuspended
          ? "Az admin felfüggesztette a fiókodat. A hozzáférés korlátozott."
          : "Az admin visszaállította a fiókodat. Ismét hozzáférhetsz az oldalhoz.",
        createdAt: serverTimestamp(),
        readBy: [],
      });
      alert("Sikeresen frissítve.");
    } catch (err) {
      console.error(err);
      alert("Hiba a felfüggesztés során: " + (err.message || err));
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!window.confirm("Biztosan törlöd a felhasználót a rendszerből?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setAllUsers((prev) => prev.filter((u) => u.id !== uid));
      setPendingUsers((prev) => prev.filter((u) => u.id !== uid));
      alert("Felhasználó törölve (Firestore-ból).");
    } catch (err) {
      console.error(err);
      alert("Hiba a felhasználó törlésekor: " + (err.message || err));
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Biztosan törlöd ezt a jelentést?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      alert("Jelentés törölve.");
    } catch (err) {
      console.error(err);
      alert("Hiba a törlésnél: " + (err.message || err));
    }
  };

  const handleApproveName = async (req) => {
    const userId = req.userId || req.uid || req.user || null;
    if (!userId) {
      alert("Hiba: a kérelmező userId nem található a kérelemben.");
      return;
    }
    if (!window.confirm(`Elfogadod a névváltoztatást: ${req.oldName} → ${req.newName}?`)) return;

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { displayName: req.newName });
      } else {
        console.warn("User doc not found for name change:", userId);
      }

      await addDoc(collection(db, "notifications"), {
        target: userId,
        title: "Névváltoztatás elfogadva",
        body: `A névváltoztatási kérelmed elfogadva: ${req.newName}`,
        createdAt: serverTimestamp(),
        readBy: [],
      });

      try {
        await deleteDoc(doc(db, "nameChangeRequests", req.id));
      } catch (delErr) {
        console.warn("Failed to delete nameChangeRequests doc:", delErr);
      }

      setNameRequests((prev) => prev.filter((r) => r.id !== req.id));
      alert("Név frissítve és kérelem eltávolítva.");
    } catch (err) {
      console.error(err);
      alert("Hiba az elfogadás során: " + (err.message || err));
    }
  };

  const handleRejectName = async (req) => {
    const userId = req.userId || req.uid || req.user || null;
    if (!userId) {
      alert("Hiba: a kérelmező userId nem található a kérelemben.");
      return;
    }
    if (!window.confirm(`Elutasítod a névváltoztatási kérelmet: ${req.oldName} → ${req.newName}?`)) return;

    try {
      await addDoc(collection(db, "notifications"), {
        target: userId,
        title: "Névváltoztatás elutasítva",
        body: "A névváltoztatási kérelmedet elutasítottuk.",
        createdAt: serverTimestamp(),
        readBy: [],
      });

      try {
        await deleteDoc(doc(db, "nameChangeRequests", req.id));
      } catch (delErr) {
        console.warn("Failed to delete nameChangeRequests doc:", delErr);
      }

      setNameRequests((prev) => prev.filter((r) => r.id !== req.id));
      alert("Kérelem elutasítva és eltávolítva.");
    } catch (err) {
      console.error(err);
      alert("Hiba az elutasításnál: " + (err.message || err));
    }
  };


 const aggregateReportsPerUser = (dataReports) => {
  const perUser = {};

  for (const r of dataReports) {
    const name = r.displayName || r.username || r.user || "Ismeretlen";
    const key = normalize(name) || name;

    if (!perUser[key]) {
      perUser[key] = {
        name,
        normal: 0,
        alap: 0,
        dupla: 0,
        casco: 0,
        forgalmi: 0,
        quest: 0,
        fines: 0,
        amountTotal: 0,
      };
    }

    const type = (r.reportType || "").toLowerCase();
    const fine = Number(r.fineAmount || 0);

    if (type === "quest") {
      perUser[key].quest += 1;
    } else {
      const reportCategory = ["alap", "dupla", "casco", "forgalmi"].includes(type)
        ? type
        : "alap";
      perUser[key][reportCategory] += 1;
      perUser[key].normal += 1;
    }

    if (fine > 0) {
      perUser[key].fines += fine;
    }

    if (type !== "quest") {
      perUser[key].amountTotal += Number(r.amount || 0);
    }
  }

  return Object.entries(perUser).map(([k, v]) => {
    const normalSum = v.amountTotal;
    const total = v.amountTotal + v.fines;

    return {
      name: v.name,
      normalizedName: k,
      normal: v.normal,
      alap: v.alap,
      dupla: v.dupla,
      casco: v.casco,
      forgalmi: v.forgalmi,
      quest: v.quest,
      fines: v.fines,
      amountTotal: v.amountTotal,
      normalSum,
      total,
    };
  });
};


  const handleGenerateSummary = async () => {
    try {
      const snap = await getDocs(collection(db, "reports"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const rows = aggregateReportsPerUser(data);

      await addDoc(collection(db, "meetingSummary"), {
        createdAt: serverTimestamp(),
        totalReports: data.length,
        perUser: rows,
      });

      alert("Meeting összegző létrehozva.");
    } catch (err) {
      console.error(err);
      alert("Hiba a meeting összegzés létrehozásakor: " + (err.message || err));
    }
  };

  const handleArchiveWeekly = async () => {
    if (!window.confirm("Archiválod a jelenlegi meeting összegzőt és a hozzátartozó jelentéseket? (A jelentések a 'archivedMeetings' gyűjteménybe kerülnek, majd törlődnek a 'reports'-ból)")) return;
    try {
      const msSnap = await getDocs(collection(db, "meetingSummary"));
      const msDocs = msSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      let chosenSummary = null;
      if (msDocs.length > 0) {
        chosenSummary = msDocs.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))[0];
      }

      const reportsSnap = await getDocs(collection(db, "reports"));
      const reportsData = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

const archivedDoc = {
  archivedAt: serverTimestamp(),
  archivedAtRaw: new Date().toISOString(),

  summary: chosenSummary || {
    createdAt: serverTimestamp(),
    totalReports: reportsData.length,
    perUser: aggregateReportsPerUser(reportsData),
  },

reports: reportsData.map((r) => ({
  id: r.id,
  displayName: r.displayName || null,
  userId: r.userId || null,
  reportType: r.reportType || "alap",
  vehicleName: r.vehicleName || r.vehicleType || null,
  amount: Number(r.amount || 0),
  imageUrl: r.imageUrl || null,
  createdAt: r.createdAt || null,
}))

};


      await addDoc(collection(db, "archivedMeetings"), archivedDoc);

for (const r of reportsSnap.docs) {
  try {
    await deleteDoc(doc(db, "reports", r.id));
  } catch (delErr) {
    console.warn("Failed to delete report doc during archive:", r.id, delErr);
  }
}

await addDoc(collection(db, "notifications"), {
  target: "all",
  title: "📦 Jelentések lezárva",
  body: `A jelentések lezárásra kerültek — mostantól újakat küldhettek be! (Lezárta: ${currentUserData?.displayName || currentUserData?.username || "Admin"})`,
  createdAt: serverTimestamp(),
  readBy: [],
});


alert("Archiválás sikeres — minden felhasználó értesítést kapott, hogy új jelentések jöhetnek!");

    } catch (err) {
      console.error(err);
      alert("Archiválási hiba: " + (err.message || err));
    }
  };

  const handleCleanupArchived = async () => {
    if (!window.confirm("Töröljük az archivált meetingeket, amelyek 14 napnál régebbiek?")) return;
    try {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const snap = await getDocs(collection(db, "archivedMeetings"));
      let removed = 0;
      for (const d of snap.docs) {
        const data = d.data();
        let archivedAtDate = null;
        if (data.archivedAt?.toDate) archivedAtDate = data.archivedAt.toDate();
        else if (data.archivedAtRaw) archivedAtDate = new Date(data.archivedAtRaw);
        if (archivedAtDate && archivedAtDate < cutoff) {
          await deleteDoc(doc(db, "archivedMeetings", d.id));
          removed++;
        }
      }
      alert(`Törölve ${removed} archivált meeting (14 napnál régebbi).`);
    } catch (err) {
      console.error(err);
      alert("Hiba a cleanup során: " + (err.message || err));
    }
  };

  const computeMeetingRows = useMemo(() => {
    return aggregateReportsPerUser(reports).sort((a, b) => b.total - a.total);
  }, [reports]);






const reportsByUser = useMemo(() => {
  const map = {};

  reports.forEach((r) => {
    const name = r.displayName || r.user || "Ismeretlen";

    if (!map[name]) {
      map[name] = {
        name,
        rank: r.userRank || null,
        reports: [],
        total: 0,
        quest: 0,
      };
    }

    map[name].reports.push(r);

    if ((r.reportType || "").toLowerCase() === "quest") {
      map[name].total += 1;
      map[name].quest += 1;
    } else {
      map[name].total += 1;
    }
  });

  return Object.values(map);
}, [reports]);


  const getPerUserArray = (meeting) => {
    if (!meeting) return [];

    if (meeting.summary && Array.isArray(meeting.summary.perUser) && meeting.summary.perUser.length > 0) {
      return meeting.summary.perUser.map((u, i) => {
        const name = u.name || u.displayName || u.username || "Ismeretlen";
        const normalizedName = normalize(name);
        const userId = u.userId || null;
        const normal = Number(u.normal || u.normals || 0);
        const extra = Number(u.extra || 0);
        const fines = Number(u.fines || u.fine || 0);
        const normalSum = Number(u.amountTotal ?? u.normalSum ?? 0);
        const extraSum = extra * Number(extraPrice || 0);
        const total = Number(u.total ?? (normalSum + extraSum + fines));
        const key = `summary_${i}_${normalizedName}_${userId || "nouid"}`;
        return {
          key,
          name,
          normalizedName,
          userId,
          normal,
          extra,
          fines,
          normalSum,
          extraSum,
          total,
        };
      });
    }

    const map = {};
    (meeting.reports || []).forEach((r, idx) => {
      const name = r.displayName || r.user || "Ismeretlen";
      const normalized = normalize(name);
      const uidPart = r.userId ? String(r.userId) : "";
      const key = `${uidPart}_${normalized}_${idx}`;

      if (!map[key]) {
        map[key] = { name, normalizedName: normalized, userId: r.userId || null, normal: 0, extra: 0, amountTotal: 0, fines: 0 };
      }

      const fineNumber = Number(r.fineAmount || 0);
      if ((r.reportType || "").toString().toLowerCase() === "extra") {
        if (fineNumber > 0) {
          map[key].fines += fineNumber;
        } else {
          map[key].extra += 1;
        }
      } else {
        map[key].normal += 1;
        if (fineNumber > 0) map[key].fines += fineNumber;
      }

      if ((r.reportType || "").toString().toLowerCase() !== "quest") {
        map[key].amountTotal += Number(r.amount || 0);
      }
    });

    return Object.entries(map).map(([k, u]) => {
      const normalSum = Number(u.amountTotal || 0);
      const extraSum = (u.extra || 0) * Number(extraPrice || 0);
      const total = normalSum + extraSum + (u.fines || 0);
      return { key: k, ...u, normalSum, extraSum, total };
    });
  };

  const toggleExpandedUserReports = (meetingId, userKey) => {
    setExpandedUserReports((prev) => {
      const current = prev[meetingId];
      if (current === userKey) {
        return { ...prev, [meetingId]: null };
      } else {
        return { ...prev, [meetingId]: userKey };
      }
    });
  };

  const pendingNameRequests = nameRequests.filter((r) => !r.status || r.status === "pending");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>Betöltés...</p>
      </div>
    );
  }

  return (
    <div
  className="min-h-screen text-[#ffddb0] pt-28"
  style={{
    backgroundImage: "url('/background.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>

      <Navbar pendingCount={pendingCount} />

      <div className="max-w-7xl mx-auto p-6 space-y-6 bg-black/60 rounded-3xl border border-white/10 shadow-2xl">

        <h1 className="text-3xl font-bold text-[#ff9b42] mb-2 text-center">

          ▁ ▂ ▄ ▅ ▆ ▇ █ Kezelőfelület █ ▇ ▆ ▅ ▄ ▂ ▁
        </h1>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
<button
  onClick={() => setActiveTab("reports")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "reports"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Jelentések
</button>
<button
  onClick={() => setActiveTab("users")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "users"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Meghívók
</button>
<button
  onClick={() => setActiveTab("manageUsers")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "manageUsers"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Felhasználók
</button>
<button
  onClick={() => setActiveTab("names")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "names"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Névkérelmek
</button>
<button
  onClick={() => setActiveTab("summary")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "summary"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Összegző
</button>
<button
  onClick={() => setActiveTab("archived")}
  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition
  ${activeTab === "archived"
    ? "bg-[#ff9b42] text-black border-[#ff9b42]"
    : "bg-black/40 border-orange-500/20 hover:bg-black/60"}`}
>
  Archivált
</button>
        </div>


{activeTab === "reports" && (() => {

  const userData = reportsByUser.find(u => u.name === selectedUser);

  return (
    <section className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)]">

      <h2 className="text-xl font-semibold text-[#ffb870] mb-6 text-center">
        Beérkezett jelentések
      </h2>

      {!selectedUser ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportsByUser.map((u) => (
            <div
              key={u.name}
              onClick={() => setSelectedUser(u.name)}
              className="cursor-pointer bg-[#1f2937]/80 border border-[#ff9b42]/20 rounded-xl p-4 hover:scale-[1.02] transition"
            >
              <p className="font-semibold text-lg text-white">{u.name}</p>

              <p className="text-sm text-gray-300 mt-1">
                Jelentések száma: {u.total.toFixed(1)}
                {u.quest > 0 && (
                  <span className="ml-2 text-violet-400">
                    • Quest: {u.quest}
                  </span>
                )}
              </p>

              <button className="mt-3 bg-blue-600 px-3 py-1 rounded text-sm">
                Megtekintés
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedUser(null)}
            className="mb-6 bg-gray-700 px-3 py-1 rounded"
          >
            ← Vissza
          </button>

          <h3 className="text-lg font-semibold text-white">
            {userData?.name}
          </h3>

          <p className="text-sm text-[#7dd3fc]">
            {userData?.rank || "Nincs rang"}
          </p>

          <p className="text-sm text-gray-400 mb-4">
            Jelentések száma: {userData?.total} • Quest: {userData?.quest}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {reports
              .filter(
                (r) =>
                  (r.displayName || r.user || "Ismeretlen") === selectedUser
              )
              .map((r) => (
                <div
                  key={r.id}
                  className="bg-[#111827]/80 border border-white/10 rounded-xl p-4"
                >
                  {(r.reportType || "").toLowerCase() === "quest" ? (
                    <span className="inline-block mb-2 px-2 py-1 text-xs rounded bg-violet-600/20 text-violet-400">
                      QUEST
                    </span>
                  ) : (
                    <span className="inline-block mb-2 px-2 py-1 text-xs rounded bg-orange-600/20 text-orange-400">
                      {(reportTypeLabels[r.reportType] || "Alap").toUpperCase()}
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteReport(r.id)}
                    className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white py-1.5 rounded-lg text-sm"
                  >
                    Törlés
                  </button>

                  {(r.images?.[0] || r.imageUrl) && (
                    <img
                      src={r.images?.[0] || r.imageUrl}
                      alt=""
                      onClick={() =>
                        setPreviewImage(r.images?.[0] || r.imageUrl)
                      }
                      className="w-full h-40 object-cover rounded-lg my-3 cursor-pointer hover:opacity-90"
                    />
                  )}

                  <p className="text-sm text-[#c9d1d9]">
                    {(r.vehicleName || r.vehicleType) && <>Jármű: {r.vehicleName || r.vehicleType}<br /></>}
                    {r.amount != null && <>Összeg: {Number(r.amount).toLocaleString("hu-HU")} $<br /></>}
                    {r.plate && <>🔢 {r.plate}<br /></>}
                    {r.description || "Nincs leírás"}
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    {r.createdAt?.toDate
                      ? r.createdAt.toDate().toLocaleString("hu-HU")
                      : "N/A"}
                  </p>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  );
})()}


        {activeTab === "users" && (
  <section className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(255,155,66,0.15)]">
    <h2 className="text-xl font-semibold text-[#ffb870] mb-4">Meghívók kezelése</h2>

    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={async () => {
          try {
            const token = uuidv4();
            await addDoc(collection(db, "inviteLinks"), {
              token,
              createdBy: currentUser?.uid || "ismeretlen",
              createdAt: serverTimestamp(),
              used: false,
            });
            const inviteUrl = `${window.location.origin}/register?invite=${token}`;
            await navigator.clipboard.writeText(inviteUrl);
            alert(`Új meghívó link másolva a vágólapra:\n${inviteUrl}`);
          } catch (err) {
            console.error(err);
            alert("Hiba a meghívó generálásakor: " + err.message);
          }
        }}
        className="bg-[#ff9b42] text-black px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
      >
        Új meghívó link generálása
      </button>

      
    </div>

    <InviteLinksTable />

</section>
)}


         





        {activeTab === "manageUsers" && (
          <section className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(255,155,66,0.15)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#ffb870]">Felhasználók kezelése</h2>
  
            </div>

            {allUsers.length === 0 ? (
              <div className="text-gray-400">Nincsenek felhasználói adatok.</div>
            ) : (
              <div className="space-y-3">
                {allUsers.map((u) => (
                  <div key={u.id} className="border-t border-gray-700 py-3 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{u.displayName || u.username || "Ismeretlen"}</div>
                      <div className="text-sm text-gray-400">{u.email} • {u.role || "user"}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Jóváhagyva: {u.approved ? "Igen" : "Nem"} • Felfüggesztve: {u.suspended ? "Igen" : "Nem"}
                      </div>
                      {u.rankAssignedAt && (
  <div className="text-xs text-blue-400 mt-1">
    Rang frissítve: {new Date(u.rankAssignedAt.seconds * 1000).toLocaleString("hu-HU")}
  </div>
)}
<div className="mt-2 flex gap-2 items-center">
  <select
    className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-sm"
    defaultValue={u.rank || ""}
    onChange={(e) => handleAssignRank(u.id, e.target.value)}
  >
    <option value="">Válassz rangot</option>
    {ranks.map((r) => (
      <option key={r} value={r}>
        {r}
      </option>
    ))}
  </select>

</div>

                    </div>
                    <div className="flex gap-2">
                      {!u.approved && (
                        <button onClick={() => handleApproveUser(u.id)} className="bg-green-600 px-3 py-1 rounded">Jóváhagy</button>
                      )}
                      <button onClick={() => handleToggleSuspendUser(u.id, !!u.suspended)} className={`px-3 py-1 rounded ${u.suspended ? "bg-indigo-600" : "bg-yellow-600"}`}>
                        {u.suspended ? "Visszaállít" : "Felfüggeszt"}
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="bg-red-600 px-3 py-1 rounded">Töröl</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "names" && (
          <section className="bg-gradient-to-b from-[#1a0f08] to-[#2b1a10] border border-[#8c5a2b]/40 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)] text-[#ffddb0]">

            <h2 className="text-xl font-semibold text-[#ffb870] mb-4">Névváltoztatási kérelmek</h2>

            {pendingNameRequests.length === 0 ? (
              <div className="text-gray-400">Nincs kérelem.</div>
            ) : (
              <div className="space-y-3">
                {pendingNameRequests.map((r) => (
                  <div key={r.id} className="border-t border-gray-700 py-3 flex justify-between items-start">
                    <div>
                      <div className="font-semibold">Régi: <span className="text-white">{r.oldName}</span> → Új: <span className="text-white">{r.newName}</span></div>
                      <div className="text-sm text-gray-400">Indok: {r.reason}</div>
                      <div className="text-xs text-gray-500 mt-1">Beküldve: {r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : "N/A"}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleApproveName(r)} className="bg-green-600 px-3 py-1 rounded">Elfogad</button>
                      <button onClick={() => handleRejectName(r)} className="bg-red-600 px-3 py-1 rounded">Elutasít</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

{activeTab === "summary" && (
  <section className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)]">

    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h2 className="text-xl font-semibold text-[#ffb870]">
        Meeting összegző
      </h2>

      <div className="flex flex-wrap gap-3">

        <button
          onClick={handleGenerateSummary}
          className="bg-[#ff9b42] hover:opacity-90 text-black font-semibold px-4 py-2 rounded-lg"
        >
          Új összegző
        </button>

        <button
          onClick={handleArchiveWeekly}
          className="bg-[#3a2416] hover:bg-[#4a2d1a] text-[#ffddb0] px-4 py-2 rounded-lg border border-orange-500/20"
        >
          Archiválás
        </button>

        <button
          onClick={handleCleanupArchived}
          className="bg-[#4a2d1a] hover:bg-[#5c3418] text-[#ffddb0] px-3 py-2 rounded-lg border border-orange-500/20"
        >
          Tisztítás
        </button>

      </div>
    </div>

    {computeMeetingRows.length === 0 ? (
      <div className="text-gray-400">Nincs adat.</div>
    ) : (
      <div className="overflow-auto rounded-xl border border-orange-500/20">
        <table className="w-full text-sm">
          <thead className="bg-[#111827]/80 text-[#ffddb0]">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Név</th>
              <th className="p-3 text-left">Alap</th>
              <th className="p-3 text-left">Dupla</th>
              <th className="p-3 text-left">Casco</th>
              <th className="p-3 text-left">Forgalmi</th>
              <th className="p-3 text-left">Quest</th>
              <th className="p-3 text-left">Össz. szerelés ($)</th>
            </tr>
          </thead>

          <tbody className="bg-[#1f2937]/60 divide-y divide-white/10">
            {computeMeetingRows.map((u, i) => (
              <tr key={u.name + i}>
                <td className="p-3">{i + 1}</td>

                <td className="p-3 font-semibold text-[#ffb870]">
                  {u.name}
                </td>

                <td className="p-3">
                  {u.alap}
                </td>

                <td className="p-3">
                  {u.dupla}
                </td>

                <td className="p-3">
                  {u.casco}
                </td>

                <td className="p-3">
                  {u.forgalmi}
                </td>

                <td className="p-3 text-violet-400">
                  {u.quest}
                </td>

                <td className="p-3 font-semibold text-[#ff9b42]">
                  {u.total?.toLocaleString("hu-HU")} $
                </td>
              </tr>
            ))}

<tr className="bg-[#111827]/80">
  <td colSpan={7} className="p-3 font-semibold text-gray-300">
    Összes jelentés
  </td>

<td className="p-3 font-semibold text-[#ffb870]">
  {(() => {
    const total = computeMeetingRows.reduce(
      (sum, u) => sum + u.normal + u.quest,
      0
    );
    return Number.isInteger(total) ? total : total.toFixed(1);
  })()} db
</td>

</tr>


            <tr className="bg-[#111827]/80">
<td colSpan={7} className="p-3 font-semibold text-gray-300">
  Végösszeg
</td>
<td className="p-3 font-semibold text-[#ff9b42]">

                {computeMeetingRows
                  .reduce((s, r) => s + (r.total || 0), 0)
                  .toLocaleString("hu-HU")} $
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    )}
  </section>
)}


        {activeTab === "archived" && (
          <section className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(255,155,66,0.15)]">
            <h2 className="text-xl font-semibold text-[#ffb870] mb-4">Archivált meetingek</h2>

            {archived.length === 0 ? (
              <div className="text-gray-400">Nincs archivált meeting.</div>
            ) : (
              <div className="space-y-4">
                {archived.map((meeting) => {
const meetingTotal = (meeting.reports || []).reduce((sum, r) => {
  const fine = Number(r.fineAmount || 0);
  const type = (r.reportType || "").toLowerCase();

  let total = 0;

  if (type === "quest") {
    total = 0;
  } else {
    total = Number(r.amount || 0);
  }

  if (fine > 0) total += fine;

  return sum + total;
}, 0);


const grouped = Object.values(
  (meeting.reports || []).reduce((acc, r) => {
    const name = r.displayName || r.user || "Ismeretlen";

if (!acc[name]) {
  acc[name] = {
    name,
    userId: r.userId,
    rank: r.userRank || null,
    reports: [],
    total: 0,
  };
}


    acc[name].reports.push(r);

    const fine = Number(r.fineAmount || 0);
    const type = (r.reportType || "").toLowerCase();

    let total = 0;

    if (type !== "quest") {
      total = Number(r.amount || 0);
    }

    if (fine > 0) total += fine;

    acc[name].total += total;

    return acc;
  }, {})
);



                  return (
                    <div key={meeting.id} className="border-t border-gray-700 py-4 rounded-lg bg-gray-950/50">
                      <div
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-800 p-3 rounded-lg"
                        onClick={() => setExpandedArchive(expandedArchive === meeting.id ? null : meeting.id)}
                      >
                        <div>
                          <div className="font-semibold text-white">
                            Archiválva:{" "}
                            {meeting.archivedAt?.toDate
                              ? meeting.archivedAt.toDate().toLocaleString("hu-HU", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : meeting.archivedAtRaw
                              ? new Date(meeting.archivedAtRaw).toLocaleString("hu-HU")
                              : "N/A"}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Összes jelentés: {meeting.reports?.length || 0}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Összes érték: {meetingTotal.toLocaleString("hu-HU")} $
                          </div>
                        </div>

                        <div className="text-blue-400 text-sm">
                          {expandedArchive === meeting.id ? "▲ Bezárás" : "▼ Megnyitás"}
                        </div>
                      </div>

                      {expandedArchive === meeting.id && (
                        <div className="mt-3 border-t border-gray-700 pt-3 space-y-3">
{grouped.map((user, idx) => {
  const userKey = `${meeting.id}__${user.name || idx}`;
  const isExpandedForThisMeeting = expandedUserReports[meeting.id] === userKey;
  return (
    <div key={userKey} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold text-white">{user.name}</p>
{user.rank && (
  <p className="text-xs text-[#7dd3fc]">
    {user.rank}
  </p>
)}


<p className="text-gray-400 text-sm">
  Jelentések: {user.reports?.length || 0} db • Összesen: {Number(user.total || 0).toLocaleString("hu-HU")} $
</p>

        </div>


                                  <button
                                    onClick={() => toggleExpandedUserReports(meeting.id, userKey)}
                                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                                  >
                                    {isExpandedForThisMeeting ? "Elrejt" : "Jelentései megtekintése"}
                                  </button>
                                </div>

{isExpandedForThisMeeting && (
  <div className="mt-3 space-y-3">
    {user.reports.map((r, ri) => (
      <div
        key={`${userKey}_rep_${ri}_${r.id || ri}`}
        className="bg-gray-900 border border-gray-700 p-3 rounded-lg flex gap-3 items-start"
      >

        {r.imageUrl ? (
          <a href={r.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={r.imageUrl}
              alt="report"
              className="w-24 h-24 object-cover rounded-lg border border-gray-700 hover:scale-105 transition-transform duration-200 cursor-pointer"
            />
          </a>
        ) : (
          <div className="w-24 h-24 flex items-center justify-center bg-gray-800 text-gray-500 text-sm rounded-lg border border-gray-700">
            Nincs kép
          </div>
        )}

        <div className="flex flex-col">
          {r.reportType === "quest" ? (
            <p className="text-[#c9d1d9] font-semibold">
              Típus: Quest
            </p>
          ) : (
            <>
              <p className="text-[#c9d1d9] font-semibold">
                Típus: {reportTypeLabels[r.reportType] || "Alap"}
              </p>

              <p className="text-[#c9d1d9] text-sm">
                Összeg: {Number(r.amount || 0).toLocaleString("hu-HU")} $
              </p>
            </>
          )}

          {(r.vehicleName || r.vehicleType) && (
            <p className="text-[#c9d1d9] text-sm">Jármű: {r.vehicleName || r.vehicleType}</p>
          )}

          <p className="text-xs text-gray-500 mt-1">
            {r.createdAt?.toDate
              ? r.createdAt.toDate().toLocaleString("hu-HU", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : r.createdAt?.seconds
              ? new Date(r.createdAt.seconds * 1000).toLocaleString("hu-HU")
              : "N/A"}{" "}
            — {r.displayName || r.user || "Ismeretlen"}
          </p>
        </div>
      </div>
    ))}
  </div>
)}

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}






function InviteLinksTable() {
  const [invites, setInvites] = React.useState([]);
  const [userMap, setUserMap] = React.useState({});
  const [loadingInvites, setLoadingInvites] = React.useState(true);

  React.useEffect(() => {
    let unsub = null;
    try {
      const q = collection(db, "inviteLinks");
      unsub = onSnapshot(q, async (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setInvites(data);
        setLoadingInvites(false);

        const uids = data.filter(d => d.used && d.usedBy).map(d => d.usedBy);
        if (uids.length > 0) {
          const usersSnap = await getDocs(collection(db, "users"));
          const map = {};
          usersSnap.forEach(u => {
            if (uids.includes(u.id)) {
              map[u.id] = u.data().displayName || u.data().username || u.data().email || u.id;
            }
          });
          setUserMap(map);
        }
      });
    } catch (err) {
      console.error("InviteLinksTable listener error:", err);
      setLoadingInvites(false);
    }
    return () => {
      try { if (unsub) unsub(); } catch (e) {}
    };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Biztosan törlöd ezt a meghívót?")) return;
    try {
      await deleteDoc(doc(db, "inviteLinks", id));
      alert("Meghívó törölve.");
    } catch (err) {
      console.error(err);
      alert("Hiba a törlés során: " + err.message);
    }
  };

  if (loadingInvites) return <p>Meghívók betöltése...</p>;
  if (!invites || invites.length === 0) return <p className="text-gray-400">Nincs meghívó generálva.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-gray-700">
        <thead className="bg-gray-800 text-gray-100">
          <tr>
            <th className="p-2 text-left">Token</th>
            <th className="p-2 text-left">Létrehozva</th>
            <th className="p-2 text-left">Felhasználva</th>
            <th className="p-2 text-left">Művelet</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => (
            <tr key={inv.id} className="border-t border-gray-700">
              <td className="p-2 font-mono">{inv.token?.slice(0, 12) ?? inv.token}</td>
              <td className="p-2">{inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleString("hu-HU") : "–"}</td>
              <td className="p-2">
                {inv.used ? (
                  <>
                    ✅ {userMap[inv.usedBy] || inv.usedBy || "Ismeretlen"}
                  </>
                ) : (
                  "❌ Még nem használt"
                )}
              </td>
              <td className="p-2 space-x-2">
                {!inv.used && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/register?invite=${inv.token}`;
                      navigator.clipboard.writeText(url);
                      alert("Link vágólapra másolva:\n" + url);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    Másolás
                  </button>
                )}
                <button
                  onClick={() => handleDelete(inv.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                >
                  Törlés
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const ranks = [
  "Tanuló Szerelő",
  "Újonc Szerelő",
  "Szerelő",
  "Veterán Szerelő",
  "Újonc Vontatós",
  "Vontatós",
  "Veterán Vontatós",
  "Betanító",
  "Telephely Vezető",
  "Telephely Tulajdonos",
  "Webfejlesztő"
];


    <div
      className="min-h-screen text-[#ffddb0] flex flex-col items-center py-12 px-4 relative"
      style={{
        backgroundImage: "url('/background.webp')", 
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      >     </div>


async function handleAssignRank(uid, rank) {
  try {
    const auth = getAuth();
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { rank, rankAssignedAt: serverTimestamp() });

    await addDoc(collection(db, "notifications"), {
      target: uid,
      title: "Új rang beállítva",
      body: `${(auth.currentUser?.displayName || "Admin")} beállította a rangodat: ${rank}`,
      createdAt: serverTimestamp(),
      readBy: [],
    });

    alert(`✅ Rang beállítva és értesítés elküldve: ${rank}`);
  } catch (err) {
    console.error("❌ Hiba a rang frissítésénél:", err);
    alert("Hiba a rang frissítésénél: " + err.message);
  }
}


