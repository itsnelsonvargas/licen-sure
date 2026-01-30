from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class ProcessRequest(BaseModel):
    secret: str
    document_id: uuid.UUID
    file_path: str # Path within Supabase Storage

class ChoiceData(BaseModel):
    choice_text: str
    is_correct: bool

class QuestionData(BaseModel):
    question_text: str
    choices: List[ChoiceData]

class AICallbackPayload(BaseModel):
    questions: List[QuestionData]
