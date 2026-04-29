"""
Net Worth Methods Router
------------------------
POST /api/networth-methods/{file_id}
Computes all 7 net worth methods from an already-extracted session.
"""
import logging

from fastapi import APIRouter

from models.request_models import NetWorthMethodsRequest
from models.response_models import NetWorthMethodsResponse, NetWorthMethodResult
from services.networth_calculator import build_method_results
from routers.extract import get_session

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/networth-methods/{file_id}", response_model=NetWorthMethodsResponse)
async def get_networth_methods(file_id: str, request: NetWorthMethodsRequest):
    session = get_session(file_id)  # raises 404 if not found
    extracted_raw = session["extracted_raw"]

    results = build_method_results(extracted_raw, request.entity_type)
    return NetWorthMethodsResponse(
        file_id=file_id,
        entity_type=request.entity_type,
        methods=[NetWorthMethodResult(**r) for r in results],
    )
