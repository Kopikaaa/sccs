import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function QuestInfo() {
  const [questCount, setQuestCount] = useState(0);

  const GOAL = 25;

  const progress = Math.min((questCount / GOAL) * 100, 100);
  const isCompleted = questCount >= GOAL;
  const nearGoal = questCount >= GOAL * 0.75 && !isCompleted;

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "reports"),
      where("userId", "==", auth.currentUser.uid),
      where("reportType", "==", "quest")
    );

    const unsub = onSnapshot(q, (snap) => {
      let total = 0;

      snap.forEach(() => {
        total += 1;
      });

      setQuestCount(total);
    });

    return () => unsub();
  }, []);

  return (
    <aside
      className={`relative rounded-2xl p-5 overflow-hidden
      border border-purple-400/40
      bg-gradient-to-br from-[#2a1d3f]/80 to-[#1b132b]/80
      shadow-[0_0_35px_rgba(168,85,247,0.25)]
      text-purple-100
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🎯 Quest információ
        </h3>

        <span className="text-xs px-2 py-1 rounded-full bg-purple-400/20 border border-purple-300/40 text-purple-200">
          1x
        </span>
      </div>

      <p className="text-sm text-purple-200/80 mb-4">
        A Quest jelentés <b>1 pontot</b> ér.
        Ez farmolható és nem játékoshoz kötött.
      </p>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1 opacity-70">
          <span>Haladás</span>
          <span>
            {questCount} / {GOAL}
          </span>
        </div>

        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className={`h-2 transition-all duration-500 ${
              isCompleted
                ? "bg-green-400"
                : nearGoal
                ? "bg-yellow-400"
                : "bg-purple-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>


      <div className="bg-purple-900/40 border border-green-400/30 rounded-xl p-3 mb-3">
        <div className="font-semibold mb-1">✅ Aktív hét</div>
        <p className="text-sm opacity-80">
          <b>25 db Quest jelentés</b> Ha csak Quest jelentés adsz le, akkor 25db számít aktív hétnek .
        </p>
      </div>

      <div className="bg-purple-900/40 border border-purple-300/30 rounded-xl p-3">
        <div className="font-semibold mb-1">💰 Bónusz</div>
        <p className="text-sm opacity-80">
          Ha jól megy a meló és a számla gyarapszik,
          emelünk az órabéren az aktivitás alapján.
        </p>
      </div>

      {isCompleted && (
        <div className="mt-4 text-center text-green-300 text-sm font-semibold">
          ✔ Heti cél teljesítve
        </div>
      )}
    </aside>
  );
}
