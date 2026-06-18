import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { PageLoader } from "./components/Section";
import About from "./routes/About";
import Home from "./routes/Home";
import News from "./routes/News";
import Place from "./routes/Place";
import Search from "./routes/Search";

const MapPage = lazy(() => import("./routes/Map"));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader label="読み込み中" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/changes" element={<Navigate to="/news?category=changes" replace />} />
          <Route path="/news" element={<News />} />
          <Route path="/about" element={<About />} />
          <Route path="/place/:id" element={<Place />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
