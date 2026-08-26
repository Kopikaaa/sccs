import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import Navbar from "./Navbar";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let unsubscribeReports = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setReports([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "reports"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribeReports();
      unsubscribeReports = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(list);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReports();
    };
  }, []);

  const getValue = (r) => (r.reportType === "quest" ? 1 : 1);

  const reportTypeCounts = ["alap", "dupla", "casco", "forgalmi"].reduce(
    (counts, type) => {
      counts[type] = reports.filter(
        (report) => (report.reportType === "normal" ? "alap" : report.reportType) === type
      ).length;
      return counts;
    },
    {}
  );
  const quest = reports.filter((r) => r.reportType === "quest").length;
  const total = reports.reduce((sum, r) => sum + getValue(r), 0);

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(
    startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );

  const weeklyPoints = reports.reduce((sum, r) => {
    if (!r.createdAt?.toDate) return sum;
    const date = r.createdAt.toDate();
    if (date >= startOfWeek) return sum + getValue(r);
    return sum;
  }, 0);

  const required = 15;
  const activeThreshold = 20;
  const progress = Math.min((weeklyPoints / required) * 100, 100);

  return (
    <>
      <Navbar />

      <div
        className="min-h-screen pt-28 px-6 text-white bg-cover bg-center"
        style={{
          backgroundImage: "url('/background.webp')",
        }}
      >
        <div className="fixed inset-0 bg-black/60 -z-10" />

        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-semibold mb-6">Jelentéseim</h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <Badge
              label="Összes"
              value={Number.isInteger(total) ? total : total.toFixed(1)}
              color="text-white"
            />
            <Badge label="Alap" value={reportTypeCounts.alap} color="text-emerald-400" />
            <Badge label="Dupla" value={reportTypeCounts.dupla} color="text-orange-300" />
            <Badge label="Casco" value={reportTypeCounts.casco} color="text-sky-300" />
            <Badge label="Forgalmi" value={reportTypeCounts.forgalmi} color="text-yellow-300" />
            <Badge label="Quest" value={quest} color="text-violet-400" />
          </div>

          <div className="bg-[#111827]/80 border border-white/10 rounded-xl p-5 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Heti előrehaladás</span>
              <span className="opacity-70">
                {Number.isInteger(weeklyPoints)
                  ? weeklyPoints
                  : weeklyPoints.toFixed(1)}{" "}
                / {required}
              </span>
            </div>

            <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
              <div
                className={`h-3 transition-all ${
                  weeklyPoints >= activeThreshold
                    ? "bg-emerald-500"
                    : "bg-orange-400"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-xs opacity-70 mt-2">
              {weeklyPoints >= activeThreshold
                ? "✅ Aktív hét teljesítve (20+ jelentés)"
                : "Minimum heti 15 jelentés szükséges"}
            </div>
          </div>

          {loading ? (
            <Box>Betöltés...</Box>
          ) : reports.length === 0 ? (
            <Box>Még nincs jelentésed.</Box>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => {
                const dateText = r.createdAt?.toDate
                  ? r.createdAt.toDate().toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Folyamatban...";

                return (
                  <div
                    key={r.id}
                    className="bg-[#111827]/80 border border-white/10 rounded-xl p-4 flex gap-4"
                  >
                    {r.imageUrl && (
                      <img
                        src={r.imageUrl}
                        alt=""
                        onClick={() => setSelectedImage(r.imageUrl)}
                        className="w-24 h-16 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      />
                    )}

                    <div className="text-sm text-gray-200 flex flex-col justify-center">
                      {(r.vehicleName || r.vehicleType) && (
                        <p className="text-[#c9d1d9] font-semibold">
                          Jármű: {r.vehicleName || r.vehicleType}
                        </p>
                      )}
                      {r.reportType === "quest" ? (
                        <p className="text-[#c9d1d9] font-semibold">
                          Típus: Quest
                        </p>
                      ) : (
                        <>
                          <p className="text-[#c9d1d9] font-semibold">
                            Típus: {reportTypeLabels[r.reportType] || "Alap"}
                          </p>
      <div className="text-[#c9d1d9] font-semibold">
        Összeg: {r.amount?.toLocaleString("hu-HU")} $
      </div>
                        </>
                      )}

                      <p className="opacity-60 text-xs mt-1">{dateText}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="preview"
              className="max-w-[90%] max-h-[80%] rounded-lg border border-orange-500/20 shadow-xl"
            />
          </div>
        )}
      </div>
    </>
  );
}

const reportTypeLabels = {
  normal: "Normál",
  alap: "Alap",
  dupla: "Dupla",
  casco: "Casco",
  forgalmi: "Forgalmi",
};

function Badge({ label, value, color }) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1f2937]/80 border border-white/10 text-sm">
      <span className="text-gray-300">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function Box({ children }) {
  return (
    <div className="bg-[#1f2937]/70 border border-white/10 rounded-xl p-6 text-gray-300">
      {children}
    </div>
  );
}
