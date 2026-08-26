import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3 rounded-lg bg-black/40 border border-orange-500/20 text-left text-[#f8e4c3] hover:border-orange-400/40 transition"
      >
        {selected?.label || placeholder}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-lg bg-[#1a1a1a] border border-orange-500/20 shadow-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left transition
                ${
                  value === opt.value
                    ? "bg-orange-500/20 text-orange-300"
                    : "text-[#f8e4c3] hover:bg-orange-500/10"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
