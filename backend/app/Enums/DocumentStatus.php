<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case UPLOADING = 'uploading';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case FAILED = 'failed';
}
