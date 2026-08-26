import { useState, useImperativeHandle, forwardRef, useRef } from "react";

const ImageUpload = forwardRef(({ onFileSelect }, ref) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset() {
      setFile(null);
      setSuccess(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    },
  }));

  const convertToWebP = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => (img.src = e.target.result);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject();
            resolve(
              new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, "") + ".webp",
                { type: "image/webp" }
              )
            );
          },
          "image/webp",
          0.9
        );
      };

      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      setUploading(true);
      setSuccess(false);
      setFile(null);

      const webpFile = await convertToWebP(selectedFile);
      setFile(webpFile);

      setSuccess(true);
      onFileSelect?.(webpFile);
    } catch (err) {
      console.error(err);
      setFile(null);
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full">
      <label
        className={`w-full h-[48px] overflow-hidden rounded-md flex items-center justify-center transition-all duration-300 cursor-pointer text-center
        ${
          isDragging
            ? "border border-[#ffae42] bg-[#1a1a1a]"
            : "border border-dashed border-[#ffae42]/30 bg-[#0d0d0d]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile)
            handleFileChange({ target: { files: [droppedFile] } });
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {!file && !uploading && (
          <div className="text-sm text-[#ffddb0]/70">
            Kattints ide vagy húzz ide egy képet
          </div>
        )}

        {uploading && (
          <div className="text-sm text-[#ffddb0]/70">Kép feldolgozása...</div>
        )}

        {file && success && (
          <span className="px-2 truncate whitespace-nowrap text-[clamp(10px,2.5vw,14px)] text-green-400">
            {file.name} — kiválasztva ✔
          </span>
        )}
      </label>
    </div>
  );
});

export default ImageUpload;
