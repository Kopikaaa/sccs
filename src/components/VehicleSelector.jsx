import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";

const PRESET_VEHICLES = [
  "Alfa Romeo 159 Ti", "Alfa Romeo Giulia Quadrifoglio", "Aston Martin DBS Superleggera",
  "Audi Q7", "Audi R8 V10", "Audi RS3 2020", "Audi RS4", "Hotknife", "Audi RS6",
  "Audi RS6 C5", "Audi RS7 2020", "Audi RS7 Quattro", "Audi RSQ8 Mansory", "Audi Sport Quattro",
  "BMW 750 Li", "BMW 750i e38", "BMW M3 G81", "BMW M3 e46", "BMW M4", "BMW M5 F10",
  "BMW M5 F11", "BMW M5 F90", "BMW M5 G90", "BMW M5 e34", "BMW M5 e60", "BMW M6",
  "BMW M635 CSi e24", "BMW M8", "BMW S1000RR", "BMW X5 M Competition", "BMW X6", "Barkas B1000",
  "Bentley Bentayga", "Bugatti Chironl", "Bugatti Veyron SS", "Chevrolet Bel Air Sport Coupe",
  "Chevrolet Camaro Z28 '70", "Chevrolet Camaro ZL1 2018", "Chevrolet Caprice '87",
  "Chevrolet Chevelle '71", "Chevrolet Corvette C8", "Chevrolet Impala 64", "Dodge Challenger SRT",
  "Ducati Desmosedici RR", "Ferrari 458 Italia", "Ferrari F12 Berlinetta", "Ferrari F40",
  "Ferrari F8 Tributo 2020", "LaFerrari", "Ford 150 Ecoline", "Ford F-150 Ecoline", "Ford Focus RS 2017",
  "Ford GT 2017", "Ford Mustang Dark Horse", "Ford Mustang GT 2015", "Ford Raptor 2018",
  "Harley Davidson", "Harley Davidson Fat Boy", "Honda Civic", "Honda Click", "Honda NSX",
  "Hyundai Encino EV", "Jeep Grand Cherokee", "Jeep Wrangler", "Kawasaki KLS 250", "Koenigsegg Jesko",
  "Koenigsegg One:1", "Lada 2107", "LakóJármű", "Lakókocsi", "Lamborghini Huracan",
  "Lamborghini Revuelto 2023", "Lamborghini Urus", "Lincoln TC Limo", "Maserati MC20", "BYD Yangwang U9",
  "Mazda RX7", "McLaren 720s", "McLaren P1", "McLaren Senna 2019", "Mercedes Benz 190E",
  "Mercedes Benz C63s AMG", "Mercedes Benz E63 AMG", "Mercedes Benz GTS AMG", "Mercedes Benz Sprinter",
  "Mercedes C-Class W206", "Mercedes-AMG Project One", "Mercedes-Benz G65 AMG", "Mercedes-Benz GT63s",
  "Mercedes-Benz Maybach GLS 600", "Mercedes-Benz S-Class W223", "Mercedes-Benz SLS AMG", "Mitsubishi Galant",
  "Mitsubishi Lancer EVO 8", "Mitsubishi EVO X", "Nissan 200SX", "Nissan GT-R R35", "Nissan Silvia S15",
  "Nissan Skyline R34 GT-R", "Plymouth Hemi 'Cuda '70", "Pontiac Firebird '69", "Porsche 911 Carrera 2022",
  "Porsche 911 GT3 RS", "Porsche 911LM Evo Mansory", "Porsche 918 Spyder", "Porsche Boxter Spyder",
  "Porsche Panamera Turbo S", "Porsche Taycan", "Seat Leon", "Skoda Octavia RS", "Skoda Superb",
  "Subaru Impreza", "Tesla Model S P90D", "Tesla Model X P100D", "Tesla Roadster", "Toyota Supra",
  "Toyota Supra A90", "Trabant 601", "Utánfutó", "Volkswagen Golf I", "Volkswagen Golf II",
  "Volkswagen Golf IV R32", "Volkswagen Golf V", "Volkswagen Golf VII R", "Volkswagen Passat B6",
  "Volkswagen Scirocco R", "Volkswagen Touareg", "Bobcat", "GMC Sierra", "Kenworth W900",
  "Peterbilt 386", "Renault Midlum 220 DCI", "Tractor", "Volvo FH 750", "Walton"
];

