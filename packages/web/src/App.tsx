import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Home from "./pages/Home";
import ScriptDetail from "./pages/ScriptDetail";
import TeleprompterCamera from "./pages/TeleprompterCamera";
import Library from "./pages/Library";
import SeriesPage from "./pages/SeriesPage";
import Profile from "./pages/Profile";
import CameraHub from "./pages/CameraHub";
import Onboarding from "./pages/Onboarding";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/script/:id" element={<ScriptDetail />} />
          <Route path="/teleprompter/:id" element={<TeleprompterCamera />} />
          <Route path="/library" element={<Library />} />
          <Route path="/series" element={<SeriesPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/camera" element={<CameraHub />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
