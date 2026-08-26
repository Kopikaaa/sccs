import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import { auth, db } from "./firebase";
import ImageUpload from "./components/ImageUpload";
import QuestInfo from "./components/QuestInfo";
import CustomSelect from "./components/CustomSelect";
import VehicleSelector from "./components/VehicleSelector";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

const reportTypeLabels = {
  normal: "Normál",
  alap: "Alap",
  dupla: "Dupla",
  casco: "Casco",
  forgalmi: "Forgalmi",
};

export default function Dashboard() {
  const [reportType, setReportType] = useState("alap");
  const [amount, setAmount] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);
  const [role, setRole] = useState("user");
  const [profile, setProfile] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const mountedRef = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
const imageUploadRef = useRef(null);


  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setRole(data.role || "user");
        } else {
          setProfile({ username: auth.currentUser.displayName || "" });
        }
      } catch (err) {
        console.error("Profil betöltési hiba:", err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {

    const unsub = onSnapshot(collection(db, "users"), (s) => {
      const map = {};
      s.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          name: data.displayName || data.username || data.email || "",
          rank: data.rank || null,
        };
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

 useEffect(() => {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));

  const unsub = onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setReports(list);
  });

  return () => unsub();
}, []);

useEffect(() => {
  if (!reports.length) {
    setTopUsers([]);
    return;
  }

  const countMap = {};

  reports.forEach((r) => {
    const userData = usersMap[r.userId];

    const name =
      userData?.name ||
      r.displayName ||
      r.username ||
      r.user ||
      "Ismeretlen";

    const value = 1;

    countMap[name] = (countMap[name] || 0) + value;
  });

  const sorted = Object.entries(countMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  setTopUsers(sorted);
}, [reports, usersMap]);



const handleSubmit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  setIsSubmitting(true);
  setError("");
  setSuccess("");
  setUploadProgress(5);

if (reportType === "quest") {
  if (!vehicleName || !imageFile) {
    setError("❌ Quest jelentéshez járműnév és kép szükséges!");
    setIsSubmitting(false);
    return;
  }
} else {
  if (!amount || !vehicleName || !imageFile) {
    setError("❌ Add meg a jármű nevét, az összeget és tölts fel képet!");
    setIsSubmitting(false);
    return;
  }
}



  try {
    const toBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
      });

    setUploadProgress(25);
    const base64Image = await toBase64(imageFile);

    const formData = new FormData();
    formData.append("image", base64Image);

    setUploadProgress(45);
    const uploadRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      throw new Error("A kép feltöltése nem sikerült.");
    }

    setUploadProgress(75);
    const imageUrl = uploadData.data.url;