export default function VehicleSelector({ value: propValue, onChange }) {
  const [vehicles, setVehicles] = useState([]);
  const [input, setInput] = useState(propValue || "");
  const [filtered, setFiltered] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(true);
  const collRef = collection(db, "vehicles");


  useEffect(() => {
  setInput(propValue || "");
}, [propValue]);


  useEffect(() => {
    const loadVehicles = async () => {
      const q = query(collRef, orderBy("name", "asc"));
      const snap = await getDocs(q);

      const existingNames = new Set(
        snap.docs.map((vehicleDoc) => vehicleDoc.data().name.toLowerCase())
      );
      const missingVehicles = PRESET_VEHICLES.filter(
        (name) => !existingNames.has(name.toLowerCase())
      );

      if (missingVehicles.length > 0) {
        const batch = writeBatch(db);
        missingVehicles.forEach((name) => {
          const d = doc(collRef);
          batch.set(d, { name });
        });
        await batch.commit();
      }

      const newSnap = await getDocs(q);
      setVehicles(newSnap.docs.map((d) => d.data().name));
      setLoading(false);
    };
    loadVehicles();
  }, []);

  useEffect(() => {
    const term = input.toLowerCase().trim();
    if (!term) {
      setFiltered([]);
      return;
    }
    setFiltered(vehicles.filter((v) => v.toLowerCase().includes(term)));
  }, [input, vehicles]);

  const handleSelect = (name) => {
    setInput(name);
    onChange?.(name);
    setShowList(false);
  };

  const handleAddNew = async () => {
    const name = input.trim();
    if (!name) return;
    const exists = vehicles.some(
      (v) => v.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      handleSelect(name);
      return;
    }
    await addDoc(collRef, { name });
    setVehicles([...vehicles, name].sort());
    handleSelect(name);
  };

  const handleInputChange = (val) => {
    setInput(val);
    onChange?.(val);
    setShowList(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNew();
    }
  };

  return (
    <div className="relative w-full md:col-span-2">
      <label className="block mb-1 text-[#ffb84d] ">
        
      </label>

      {loading ? (
        <div className="p-3 bg-[#1a1a1a] border border-[#ffae42] rounded-lg text-[#ffddb0]">
          Betöltés...
        </div>
      ) : (
        <>
<input
  type="text"
  value={input}
  onChange={(e) => handleInputChange(e.target.value)}
  onFocus={() => setShowList(true)}
  onKeyDown={handleKeyDown}
  placeholder="Írd be a jármű típusát..."
  className="
    w-full p-3 rounded-lg
    bg-black/40
    border border-orange-500/20
    text-[#f8e4c3]
    placeholder:text-gray-400
    focus:outline-none
    focus:ring-2 focus:ring-orange-500/30
    transition
  "
/>


          {showList && filtered.length > 0 && (
<ul className="
  absolute w-full mt-1 max-h-60 overflow-y-auto z-50
  bg-[#1a1a1a]/95
  border border-orange-500/20
  rounded-lg
  shadow-xl
">
              {filtered.map((name, i) => (
<li
  key={i}
  onMouseDown={() => handleSelect(name)}
  className="
    px-3 py-2 cursor-pointer
    text-[#f8e4c3]
    hover:bg-orange-500/20
    transition
  "
>
  {name}
</li>

              ))}
            </ul>
          )}

          {showList && filtered.length === 0 && input.trim() !== "" && (
<div
  onMouseDown={handleAddNew}
  className="
    absolute w-full mt-1 p-3 text-center cursor-pointer z-50
    bg-[#1a1a1a]/95
    border border-orange-500/20
    rounded-lg
    text-[#f8e4c3]
    hover:bg-orange-500/20
    transition
  "
>
  ➕ „{input}” hozzáadása új járműként
</div>

          )}
        </>
      )}
    </div>
  );
}
