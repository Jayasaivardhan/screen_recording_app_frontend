import React, { useState, useRef, useEffect } from "react";

function App() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [time, setTime] = useState(0);
  const timerRef = useRef(null);

  // 🌐 Backend API
  const API_BASE = "https://screen-recording-app-backened-2.onrender.com";

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // ✅ Load recordings
  const loadRecordings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recordings`);
      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      console.error("Error fetching recordings:", err);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const startRecording = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const combinedStream = new MediaStream([
        ...screenStream.getTracks(),
        ...audioStream.getTracks(),
      ]);

      const recorder = new MediaRecorder(combinedStream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: "video/webm",
        });

        // ✅ Upload to backend
        const formData = new FormData();
        formData.append("video", file);

        try {
          const res = await fetch(`${API_BASE}/api/recordings`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            await loadRecordings(); // refresh list
          } else {
            const data = await res.json();
            console.error("Upload failed:", data.error);
          }
        } catch (err) {
          console.error("Error uploading:", err);
        }

        setTime(0);
        combinedStream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev + 1 >= 180) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      clearInterval(timerRef.current);
      setRecording(false);
      mediaRecorder.stop();
    }
  };

  const deleteRecording = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/recordings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecordings((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error deleting recording:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6">
      <h1 className="text-4xl font-extrabold mb-8 text-purple-700 text-center drop-shadow-lg">
        🎥 Screen Recorder
      </h1>

      <div className="flex flex-col items-center gap-4 mb-10">
        <span className="text-2xl font-mono text-gray-800 bg-white/80 px-6 py-2 rounded-xl shadow-md">
          ⏱ {formatTime(time)} / 03:00
        </span>

        {!recording ? (
          <button
            onClick={startRecording}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-2xl shadow-lg hover:scale-105 hover:bg-green-700 transition-transform"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-2xl shadow-lg hover:scale-105 hover:bg-red-700 transition-transform"
          >
            Stop Recording
          </button>
        )}
      </div>

      {recordings.length > 0 && (
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">
          📂 Recordings
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 flex flex-col items-center hover:shadow-xl transition"
          >
            <video
              src={`${API_BASE}/${rec.filepath}`} // ✅ use filepath
              controls
              className="rounded-lg w-full h-40 object-cover bg-black"
            />
            <div className="flex gap-4 mt-3">
              <a
                href={`${API_BASE}/${rec.filepath}`} // ✅ download also filepath
                download={rec.filename}
                className="text-blue-600 font-medium hover:underline"
              >
                ⬇ Download
              </a>
              <button
                onClick={() => deleteRecording(rec.id)}
                className="text-red-600 font-medium hover:underline"
              >
                ❌ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
