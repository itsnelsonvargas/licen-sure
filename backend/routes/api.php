<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\QuizAttemptController; // Import the new controller

// Public routes for authentication
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}/quiz', [DocumentController::class, 'showQuizQuestions']);
    Route::post('/quiz-attempts', [QuizAttemptController::class, 'store']);
    Route::get('/quiz-attempts/{document}', [QuizAttemptController::class, 'index']); // Added this route
    // Add other API routes for documents, quizzes, etc. here later
});

// Internal API endpoint for AI service callback (needs secure handling)
Route::post('/documents/{document}/questions', [DocumentController::class, 'processAiCallback']);

Route::post('/debug-callback/{id}', function ($id) {
    return response()->json(['message' => 'Route hit', 'id' => $id]);
});
