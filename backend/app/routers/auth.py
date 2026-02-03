"""
Auth Router - Signup and user management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.models.schemas import UserCreate, UserResponse, Token
from app.services.auth_service import get_password_hash, create_access_token

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login/credentials", response_model=Token)
async def login_credentials(user_data: UserCreate, db: Session = Depends(get_db)):
    """Backend login endpoint for credentials (used by NextAuth)"""
    from app.services.auth_service import verify_password
    
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/sync-google", response_model=UserResponse)
async def sync_google_user(user_data: dict, db: Session = Depends(get_db)):
    """Sync a Google user (called by NextAuth during sign-in)"""
    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=user_data.get("name"),
            image=user_data.get("image")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name/image if they changed
        user.name = user_data.get("name", user.name)
        user.image = user_data.get("image", user.image)
        db.commit()
        db.refresh(user)
        
    return user
