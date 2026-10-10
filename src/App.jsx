import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { GlobalProvider } from "./state/GlobalProvider";
import { ToastProvider } from "./state/ToastProvider";
import { useGlobal } from "./state/context";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

// Pages behind the sidebar are split into their own chunks so the login page
// doesn't download the spreadsheet library.
const ChangeLog = lazy(() => import("./pages/ChangeLog"));
const ChecklistPage = lazy(() => import("./pages/ChecklistPage"));
const ClauseDetail = lazy(() => import("./pages/ClauseDetail"));
const CustomISO = lazy(() => import("./pages/CustomISO"));
const CustomStandardPage = lazy(() => import("./pages/CustomStandardPage"));
const Evidence = lazy(() => import("./pages/Evidence"));
const Files = lazy(() => import("./pages/Files"));
const ISO27001 = lazy(() => import("./pages/ISO27001"));
const Users = lazy(() => import("./pages/Users"));

const EDITORS = ["ADMIN", "USER"];
const ADMINS = ["ADMIN"];

function RequireLogin({ children }) {
  const { user } = useGlobal();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function AppRoutes() {
  const { user } = useGlobal();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RequireLogin><Landing /></RequireLogin>} />

      <Route element={<RequireLogin><AppShell /></RequireLogin>}>
        <Route path="/iso9001" element={<ChecklistPage key="iso9001" standardId="iso9001" />} />
        <Route path="/iso9001/clause/:dbId" element={<ClauseDetail key="iso9001" standardId="iso9001" />} />
        <Route path="/iso27001" element={<ISO27001 />} />
        <Route path="/iso27001/clause/:dbId" element={<ClauseDetail key="iso27001" standardId="iso27001" />} />
        <Route path="/iso42001" element={<ChecklistPage key="iso42001" standardId="iso42001" />} />
        <Route path="/iso42001/clause/:dbId" element={<ClauseDetail key="iso42001" standardId="iso42001" />} />
        <Route path="/custom/:slug" element={<CustomStandardPage />} />
        <Route path="/custom/:slug/clause/:dbId" element={<ClauseDetail />} />

        <Route path="/custom-upload" element={<ProtectedRoute allowedRoles={EDITORS}><CustomISO /></ProtectedRoute>} />
        <Route path="/evidence" element={<ProtectedRoute allowedRoles={EDITORS}><Evidence /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute allowedRoles={EDITORS}><Files /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={ADMINS}><Users /></ProtectedRoute>} />
        <Route path="/changelog" element={<ProtectedRoute allowedRoles={ADMINS}><ChangeLog /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <GlobalProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GlobalProvider>
    </ToastProvider>
  );
}
