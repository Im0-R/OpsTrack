import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthPage, AuthProvider, Protected } from "./auth";
import { Shell } from "./components";
import { DashboardPage } from "./DashboardPage";
import { TicketsPage } from "./TicketsPage";
import { TicketDetailPage } from "./TicketDetailPage";
import { TicketFormPage } from "./TicketFormPage";
import { ProfilePage } from "./ProfilePage";
import "./app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route
            path="/register"
            element={<AuthPage key="register" register />}
          />
          <Route
            element={
              <Protected>
                <Shell />
              </Protected>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/new" element={<TicketFormPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="tickets/:id/edit" element={<TicketFormPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="state">
                <h1>Page not found</h1>
                <Link to="/" className="button">
                  Return to workspace
                </Link>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
