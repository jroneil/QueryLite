import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import SavedQuery, DataSource, User
from app.models.schemas import ForecastRequest, ForecastResponse
from app.routers.auth_deps import get_current_user
from app.services.trend_forecaster import TrendForecaster
from app.services.query_executor import QueryExecutor
from app.services.encryption import decrypt_connection_string

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(
    request: ForecastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a time-series forecast from raw data or a saved query.
    """
    data = []

    # Case 1: Raw data provided
    if request.data:
        data = request.data
    
    # Case 2: Use saved query
    elif request.saved_query_id:
        saved_query = db.query(SavedQuery).get(request.saved_query_id)
        if not saved_query:
            raise HTTPException(status_code=404, detail="Saved query not found")
        
        # Get data source
        data_source = db.query(DataSource).get(saved_query.data_source_id)
        if not data_source:
             raise HTTPException(status_code=404, detail="Data source not found")
        
        try:
            # Setup executor
            if data_source.type == "duckdb":
                executor = QueryExecutor(
                    ds_type="duckdb", 
                    file_path=data_source.file_path, 
                    data_source_id=str(data_source.id)
                )
            elif data_source.type == "mongodb":
                connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
                executor = QueryExecutor(connection_string, ds_type="mongodb", data_source_id=str(data_source.id))
            else:
                connection_string = decrypt_connection_string(data_source.connection_string_encrypted)
                executor = QueryExecutor(connection_string, ds_type=data_source.type, data_source_id=str(data_source.id))
            
            # Execute the SQL
            results = executor.execute_sql(saved_query.generated_sql)
            data = results["rows"]
        except Exception as e:
            logger.error(f"Error executing query for forecast: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Either 'data' or 'saved_query_id' must be provided")

    if not data:
        return ForecastResponse(method="none", projections=[], trend="stable", error="No data available for forecasting")

    # Perform forecast (using linear regression as default)
    forecast_result = TrendForecaster.linear_forecast(
        data, 
        date_col=request.date_col, 
        value_col=request.value_col, 
        periods=request.periods
    )

    if "error" in forecast_result:
        return ForecastResponse(
            method="linear_regression", 
            projections=[], 
            trend="stable", 
            error=forecast_result["error"]
        )

    return ForecastResponse(
        method=forecast_result["method"],
        projections=forecast_result["projections"],
        trend=forecast_result["trend"],
        slope=forecast_result.get("slope"),
        intercept=forecast_result.get("intercept")
    )
