from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from typing import Dict, Any
from auth.cognito import get_current_user
from services.s3_service import upload_file_to_s3
from services.exif_service import extract_exif_metadata
from services.dynamo_service import save_image_metadata
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/heic"]

@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
) -> Dict[str, Any]:
    
    # 1. Validate File Type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and HEIC are allowed.")
        
    try:
        # Load file into memory
        file_bytes = await file.read()
        
        # 2. Extract EXIF Metadata
        metadata = extract_exif_metadata(file_bytes)
        
        # 3. Upload to S3
        file_obj = io.BytesIO(file_bytes)
        file_key, presigned_url = upload_file_to_s3(
            file_obj=file_obj,
            original_filename=file.filename or 'upload.jpg',
            user_id=user_id,
            content_type=file.content_type
        )
        
        # 4. Save to DynamoDB
        try:
            save_image_metadata(
                image_id=file_key,
                user_id=user_id,
                date_taken=metadata.get("date_taken"),
                gps_lat=metadata.get("gps_lat"),
                gps_lon=metadata.get("gps_lon")
            )
        except Exception as e:
            # Catch DynamoDB exceptions gracefully so the S3 successful upload response triggers
            logger.warning(f"DynamoDB metadata saving skipped for {file_key} due to error: {e}")
            pass
            
        # 5. Return Combined Payload exactly as requested
        return {
            "file_key": file_key,
            "message": "Upload successful",
            "metadata": {
                "date_taken": metadata.get("date_taken"),
                "gps_lat": metadata.get("gps_lat"),
                "gps_lon": metadata.get("gps_lon")
            }
        }
        
    except HTTPException:
        # Re-raise standard web exceptions seamlessly
        raise
    except Exception as e:
        logger.error(f"Failed to process upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file.")