await addDoc(collection(db, "reports"), {
  reportType,
  vehicleName,
  amount: reportType === "quest" ? null : Number(amount),
  imageUrl,
  imageName: imageFile.name,
  userId: auth.currentUser?.uid,
  displayName:
    profile?.displayName ||
    profile?.username ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email,
  userRank: profile?.rank || null,
  createdAt: serverTimestamp(),
});



    setUploadProgress(100);
    setSuccess("✅ Jelentés sikeresen beküldve!");


    setReportType("alap");
    setVehicleName("");
    setImageFile(null);

    imageUploadRef.current?.reset();

    setTimeout(() => {
      setUploadProgress(0);
      setIsSubmitting(false);
      setSuccess("");
    }, 1500);
  } catch (err) {
    console.error(err);
    setError("Hiba történt: " + err.message);
    setIsSubmitting(false);
    setUploadProgress(0);
  }
};




  const handleDelete = async (id) => {
    if (role !== "admin") {
      alert("Nincs jogosultságod!");
      return;
    }
    if (window.confirm("Biztosan törlöd?")) {
      await deleteDoc(doc(db, "reports", id));
    }
  };

  return (
<div

  className="min-h-screen text-white pt-28 bg-cover bg-center"
  style={{
    backgroundImage: "url('/background.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>


      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pb-12">
<section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <aside className="bg-[#1a1a1a]/90 border border-orange-500/20
 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)]">
              <h3 className="text-lg font-semibold text-[#ffb870] mb-3">
                Fejlesztők
              </h3>
              <ul className="text-sm opacity-90">
                <li>
                  <span className="font-semibold text-[#f8e4c3]">Kopikaaa</span>
                  <br />
                  <span className="text-xs opacity-70">
                    Discord: _kopikaaa_
                  </span>
                </li>
              </ul>
              <p className="text-xs opacity-60 mt-3">
                Ha hibát találsz, írj Discordon privátban vagy a hibajelentő
                csatornában.
              </p>
            </aside>

            <aside className="bg-[#1a1a1a]/90 border border-orange-500/20
 rounded-2xl p-6 shadow-[0_0_20px_rgba(139,84,34,0.2)]">
              <h3 className="text-lg font-semibold text-[#ffb870] mb-3">
                🏆 Top jelentések
              </h3>
              <ul className="text-sm opacity-90">
                {topUsers.length === 0 ? (
                  <li className="opacity-60">Még nincs adat</li>
                ) : (
                  topUsers.map((u, i) => (
                    <li key={i}>
                      {i + 1}. {u.name} –{" "}
                      <span className="text-orange-400">{u.count}</span> jelentés
                    </li>
                  ))
                )}
              </ul>
            </aside>
          </div>

<section
className="lg:col-span-2 relative rounded-2xl p-6 border border-orange-500/20 bg-[#1a1a1a]/90 shadow-xl"

>








            <h1 className="text-2xl font-bold text-orange-300 mb-4">
              Jelentés beküldése
            </h1>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block mb-1 text-[#ffb870]">
                  Jelentés típusa:
                </label>
<CustomSelect
  value={reportType}
  onChange={setReportType}
  placeholder="Válassz típust"
  options={[
    { value: "alap", label: "Alap" },
    { value: "dupla", label: "Dupla" },
    { value: "casco", label: "Casco" },
    { value: "forgalmi", label: "Forgalmi" },
    { value: "quest", label: "Quest" },
  ]}
/>

              </div>




  <div className="md:col-span-2">
    <label className="block mb-1 text-[#ffb870]">Jármű neve</label>
    <VehicleSelector value={vehicleName} onChange={setVehicleName} />
  </div>

{reportType !== "quest" && (
  <div className="md:col-span-2">
    <label className="block mb-1 text-[#ffb870]">Összeg ($)</label>
    <input
      type="number"
      placeholder="Pl. 15000"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      className="w-full p-3 border border-[#a86732]/40 rounded-lg bg-black/40 border border-orange-500/20 text-[#f8e4c3] outline-none"
    />
  </div>
)}





              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">

<div className="md:col-span-2">
  <ImageUpload
    key={success || error ? Date.now() : "imageUpload"}
    onFileSelect={(file) => setImageFile(file)}
  />
</div>

</div>

<button
  type="submit"
  disabled={isSubmitting}
  className={`col-span-2 py-2 rounded-lg font-semibold transition-none
  ${
    isSubmitting
      ? "bg-gray-600 cursor-not-allowed opacity-70"
      : "bg-[#72b584] text-white shadow-none"
  }`}
  style={{ isolation: "isolate" }}
>
  {isSubmitting ? "Feltöltés folyamatban..." : "Jelentés beküldése"}
</button>



            </form>

            {uploadProgress > 0 && (
              <div className="w-full bg-[#2b1a10] h-2 rounded-full mt-3">
                <div
                  className="h-2 bg-[#ff9b42]"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            {success && <p className="mt-4 text-green-400">{success}</p>}
            {error && <p className="mt-4 text-red-400">{error}</p>}
            

{reportType === "quest" && (
  <div className="hidden lg:block absolute top-0 left-full ml-6 w-[320px]">
    <QuestInfo />
  </div>
)}



</section>

        </section>





<section className="mt-8">
  <h2 className="text-xl font-semibold text-[#ffb870] mb-4">
    Legutóbbi jelentések
  </h2>

  {reports.length === 0 ? (
    <div className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-xl p-6 opacity-80">
      Még nincs jelentés.
    </div>
  ) : (
    <div className="grid gap-4">
      {reports.map((r) => {
        const userData = usersMap[r.userId];
        const userName =
          userData?.name || r.displayName || r.user || "Ismeretlen";

        const rank =
          r.userRank || userData?.rank
            ? ` (${r.userRank || userData?.rank})`
            : "";

        return (
          <div
            key={r.id}
            className="bg-[#1a1a1a]/90 border border-orange-500/20 rounded-xl p-4 flex gap-4 shadow-[0_0_15px_rgba(139,84,34,0.15)] hover:shadow-[0_0_25px_rgba(255,155,66,0.2)] transition"
          >
            <div
              className="w-20 h-20 bg-black/40 border border-orange-500/20 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90"
              onClick={() => setSelectedImage(r.imageUrl)}
            >
              {r.imageUrl ? (
                <img
                  src={r.imageUrl}
                  alt="report"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs opacity-60">Nincs kép</div>
              )}
            </div>

<div className="flex-1 text-sm opacity-90">
  {(r.vehicleName || r.vehicleType) && (
    <div className="text-[#c9d1d9] font-semibold mb-1">
      Jármű: {r.vehicleName || r.vehicleType}
    </div>
  )}
  {r.reportType === "quest" ? (
    <div className="font-semibold text-[#c9d1d9] mb-1">
      Típus: Quest
    </div>
  ) : (
    <>
      <div className="font-semibold text-[#c9d1d9] mb-1">
        Típus: {reportTypeLabels[r.reportType] || "Alap"}
      </div>
      <div className="text-[#c9d1d9] font-semibold">
        Összeg: {r.amount?.toLocaleString("hu-HU")} $
      </div>
    </>
  )}

  <div className="text-xs opacity-50 mt-2">
    {r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleString("hu-HU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Folyamatban..."}{" "}
    – {userName}
    {rank}
  </div>

  {role === "admin" && (
    <button
      onClick={() => handleDelete(r.id)}
      className="mt-2 bg-[#ff6347] hover:bg-[#ff8566] text-[#1a0f08] text-xs px-3 py-1 rounded shadow-[0_0_10px_rgba(255,99,71,0.5)]"
    >
      🗑️ Törlés
    </button>
  )}
</div>

          </div>
        );
      })}
    </div>
  )}
</section>

      </main>




      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="preview"
            className="max-w-3xl max-h-[90vh] rounded-lg shadow-[0_0_40px_rgba(255,155,66,0.5)]"
          />
        </div>
      )}
    </div>
  );
}
