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

// Public endpoints for unauthenticated flow
Route::get('/samples', [DocumentController::class, 'listSamplePdfs']);
Route::post('/documents/from-sample', [DocumentController::class, 'storeFromSample']);
Route::post('/documents/from-text', [DocumentController::class, 'storeFromText']);
Route::get('/public/documents/{document}/quiz', [DocumentController::class, 'showQuizQuestionsPublic']);
Route::get('/public/documents/{document}/file', [DocumentController::class, 'downloadPublicFile']);
Route::post('/documents/guest-upload', [DocumentController::class, 'storeGuestUpload']);
Route::get('/documents/{document}/progress', [DocumentController::class, 'showProgress']);
Route::post('/documents/{document}/progress', [DocumentController::class, 'updateProgress']);
Route::post('/documents/{document}/retry', [DocumentController::class, 'retry']);

// CORS preflight handler for API
Route::options('/{any}', function (Request $request) {
    $origin = $request->header('Origin', 'http://localhost:3000');
    return response('', 204)->withHeaders([
        'Access-Control-Allow-Origin' => $origin,
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, X-Requested-With, Accept, Origin, Authorization',
        'Access-Control-Allow-Credentials' => 'true',
    ]);
})->where('any', '.*');
