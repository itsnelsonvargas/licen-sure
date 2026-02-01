import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

interface Document {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  status: "uploading" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure CSRF cookie is set for authenticated requests
      await api.get("/sanctum/csrf-cookie");
      const response = await api.get("/documents");
      setDocuments(response.data);
    } catch (err: any) {
      console.error("Failed to fetch documents:", err);
      if (err?.code === "ERR_NETWORK") {
        setError("Backend unreachable. Check backend URL and server status.");
      } else {
        setError(
          err.response?.data?.message || err.message || "Failed to fetch documents."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments(); // Initial fetch

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchDocuments();
    }, 5000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchDocuments]);

  return { documents, loading, error, refreshDocuments: fetchDocuments };
}
