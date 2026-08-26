import Navbar from "./Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Üdvözöl a Parkolás Felügyelet rendszer!
        </h1>
        <p className="text-gray-700">Innen eléred a profilodat, vagy kijelentkezhetsz.</p>
      </div>
    </div>
  );
}
