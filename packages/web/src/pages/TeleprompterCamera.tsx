import { useParams, useNavigate } from "react-router-dom";
import { mockScripts } from "@/data/mockScripts";
import { X, RotateCcw, Pause, Play, Square, Circle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TeleprompterCamera() {
  const { id } = useParams();
  const navigate = useNavigate();
  const script = mockScripts.find((s) => s.id === id);

  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const timerRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isScrolling || !scrollRef.current) return;

    const el = scrollRef.current;
    const scrollStep = () => {
      el.scrollTop += speed * 0.8;
      animRef.current = requestAnimationFrame(scrollStep);
    };
    animRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isScrolling, speed]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const startRecording = () => {
    setIsRecording(true);
    setIsScrolling(true);
    setElapsed(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsScrolling(false);
    setShowSuccess(true);
  };

  const restart = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIsScrolling(false);
    setIsRecording(false);
    setElapsed(0);
  };

  if (!script) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Script not found</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Simulated camera background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-foreground p-2">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{script.seriesTitle || "Script"}</p>
          {isRecording && (
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-mono">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>
        <div className="w-9" />
      </div>

      {/* Teleprompter text area */}
      <div className="relative flex-1 z-10 flex items-center justify-center">
        <div
          ref={scrollRef}
          className="w-full h-full overflow-y-auto scrollbar-hide px-8 py-20"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
          }}
        >
          <p className="text-foreground text-2xl font-medium leading-[1.8] text-center">
            {script.teleprompterText}
          </p>
          {/* Extra space for scrolling */}
          <div className="h-[60vh]" />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-4 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        {/* Speed slider */}
        <div className="flex items-center gap-3 mb-4 px-2">
          <span className="text-xs text-muted-foreground w-8">0.5×</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8">2.0×</span>
          <span className="text-xs text-primary font-semibold w-8">{speed.toFixed(1)}×</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={restart}
            className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-foreground active:scale-90 transition-transform"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-destructive/30"
            >
              <Circle className="w-8 h-8 text-foreground fill-foreground" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-destructive/30"
            >
              <Square className="w-7 h-7 text-foreground fill-foreground" />
            </button>
          )}

          <button
            onClick={() => setIsScrolling((s) => !s)}
            className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-foreground active:scale-90 transition-transform"
          >
            {isScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/95 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-foreground text-xl font-display font-bold mb-1">Saved to Camera Roll</h2>
              <p className="text-muted-foreground text-sm mb-6">Script marked as filmed</p>
              <button
                onClick={() => navigate(-1)}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold text-sm active:scale-95 transition-transform"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
