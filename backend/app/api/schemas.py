from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ExecutionStepResponse(BaseModel):
    id: int
    execution_id: int
    step_number: int
    step_name: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
    output_data: Optional[str]
    
    class Config:
        from_attributes = True
