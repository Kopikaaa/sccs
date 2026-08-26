import { Link } from "react-router-dom";

export default function Suspended() {
  return (
    <div
      className="min-h-screen flex items-center justify-center text-center px-6"
      style={{
        backgroundImage: "url('/background.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/70"></div>

      <div className="relative max-w-lg w-full bg-[#1a1a1a]/90 border border-orange-500/20 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-[#ff6b6b] mb-4">
          Fiók felfüggesztve
        </h1>

        <p className="text-gray-300 mb-6">
          A hozzáférésed ideiglenesen korlátozva lett.  
          Ha úgy gondolod, hogy ez tévedés, kérlek vedd fel a kapcsolatot a a Leaderekkel.
        </p>

        <div className="text-sm text-gray-400 mb-6">
          Amíg a felfüggesztés aktív, nem tudod használni az oldalt.
        </div>

        <Link
          to="/login"
        >
          Kijelentkezés
        </Link>
      </div>
    </div>
  );
}
