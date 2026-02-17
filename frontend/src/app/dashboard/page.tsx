"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FileUploadForm from "@/components/FileUploadForm";
import { useDocuments } from "@/lib/hooks/useDocuments"; // Import the hook
import Link from "next/link"; // For navigation

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { documents, loading, error, refreshDocuments } = useDocuments(); // Use the hook

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
  }, [status, router]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-700">Welcome, {session.user?.name}!</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Upload New Document
          </h2>
          <FileUploadForm />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Your Documents
            </h2>
            <button
              onClick={refreshDocuments}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          {loading && <p>Loading documents...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}

          {!loading && documents.length === 0 && (
            <p className="text-gray-600">No documents uploaded yet.</p>
          )}

          {!loading && documents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Uploaded At
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      History
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.status.toUpperCase()}
                        {doc.status === "failed" && doc.error_message && (
                          <p className="text-xs text-red-400">
                            ({doc.error_message})
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                        {doc.status === "completed" && (
                          <Link
                            href={`/quiz/${doc.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Start Quiz
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                        {doc.status === "completed" && (
                          <Link
                            href={`/quiz-history/${doc.id}`}
                            className="text-blue-600 hover:text-blue-900 ml-4"
                          >
                            View History
                          </Link>
                        )}
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

  return null;
}
