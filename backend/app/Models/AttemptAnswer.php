<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttemptAnswer extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'quiz_attempt_id',
        'question_id',
        'chosen_choice_id',
        'is_correct',
        'correct_choice_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_correct' => 'boolean',
    ];

    /**
     * Get the quiz attempt that owns the attempt answer.
     */
    public function quizAttempt(): BelongsTo
    {
        return $this->belongsTo(QuizAttempt::class);
    }

    /**
     * Get the question associated with the attempt answer.
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * Get the chosen choice associated with the attempt answer.
     */
    public function chosenChoice(): BelongsTo
    {
        return $this->belongsTo(Choice::class, 'chosen_choice_id');
    }

    /**
     * Get the correct choice associated with the attempt answer.
     */
    public function correctChoice(): BelongsTo
    {
        return $this->belongsTo(Choice::class, 'correct_choice_id');
    }
}
