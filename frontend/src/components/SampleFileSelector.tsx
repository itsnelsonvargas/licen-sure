"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";
import Link from "next/link";

interface SampleItem {
  name: string;
  path: string;
}

export default function SampleFileSelector() {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const getErrorMessage = (e: unknown) => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const obj = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      return obj.response?.data?.message || obj.message || "Unexpected error";
    }
    return "Unexpected error";
  };

  const publicApi = axios.create({
    baseURL: "/backend-api",
    withCredentials: false,
    headers: { Accept: "application/json" },
  });

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
  }, []);

  const handleGenerate = async () => {
    if (!selectedPath) {
      setError("Please select a PDF.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    setDocumentId(null);
    try {
      const res = await publicApi.post("/documents/from-sample", { path: selectedPath });
      setMessage(res.data.message || "Processing initiated.");
      setDocumentId(res.data.document?.id || null);
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
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await publicApi.post("/documents/guest-upload", formData);
      setMessage(res.data.message || "Processing initiated.");
      setDocumentId(res.data.document?.id || null);
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

      {documentId && (
        <div className="mt-4">
          <Link
            href={`/quiz/${documentId}`}
            className="text-[#1E3A5F] hover:text-[#16314D]"
          >
            View Questions
          </Link>
          <p className="text-xs text-gray-600 mt-1">
            If you don’t see questions immediately, the document may still be processing.
          </p>
        </div>
      )}
    </div>
  );
}
