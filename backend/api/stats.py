from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from database.stats import add_visit, get_visit_stats
from .dependencies import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])

class VisitRequest(BaseModel):
    referrer: Optional[str] = ""

@router.post("/visit")
async def record_visit(request: Request, visit: VisitRequest):
    # Get IP address
    # If behind proxy (like Nginx), might need header X-Forwarded-For
    client_host = request.client.host
    user_agent = request.headers.get('user-agent', '')
    
    try:
        add_visit(client_host, visit.referrer, user_agent)
        return {"status": "success"}
    except Exception as e:
        print(f"Error recording visit: {e}")
        # Don't fail the request if stats fail, just log it
        return {"status": "error", "message": str(e)}

@router.get("/")
async def get_stats(_: str = Depends(get_current_user)):
    try:
        data = get_visit_stats()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
