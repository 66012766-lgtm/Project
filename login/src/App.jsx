import React from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./Pages/Login";
import VisitForm from "./Pages/VisitForm";
import AdminForm from "./Pages/AdminForm";
import Report from "./Pages/Report";

function PrivateRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/" replace />;

  if (user.role !== "admin") {
    return <Navigate to="/visit-form" replace />;
  }

  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/visit-form"
          element={
            <PrivateRoute>
              <VisitForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin-form"
          element={
            <AdminRoute>
              <AdminForm />
            </AdminRoute>
          }
        />

        <Route
          path="/report"
          element={
            <PrivateRoute>
              <Report />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}