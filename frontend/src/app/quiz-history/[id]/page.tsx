"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import Link from "next/link";
import { AxiosError } from "axios";

interface QuizAttempt {
  id: string;
  document_id: string;
  score: number;
  created_at: string;
}

export default function QuizHistoryPage() {
  const params = useParams();
  const documentId = params.id as string;
  const router = useRouter();
  const { status } = useSession();

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.get("/sanctum/csrf-cookie");
      const response = await api.get(`/quiz-attempts/${documentId}`);
      setAttempts(response.data);
    } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        console.error("Failed to fetch quiz attempts:", error);
        setError(
            error.response?.data?.message ||
            error.message ||
            "Failed to load quiz history."
        );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchQuizAttempts();
    }
  }, [status, router, fetchQuizAttempts]);

  if (status === "loading" || loading) {
    return <p className="min-h-screen bg-gray-100 p-8">Loading quiz history...</p>;
  }

  if (error) {
    return (
      <p className="min-h-screen bg-gray-100 p-8 text-red-600">Error: {error}</p>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Quiz History</h1>
      <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Attempts for Document ID: {documentId}
        </h2>

        {attempts.length === 0 && !loading && (
          <p className="text-gray-600">No quiz attempts recorded for this document yet.</p>
        )}

        {attempts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Attempt ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Score (%)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {attempt.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attempt.score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(attempt.created_at).toLocaleDateString()}{" "}
                      {new Date(attempt.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {/* Potentially add a link to view detailed attempt later */}
                        <span className="text-gray-400">View Details (Soon)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
