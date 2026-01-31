"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import api from "@/lib/api";

interface Choice {
  id: string;
  choice_text: string;
  is_correct?: boolean; // Optional for client-side
}

interface Question {
  id: string;
  question_text: string;
  choices: Choice[];
}

interface QuizResult {
  score: number;
  total_questions: number;
  correct_answers: number;
  attempt_answers: Array<{
    question_id: string;
    chosen_choice_id: string;
    is_correct: boolean;
    correct_choice_id: string;
  }>;
}

export default function QuizPage() {
  const params = useParams();
  const documentId = params.id as string;
  const router = useRouter();
  const { status } = useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({}); // { questionId: choiceId }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
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

  const fetchQuizQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (status === "authenticated") {
        await api.get("/sanctum/csrf-cookie");
        const response = await api.get(`/api/documents/${documentId}/quiz`);
        const data = response.data as unknown;
        if (Array.isArray(data)) {
          setQuestions(data as Question[]);
        } else {
          setQuestions([]);
          const msg =
            typeof data === "object" && data && "message" in (data as object)
              ? (data as { message?: string }).message
              : undefined;
          if (msg && msg.toLowerCase().includes("quiz not ready")) {
            setError(null);
          } else {
            setError(msg || "Quiz not ready for this document.");
          }
        }
      } else {
        const res = await fetch(`/backend-api/public/documents/${documentId}/quiz`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const data = (await res.json()) as unknown;
        if (Array.isArray(data)) {
          setQuestions(data as Question[]);
        } else {
          setQuestions([]);
          const msg =
            typeof data === "object" && data && "message" in (data as object)
              ? (data as { message?: string }).message
              : undefined;
          if (msg && msg.toLowerCase().includes("quiz not ready")) {
            setError(null);
          } else {
            setError(msg || "Quiz not ready for this document.");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch quiz questions:", err);
      const m = getErrorMessage(err);
      if (m.toLowerCase().includes("quiz not ready")) {
        setError(null);
      } else {
        setError(m);
      }
    } finally {
      setLoading(false);
    }
  }, [status, documentId]);

  useEffect(() => {
    fetchQuizQuestions();
  }, [fetchQuizQuestions]);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!loading && !error && questions.length === 0 && !pollRef.current) {
      pollRef.current = setInterval(() => {
        if (!loading) {
          fetchQuizQuestions();
        }
      }, 2000);
    }
    if (questions.length > 0 || error) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [questions, error, loading, fetchQuizQuestions]);

  const handleAnswerChange = (questionId: string, choiceId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.get("/sanctum/csrf-cookie");
      const response = await api.post(`/quiz-attempts`, {
        document_id: documentId,
        answers: selectedAnswers, // { question_id: chosen_choice_id }
      });
      setQuizResult(response.data);
      setQuizSubmitted(true);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <p className="min-h-screen bg-gray-100 p-8">Loading quiz...</p>;
  }

  if (error) {
    return (
      <p className="min-h-screen bg-gray-100 p-8 text-red-600">Error: {error}</p>
    );
  }

  if (quizSubmitted && quizResult) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Quiz Results</h1>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <p className="text-xl font-semibold mb-4">
            You scored {quizResult.score}% ({quizResult.correct_answers} out of{" "}
            {quizResult.total_questions} correct)
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Optionally, display individual question results */}
        <div className="space-y-6">
          {questions.map((question, qIndex) => {
            const userChoiceId = selectedAnswers[question.id];
            const resultForQuestion = quizResult.attempt_answers.find(
              (a) => a.question_id === question.id
            );
            const isCorrect = resultForQuestion?.is_correct;

            return (
              <div key={question.id} className="bg-white p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-lg mb-2">
                  {qIndex + 1}. {question.question_text}
                </p>
                <div className="space-y-2">
                  {question.choices.map((choice) => (
                    <div
                      key={choice.id}
                      className={`p-2 rounded-md border ${
                        choice.id === resultForQuestion?.correct_choice_id
                          ? "bg-green-100 border-green-500" // Correct answer
                          : choice.id === userChoiceId && !isCorrect
                          ? "bg-red-100 border-red-500" // User chose wrong
                          : "bg-gray-50 border-gray-200" // Other choices
                      }`}
                    >
                      {choice.choice_text}
                      {choice.id === resultForQuestion?.correct_choice_id && (
                        <span className="ml-2 text-green-700 font-medium">
                          (Correct)
                        </span>
                      )}
                      {choice.id === userChoiceId && !isCorrect && (
                        <span className="ml-2 text-red-700 font-medium">
                          (Your Answer - Incorrect)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Take Quiz</h1>
        <a
          href={`/backend-api/public/documents/${documentId}/file`}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          View Original File
        </a>
      </div>
      {questions.length === 0 && !loading && (
        <p>No questions found for this document. It might still be processing.</p>
      )}

      <div className="space-y-6">
        {questions.map((question, qIndex) => (
          <div key={question.id} className="bg-white p-6 rounded-lg shadow-md">
            <p className="font-semibold text-xl mb-4">
              {qIndex + 1}. {question.question_text}
            </p>
            <div className="space-y-3">
              {question.choices.map((choice) => (
                <label key={choice.id} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={choice.id}
                    checked={selectedAnswers[question.id] === choice.id}
                    onChange={() =>
                      handleAnswerChange(question.id, choice.id)
                    }
                    className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                  />
                  <span className="text-gray-700 text-lg">
                    {choice.choice_text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <button
          onClick={handleSubmitQuiz}
          disabled={
            status !== "authenticated" ||
            Object.keys(selectedAnswers).length !== questions.length ||
            loading
          }
          className="mt-8 px-6 py-3 text-lg font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Quiz
        </button>
      )}
      {status !== "authenticated" && questions.length > 0 && (
        <p className="mt-2 text-sm text-gray-700">
          Login to submit your answers and track your score.
        </p>
      )}
    </div>
  );
}
