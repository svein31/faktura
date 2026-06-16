import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui-kit";

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-[#0b1220]">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  return children;
};
