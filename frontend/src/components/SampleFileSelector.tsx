"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

interface SampleItem {
  name: string;
  path: string;
}

type Progress = { percent: number; message: string; eta_seconds: number; status: string; error?: string };

export default function SampleFileSelector() {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{ message: string; percent: number; ts: number }[]>([]);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const getErrorMessage = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const obj = e as {
        response?: { data?: { message?: string } };
        message?: string;
        code?: string;
      };
      if (obj.code === "ERR_NETWORK") return "Backend unreachable. Check backend URL and server status.";
      return obj.response?.data?.message || obj.message || "Unexpected error";
    }
    return "Unexpected error";
  };
  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  };
  useEffect(() => {
    if (!startTs) return;
    setElapsed(Math.floor((Date.now() - startTs) / 1000));
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTs) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [startTs]);

  const publicApi = useMemo(
    () =>
      axios.create({
        baseURL: "/backend-api",
        withCredentials: false,
        headers: { Accept: "application/json" },
      }),
    []
  );

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await publicApi.get("/samples");
        setSamples(res.data.samples || []);
        if (res.data.samples?.length > 0) {
          setSelectedPath(res.data.samples[0].path);
        }
      } catch (e) {
        setError(getErrorMessage(e));
      }
    };
    fetchSamples();
  }, [publicApi]);

  const handleGenerate = async () => {
    if (!selectedPath) {
      setError("Please select a PDF.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    setDocumentId(null);
    setDiagnostics([]);
    setStartTs(Date.now());
    setElapsed(0);
    try {
      const res = await publicApi.post("/documents/from-sample", { path: selectedPath });
      setMessage(res.data.message || "Processing initiated.");
      setDocumentId(res.data.document?.id || null);
      const interval = setInterval(async () => {
        try {
          const p = await publicApi.get(`/documents/${res.data.document?.id}/progress`);
          setProgress(p.data);
          setDiagnostics((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.message === p.data.message && last.percent === p.data.percent) return prev;
            const next = [...prev, { message: p.data.message, percent: p.data.percent, ts: Date.now() }];
            return next.length > 30 ? next.slice(next.length - 30) : next;
          });
          if (p.data?.status === "completed" || p.data?.percent >= 100) {
            clearInterval(interval);
          }
        } catch {
        }
      }, 1000);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestUpload = async () => {
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    setDocumentId(null);
    setDiagnostics([]);
    setStartTs(Date.now());
    setElapsed(0);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await publicApi.post("/documents/guest-upload", formData);
      setMessage(res.data.message || "Processing initiated.");
      setDocumentId(res.data.document?.id || null);
      const interval = setInterval(async () => {
        try {
          const p = await publicApi.get(`/documents/${res.data.document?.id}/progress`);
          setProgress(p.data);
          setDiagnostics((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.message === p.data.message && last.percent === p.data.percent) return prev;
            const next = [...prev, { message: p.data.message, percent: p.data.percent, ts: Date.now() }];
            return next.length > 30 ? next.slice(next.length - 30) : next;
          });
          if (p.data?.status === "completed" || p.data?.percent >= 100) {
            clearInterval(interval);
          }
        } catch {
        }
      }, 1000);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);
      setMessage("Retrying...");
      setDiagnostics([]);
      setStartTs(Date.now());
      setElapsed(0);
      await publicApi.post(`/documents/${documentId}/retry`);
      const interval = setInterval(async () => {
        try {
          const p = await publicApi.get(`/documents/${documentId}/progress`);
          setProgress(p.data);
          setDiagnostics((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.message === p.data.message && last.percent === p.data.percent) return prev;
            const next = [...prev, { message: p.data.message, percent: p.data.percent, ts: Date.now() }];
            return next.length > 30 ? next.slice(next.length - 30) : next;
          });
          if (p.data?.status === "completed" || p.data?.percent >= 100) {
            clearInterval(interval);
          }
        } catch {
        }
      }, 1000);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6">
      <h3 className="text-xl font-medium text-[#1E3A5F]">Try with a sample PDF</h3>
      <p className="mt-2 text-gray-700 leading-relaxed">
        Select a sample file and generate questions without logging in.
      </p>
      <div className="mt-4 flex flex-col md:flex-row gap-4 md:items-center">
        <select
          className="w-full md:w-auto border border-[#CBD5E1] rounded-md px-3 py-2 text-[#1E3A5F] bg-white"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
        >
          {samples.map((s) => (
            <option key={s.path} value={s.path}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedPath}
          className="px-6 py-2 rounded-md bg-[#1E3A5F] text-white hover:bg-[#16314D] transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Questions"}
        </button>
      </div>

      <div className="mt-6 border-t border-[#E2E8F0] pt-6">
        <h4 className="text-lg font-medium text-[#1E3A5F]">Or upload your PDF</h4>
        <p className="mt-1 text-gray-700 leading-relaxed">
          Upload a file without logging in. We’ll process it and generate questions.
        </p>
        <div className="mt-3 flex flex-col md:flex-row gap-4 md:items-center">
          <input
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full md:w-auto"
          />
          <button
            onClick={handleGuestUpload}
            disabled={loading || !file}
            className="px-6 py-2 rounded-md bg-[#1E3A5F] text-white hover:bg-[#16314D] transition-colors disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload & Generate"}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#1E3A5F]">{progress.message}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs text-[#1E3A5F] underline"
              >
                Details
              </button>
              <span className="text-sm text-[#1E3A5F]">{progress.percent}%</span>
            </div>
          </div>
          <div className="w-full bg-[#E2E8F0] rounded-full h-2">
            <div
              className="bg-[#1E3A5F] h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Estimated time remaining: {progress.eta_seconds}s
          </div>
          {startTs && (
            <div className="text-xs text-gray-600">
              Time elapsed: {formatElapsed(elapsed)}
            </div>
          )}
          {showDetails && (
            <div className="mt-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="text-xs text-gray-700 space-y-1">
                {diagnostics.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{d.message}</span>
                    <span className="ml-2 text-gray-500">{d.percent}%</span>
                  </div>
                ))}
                {progress.error && <div className="mt-2 text-red-700">{progress.error}</div>}
              </div>
            </div>
          )}
          {progress.status === "failed" && (
            <div className="mt-3">
              <div className="text-sm text-red-700">{progress.error || "Processing failed"}</div>
              <button
                onClick={handleRetry}
                disabled={loading || !documentId}
                className="mt-2 px-4 py-2 rounded-md bg-[#1E3A5F] text-white hover:bg-[#16314D] transition-colors disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {documentId && (
        <div className="mt-4">
          <Link
            href={`/quiz/${documentId}`}
            className="text-[#1E3A5F] hover:text-[#16314D]"
          >
            View Questions
          </Link>
          <span className="mx-2 text-gray-400">•</span>
          <a
            href={`/backend-api/public/documents/${documentId}/file`}
            target="_blank"
            rel="noreferrer"
            className="text-[#1E3A5F] hover:text-[#16314D]"
          >
            View File
          </a>
          <p className="text-xs text-gray-600 mt-1">
            If you don’t see questions immediately, the document may still be processing.
          </p>
        </div>
      )}
    </div>
  );
}
