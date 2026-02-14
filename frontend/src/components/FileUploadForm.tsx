"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export default function FileUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        setError("File size must be less than 20MB.");
        setSelectedFile(null);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError("Invalid file type. Please upload a PDF, DOCX, PNG, or JPG.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setMessage("Uploading file...");
    setError(null);
    setUploadProgress(0);
    setDocumentId(null);

    const formData = new FormData();
    formData.append("document", selectedFile);

    try {
      await api.get("/sanctum/csrf-cookie");

      const response = await api.post("/documents/guest-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(percent);
          if (percent < 100) {
            setMessage(`Uploading... ${percent}%`);
          } else {
            setMessage("Upload complete. Processing...");
          }
        },
      });
      
      const id = response.data?.document?.id as string | undefined;
      if (id) {
        setDocumentId(id);
        pollDocumentProgress(id);
      } else {
        throw new Error("Failed to get document ID from upload response.");
      }
      setSelectedFile(null);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } }; message?: string })
          .response?.data?.message ||
        (err as { message?: string }).message ||
        "Failed to upload file.";
      setError(errorMessage);
      setUploading(false);
    } 
  };
  
  const pollDocumentProgress = (id: string) => {
    setMessage("Checking document status...");
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${id}/progress`);
        const { status, percent, message: progressMessage, error: progressError } = res.data;
        
        setMessage(progressMessage || `Processing... ${percent}%`);

        if (status === 'completed') {
          clearInterval(interval);
          setMessage("Quiz generated successfully!");
          setUploading(false);
          router.push(`/quiz/${id}`);
        } else if (status === 'failed') {
          clearInterval(interval);
          setError(progressError || "An unknown error occurred during processing.");
          setUploading(false);
        }
      } catch (err) {
        clearInterval(interval);
        console.error("Progress poll error:", err);
        setError("Failed to get processing status.");
        setUploading(false);
      }
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-gray-700"
        >
          Select Document (PDF, DOCX, Image up to 20MB)
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m-4-4v4m-4 4h4"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  disabled={uploading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              {selectedFile ? selectedFile.name : "No file selected"}
            </p>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-blue-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div
            className="bg-indigo-600 h-2.5 rounded-full"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {documentId && !uploading && (
        <div className="text-sm">
          <a href={`/quiz/${documentId}`} className="text-indigo-600 hover:text-indigo-800">
            View Your Quiz
          </a>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Processing..." : "Upload & Generate Quiz"}
      </button>
    </div>
  );
}
