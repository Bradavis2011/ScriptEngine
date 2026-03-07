import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import AuthRequired from "@/components/AuthRequired";
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
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/onboarding" element={<AuthRequired><Onboarding /></AuthRequired>} />
          <Route path="/library" element={<AuthRequired><Library /></AuthRequired>} />
          <Route path="/series" element={<AuthRequired><SeriesPage /></AuthRequired>} />
          <Route path="/profile" element={<AuthRequired><Profile /></AuthRequired>} />
          <Route path="/camera" element={<AuthRequired><CameraHub /></AuthRequired>} />
          <Route path="/script/:id" element={<AuthRequired><ScriptDetail /></AuthRequired>} />
          <Route path="/teleprompter/:id" element={<AuthRequired><TeleprompterCamera /></AuthRequired>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
