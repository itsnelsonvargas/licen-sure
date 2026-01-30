<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Question;
use App\Models\Choice;
use App\Models\QuizAttempt;
use App\Models\AttemptAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class QuizAttemptController extends Controller
{
    /**
     * Store a newly created quiz attempt in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'document_id' => ['required', 'uuid', 'exists:documents,id'],
            'answers' => ['required', 'array'],
            'answers.*' => ['required', 'uuid', 'exists:choices,id'], // Key is question_id, value is chosen_choice_id
        ]);

        $documentId = $request->document_id;
        $submittedAnswers = $request->answers; // [question_id => chosen_choice_id]

        // Load all questions and their choices for the document
        $questions = Question::where('document_id', $documentId)
            ->with('choices')
            ->get();

        if ($questions->isEmpty()) {
            throw ValidationException::withMessages(['document_id' => 'No questions found for this document.']);
        }

        $totalQuestions = $questions->count();
        $correctAnswersCount = 0;
        $attemptAnswersData = [];

        DB::beginTransaction();
        try {
            // Create a new QuizAttempt record
            $quizAttempt = QuizAttempt::create([
                'user_id' => Auth::id(),
                'document_id' => $documentId,
                'score' => 0, // Placeholder, will update after calculation
            ]);

            foreach ($questions as $question) {
                $chosenChoiceId = $submittedAnswers[$question->id] ?? null;
                $correctChoice = $question->choices->firstWhere('is_correct', true);

                $isCorrect = false;
                if ($chosenChoiceId && $correctChoice && $chosenChoiceId === $correctChoice->id) {
                    $isCorrect = true;
                    $correctAnswersCount++;
                }

                $attemptAnswersData[] = [
                    'quiz_attempt_id' => $quizAttempt->id,
                    'question_id' => $question->id,
                    'chosen_choice_id' => $chosenChoiceId,
                    'is_correct' => $isCorrect,
                    'correct_choice_id' => $correctChoice ? $correctChoice->id : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // Save all attempt answers in a single batch
            AttemptAnswer::insert($attemptAnswersData);

            // Calculate score (percentage)
            $scorePercentage = $totalQuestions > 0 ? round(($correctAnswersCount / $totalQuestions) * 100) : 0;
            $quizAttempt->score = $scorePercentage;
            $quizAttempt->save();

            DB::commit();

            // Prepare response for frontend
            $responseAnswers = array_map(function ($answer) use ($questions) {
                $question = $questions->firstWhere('id', $answer['question_id']);
                $chosenChoice = $question->choices->firstWhere('id', $answer['chosen_choice_id']);
                $correctChoice = $question->choices->firstWhere('is_correct', true);
                
                return [
                    'question_id' => $answer['question_id'],
                    'chosen_choice_id' => $answer['chosen_choice_id'],
                    'is_correct' => $answer['is_correct'],
                    'correct_choice_id' => $correctChoice ? $correctChoice->id : null,
                ];
            }, $attemptAnswersData);

            return response()->json([
                'score' => $scorePercentage,
                'total_questions' => $totalQuestions,
                'correct_answers' => $correctAnswersCount,
                'attempt_answers' => $responseAnswers,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Display a listing of quiz attempts for a specific document.
     */
    public function index(Document $document)
    {
        // Ensure the authenticated user owns the document
        if (Auth::id() !== $document->user_id) {
            abort(403, 'Unauthorized');
        }

        $attempts = QuizAttempt::where('document_id', $document->id)
            ->where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get();

        return response()->json($attempts);
    }
}
