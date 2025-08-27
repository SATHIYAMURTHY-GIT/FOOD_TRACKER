from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import datetime as dt
import base64
import openai
import json
from io import BytesIO
import traceback
import bcrypt
import jwt
from collections import defaultdict


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Authentication Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str  # "male" or "female"
    height_cm: float
    weight_kg: float
    activity_level: str
    goal: str  # "maintain", "lose", "gain"
    goal_weight_kg: Optional[float] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Enhanced User Profile Model
class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: str
    goal: str
    goal_weight_kg: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserProfileCreate(BaseModel):
    name: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: str
    goal: str
    goal_weight_kg: Optional[float] = None

class FoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    food_name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    estimated_portion_g: float
    total_calories: float
    total_protein: float
    image_base64: Optional[str] = None
    analysis_confidence: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)
    date: str = Field(default_factory=lambda: dt.date.today().isoformat())

class DailyStats(BaseModel):
    date: str
    total_calories: float
    total_protein: float
    recommended_calories: float
    recommended_protein: float
    calorie_goal_met: bool
    protein_goal_met: bool

class FoodAnalysisResponse(BaseModel):
    food_name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    estimated_portion_g: float
    confidence: str
    reasoning: str

# Achievement System Models
class Achievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    badge_icon: str
    category: str  # "streak", "consistency", "milestone", "protein"
    requirement_type: str  # "days_logged", "streak_count", "protein_days", "calorie_accuracy"
    requirement_value: int
    points: int
    rarity: str  # "bronze", "silver", "gold", "platinum"

class UserAchievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    achievement_id: str
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)
    progress_when_unlocked: dict

class UserStreaks(BaseModel):
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_log_date: Optional[str] = None
    total_days_logged: int = 0
    streak_updated_at: datetime = Field(default_factory=datetime.utcnow)

# Analytics Models
class WeeklyAnalytics(BaseModel):
    week_start: str
    week_end: str
    avg_calories: float
    avg_protein: float
    days_logged: int
    goal_adherence: float
    total_entries: int

class MonthlyAnalytics(BaseModel):
    month: str
    year: int
    avg_calories: float
    avg_protein: float
    days_logged: int
    goal_adherence: float
    total_entries: int
    weight_change: Optional[float] = None


# Authentication Utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserProfile(**user)


# Utility Functions
def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
    if gender.lower() == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    return bmr


def calculate_daily_calories(user: UserProfile) -> float:
    """Calculate total daily calorie needs"""
    bmr = calculate_bmr(user.weight_kg, user.height_cm, user.age, user.gender)
    
    activity_multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extremely_active": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(user.activity_level, 1.2)
    
    # Adjust based on goal
    if user.goal == "lose":
        return tdee * 0.85  # 15% deficit
    elif user.goal == "gain":
        return tdee * 1.15  # 15% surplus
    else:
        return tdee


def calculate_daily_protein(user: UserProfile) -> float:
    """Calculate daily protein needs (1.6-2.2g per kg body weight)"""
    if user.goal == "gain":
        return user.weight_kg * 2.0  # Higher for muscle gain
    else:
        return user.weight_kg * 1.8  # Standard for maintenance/loss


async def analyze_food_image(image_base64: str) -> dict:
    """Analyze food image using OpenAI GPT-4o Vision"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert nutritionist specializing in Indian cuisine. Analyze the food image and provide detailed nutritional information.

Focus on identifying Indian dishes, regional specialties, and traditional cooking methods that affect nutritional content.

Return ONLY a valid JSON object with this exact structure:
{
  "food_name": "Name of the dish",
  "calories_per_100g": 150.0,
  "protein_per_100g": 8.5,
  "carbs_per_100g": 20.0,
  "fat_per_100g": 5.0,
  "estimated_portion_g": 200.0,
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of identification and portion estimation"
}

Be accurate with Indian food nutritional values. Consider cooking oil, ghee, and traditional preparation methods."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this Indian food image and provide detailed nutritional information. Focus on accurate calorie and protein content."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500,
            temperature=0.1
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean the response to extract JSON
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        try:
            analysis = json.loads(content)
            return analysis
        except json.JSONDecodeError:
            # Fallback parsing
            return {
                "food_name": "Unknown Indian Dish",
                "calories_per_100g": 200.0,
                "protein_per_100g": 10.0,
                "carbs_per_100g": 25.0,
                "fat_per_100g": 8.0,
                "estimated_portion_g": 150.0,
                "confidence": "low",
                "reasoning": "Unable to analyze image clearly"
            }
            
    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        return {
            "food_name": "Unknown Indian Dish",
            "calories_per_100g": 200.0,
            "protein_per_100g": 10.0,
            "carbs_per_100g": 25.0,
            "fat_per_100g": 8.0,
            "estimated_portion_g": 150.0,
            "confidence": "low",
            "reasoning": f"API Error: {str(e)}"
        }


# Achievement System Functions
async def initialize_achievements():
    """Initialize default achievements in the database"""
    achievements = [
        # Streak Achievements
        {"name": "First Steps", "description": "Log your first meal", "badge_icon": "🌟", 
         "category": "milestone", "requirement_type": "days_logged", "requirement_value": 1, 
         "points": 10, "rarity": "bronze"},
        
        {"name": "Three Day Warrior", "description": "Maintain a 3-day logging streak", "badge_icon": "🔥", 
         "category": "streak", "requirement_type": "streak_count", "requirement_value": 3, 
         "points": 25, "rarity": "bronze"},
         
        {"name": "Week Champion", "description": "Maintain a 7-day logging streak", "badge_icon": "⭐", 
         "category": "streak", "requirement_type": "streak_count", "requirement_value": 7, 
         "points": 50, "rarity": "silver"},
         
        {"name": "Consistency Master", "description": "Maintain a 30-day logging streak", "badge_icon": "👑", 
         "category": "streak", "requirement_type": "streak_count", "requirement_value": 30, 
         "points": 200, "rarity": "gold"},
         
        {"name": "Streak Legend", "description": "Maintain a 100-day logging streak", "badge_icon": "💎", 
         "category": "streak", "requirement_type": "streak_count", "requirement_value": 100, 
         "points": 500, "rarity": "platinum"},
         
        # Protein Achievements
        {"name": "Protein Seeker", "description": "Meet protein goal for 3 days", "badge_icon": "💪", 
         "category": "protein", "requirement_type": "protein_days", "requirement_value": 3, 
         "points": 30, "rarity": "bronze"},
         
        {"name": "Protein Pro", "description": "Meet protein goal for 7 days", "badge_icon": "🏋️", 
         "category": "protein", "requirement_type": "protein_days", "requirement_value": 7, 
         "points": 75, "rarity": "silver"},
         
        {"name": "Protein Beast", "description": "Meet protein goal for 30 days", "badge_icon": "🦬", 
         "category": "protein", "requirement_type": "protein_days", "requirement_value": 30, 
         "points": 250, "rarity": "gold"},
         
        # Consistency Achievements  
        {"name": "Dedicated Logger", "description": "Log meals for 50 total days", "badge_icon": "📝", 
         "category": "consistency", "requirement_type": "days_logged", "requirement_value": 50, 
         "points": 100, "rarity": "silver"},
         
        {"name": "Nutrition Explorer", "description": "Log 100 different meals", "badge_icon": "🍽️", 
         "category": "milestone", "requirement_type": "unique_foods", "requirement_value": 100, 
         "points": 150, "rarity": "gold"},
    ]
    
    for achievement_data in achievements:
        # Check if achievement already exists
        existing = await db.achievements.find_one({"name": achievement_data["name"]})
        if not existing:
            achievement = Achievement(**achievement_data)
            await db.achievements.insert_one(achievement.dict())


async def update_user_streaks(user_id: str, log_date: str):
    """Update user streak information when they log food"""
    today = dt.date.today().isoformat()
    
    # Get current streak info
    streak_data = await db.user_streaks.find_one({"user_id": user_id})
    
    if not streak_data:
        # Initialize streak data
        streak_data = UserStreaks(user_id=user_id, current_streak=1, longest_streak=1, 
                                 last_log_date=today, total_days_logged=1)
    else:
        streak = UserStreaks(**streak_data)
        
        # Check if this is a new day
        if streak.last_log_date != today:
            yesterday = (dt.date.today() - timedelta(days=1)).isoformat()
            
            if streak.last_log_date == yesterday:
                # Continue streak
                streak.current_streak += 1
            else:
                # Streak broken, restart
                streak.current_streak = 1
            
            # Update longest streak
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
                
            streak.total_days_logged += 1
            streak.last_log_date = today
            streak.streak_updated_at = datetime.utcnow()
        
        streak_data = streak.dict()
    
    # Save to database
    await db.user_streaks.update_one(
        {"user_id": user_id}, 
        {"$set": streak_data}, 
        upsert=True
    )
    
    return streak_data


async def check_and_unlock_achievements(user_id: str):
    """Check if user has unlocked any new achievements"""
    # Get user's current achievements
    user_achievements = await db.user_achievements.find({"user_id": user_id}).to_list(1000)
    unlocked_achievement_ids = [ua["achievement_id"] for ua in user_achievements]
    
    # Get user streak and stats
    streak_data = await db.user_streaks.find_one({"user_id": user_id})
    if not streak_data:
        return []
    
    # Get all achievements
    all_achievements = await db.achievements.find().to_list(1000)
    newly_unlocked = []
    
    for achievement in all_achievements:
        if achievement["id"] in unlocked_achievement_ids:
            continue  # Already unlocked
            
        # Check if requirements are met
        req_type = achievement["requirement_type"]
        req_value = achievement["requirement_value"]
        
        unlocked = False
        
        if req_type == "days_logged" and streak_data["total_days_logged"] >= req_value:
            unlocked = True
        elif req_type == "streak_count" and streak_data["current_streak"] >= req_value:
            unlocked = True
        elif req_type == "protein_days":
            # Count days user met protein goals (simplified for MVP)
            protein_days = await count_protein_goal_days(user_id)
            if protein_days >= req_value:
                unlocked = True
        
        if unlocked:
            # Unlock achievement
            user_achievement = UserAchievement(
                user_id=user_id,
                achievement_id=achievement["id"],
                progress_when_unlocked=streak_data
            )
            await db.user_achievements.insert_one(user_achievement.dict())
            newly_unlocked.append(achievement)
    
    return newly_unlocked


async def count_protein_goal_days(user_id: str) -> int:
    """Count how many days user has met their protein goal"""
    # Get user profile for protein calculation
    user = await db.users.find_one({"id": user_id})
    if not user:
        return 0
    
    user_profile = UserProfile(**user)
    daily_protein_goal = calculate_daily_protein(user_profile)
    
    # Aggregate daily protein totals
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$date",
            "total_protein": {"$sum": "$total_protein"}
        }},
        {"$match": {"total_protein": {"$gte": daily_protein_goal * 0.9}}}  # 90% of goal
    ]
    
    result = await db.food_entries.aggregate(pipeline).to_list(1000)
    return len(result)


# Analytics Functions
async def get_weekly_analytics(user_id: str, weeks_back: int = 4):
    """Get weekly analytics for the user"""
    end_date = dt.date.today()
    analytics = []
    
    for i in range(weeks_back):
        week_start = end_date - timedelta(days=end_date.weekday() + (7 * i))
        week_end = week_start + timedelta(days=6)
        
        # Get food entries for this week
        entries = await db.food_entries.find({
            "user_id": user_id,
            "date": {"$gte": week_start.isoformat(), "$lte": week_end.isoformat()}
        }).to_list(1000)
        
        if entries:
            total_calories = sum(entry["total_calories"] for entry in entries)
            total_protein = sum(entry["total_protein"] for entry in entries)
            days_logged = len(set(entry["date"] for entry in entries))
            
            weekly_data = WeeklyAnalytics(
                week_start=week_start.isoformat(),
                week_end=week_end.isoformat(),
                avg_calories=round(total_calories / max(days_logged, 1), 1),
                avg_protein=round(total_protein / max(days_logged, 1), 1),
                days_logged=days_logged,
                goal_adherence=round((days_logged / 7) * 100, 1),
                total_entries=len(entries)
            )
            analytics.append(weekly_data)
    
    return analytics


async def get_monthly_analytics(user_id: str, months_back: int = 6):
    """Get monthly analytics for the user"""
    analytics = []
    
    for i in range(months_back):
        # Calculate month start/end
        today = dt.date.today()
        if i == 0:
            month_start = today.replace(day=1)
            month_end = today
        else:
            # Previous months
            if today.month - i <= 0:
                month = 12 + (today.month - i)
                year = today.year - 1
            else:
                month = today.month - i
                year = today.year
            
            month_start = dt.date(year, month, 1)
            # Get last day of month
            if month == 12:
                month_end = dt.date(year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = dt.date(year, month + 1, 1) - timedelta(days=1)
        
        # Get food entries for this month
        entries = await db.food_entries.find({
            "user_id": user_id,
            "date": {"$gte": month_start.isoformat(), "$lte": month_end.isoformat()}
        }).to_list(1000)
        
        if entries:
            total_calories = sum(entry["total_calories"] for entry in entries)
            total_protein = sum(entry["total_protein"] for entry in entries)
            days_logged = len(set(entry["date"] for entry in entries))
            days_in_month = (month_end - month_start).days + 1
            
            monthly_data = MonthlyAnalytics(
                month=month_start.strftime("%B"),
                year=month_start.year,
                avg_calories=round(total_calories / max(days_logged, 1), 1),
                avg_protein=round(total_protein / max(days_logged, 1), 1),
                days_logged=days_logged,
                goal_adherence=round((days_logged / days_in_month) * 100, 1),
                total_entries=len(entries)
            )
            analytics.append(monthly_data)
    
    return analytics


# API Routes

# Authentication Routes
@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserSignup):
    """Create a new user account"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user profile
    user_dict = user_data.dict()
    del user_dict["password"]
    user_dict["password_hash"] = password_hash
    
    user_obj = UserProfile(**user_dict)
    await db.users.insert_one(user_obj.dict())
    
    # Initialize achievements
    await initialize_achievements()
    
    # Create access token
    access_token = create_access_token(data={"sub": user_obj.id})
    
    # Return response without password hash
    user_response = user_obj.dict()
    del user_response["password_hash"]
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Return response without password hash
    user_response = user.copy()
    del user_response["password_hash"]
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@api_router.get("/")
async def root():
    return {"message": "Indian Food Calorie Tracker API v2.0"}


@api_router.get("/auth/me")
async def get_current_user_info(current_user: UserProfile = Depends(get_current_user)):
    """Get current user information"""
    user_dict = current_user.dict()
    del user_dict["password_hash"]
    return user_dict


# User Profile Routes (now protected)
@api_router.get("/users/{user_id}", response_model=UserProfile)
async def get_user(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get user profile by ID"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)


@api_router.put("/users/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, user_update: UserProfileCreate, current_user: UserProfile = Depends(get_current_user)):
    """Update user profile"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = user_update.dict()
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserProfile(**updated_user)


# Food Analysis and Logging (now protected)
@api_router.post("/analyze-food")
async def analyze_food(file: UploadFile = File(...), current_user: UserProfile = Depends(get_current_user)):
    """Analyze food image and return nutritional information"""
    try:
        # Read and encode image
        image_data = await file.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Analyze with OpenAI
        analysis = await analyze_food_image(image_base64)
        
        # Calculate totals based on portion
        total_calories = (analysis['calories_per_100g'] * analysis['estimated_portion_g']) / 100
        total_protein = (analysis['protein_per_100g'] * analysis['estimated_portion_g']) / 100
        
        return {
            **analysis,
            "total_calories": round(total_calories, 1),
            "total_protein": round(total_protein, 1),
            "image_base64": image_base64
        }
        
    except Exception as e:
        logger.error(f"Food analysis error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@api_router.post("/food-entries", response_model=FoodEntry)
async def log_food(
    user_id: str = Form(...),
    food_name: str = Form(...),
    calories_per_100g: float = Form(...),
    protein_per_100g: float = Form(...),
    carbs_per_100g: Optional[float] = Form(None),
    fat_per_100g: Optional[float] = Form(None),
    estimated_portion_g: float = Form(...),
    total_calories: float = Form(...),
    total_protein: float = Form(...),
    image_base64: Optional[str] = Form(None),
    analysis_confidence: Optional[str] = Form(None),
    current_user: UserProfile = Depends(get_current_user)
):
    """Log a food entry"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    food_entry = FoodEntry(
        user_id=user_id,
        food_name=food_name,
        calories_per_100g=calories_per_100g,
        protein_per_100g=protein_per_100g,
        carbs_per_100g=carbs_per_100g,
        fat_per_100g=fat_per_100g,
        estimated_portion_g=estimated_portion_g,
        total_calories=total_calories,
        total_protein=total_protein,
        image_base64=image_base64,
        analysis_confidence=analysis_confidence
    )
    
    await db.food_entries.insert_one(food_entry.dict())
    
    # Update streaks and check achievements
    await update_user_streaks(user_id, food_entry.date)
    newly_unlocked = await check_and_unlock_achievements(user_id)
    
    # Add achievement notifications to response
    response = food_entry.dict()
    response["newly_unlocked_achievements"] = newly_unlocked
    
    return response


@api_router.get("/users/{user_id}/food-entries")
async def get_user_food_entries(user_id: str, date_filter: Optional[str] = None, current_user: UserProfile = Depends(get_current_user)):
    """Get food entries for a user, optionally filtered by date"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"user_id": user_id}
    
    if date_filter:
        try:
            # Validate date format
            datetime.strptime(date_filter, "%Y-%m-%d")
            query["date"] = date_filter
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    entries = await db.food_entries.find(query).sort("logged_at", -1).to_list(100)
    return [FoodEntry(**entry) for entry in entries]


@api_router.get("/users/{user_id}/daily-stats")
async def get_daily_stats(user_id: str, date_filter: Optional[str] = None, current_user: UserProfile = Depends(get_current_user)):
    """Get daily nutritional stats for a user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get user profile
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_profile = UserProfile(**user)
    
    # Calculate recommended values
    recommended_calories = calculate_daily_calories(user_profile)
    recommended_protein = calculate_daily_protein(user_profile)
    
    # Get today's date or specified date
    target_date = dt.date.today().isoformat()
    if date_filter:
        try:
            # Validate date format
            datetime.strptime(date_filter, "%Y-%m-%d")
            target_date = date_filter
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get food entries for the date
    entries = await db.food_entries.find({
        "user_id": user_id,
        "date": target_date
    }).to_list(100)
    
    # Calculate totals
    total_calories = sum(entry['total_calories'] for entry in entries)
    total_protein = sum(entry['total_protein'] for entry in entries)
    
    return DailyStats(
        date=target_date,
        total_calories=round(total_calories, 1),
        total_protein=round(total_protein, 1),
        recommended_calories=round(recommended_calories, 1),
        recommended_protein=round(recommended_protein, 1),
        calorie_goal_met=total_calories >= recommended_calories * 0.9,
        protein_goal_met=total_protein >= recommended_protein * 0.9
    )


# Streak and Achievement Routes
@api_router.get("/users/{user_id}/streaks")
async def get_user_streaks(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get user streak information"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    streak_data = await db.user_streaks.find_one({"user_id": user_id})
    if not streak_data:
        return UserStreaks(user_id=user_id).dict()
    return UserStreaks(**streak_data).dict()


@api_router.get("/users/{user_id}/achievements")
async def get_user_achievements(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get user's unlocked achievements"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user_achievements = await db.user_achievements.find({"user_id": user_id}).to_list(1000)
    
    # Get achievement details
    achievement_details = []
    for ua in user_achievements:
        achievement = await db.achievements.find_one({"id": ua["achievement_id"]})
        if achievement:
            achievement_details.append({
                **achievement,
                "unlocked_at": ua["unlocked_at"]
            })
    
    return achievement_details


@api_router.get("/achievements")
async def get_all_achievements(current_user: UserProfile = Depends(get_current_user)):
    """Get all available achievements"""
    achievements = await db.achievements.find().to_list(1000)
    return achievements


# Analytics Routes
@api_router.get("/users/{user_id}/analytics/weekly")
async def get_user_weekly_analytics(user_id: str, weeks: int = 4, current_user: UserProfile = Depends(get_current_user)):
    """Get weekly analytics for user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = await get_weekly_analytics(user_id, weeks)
    return analytics


@api_router.get("/users/{user_id}/analytics/monthly")
async def get_user_monthly_analytics(user_id: str, months: int = 6, current_user: UserProfile = Depends(get_current_user)):
    """Get monthly analytics for user"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = await get_monthly_analytics(user_id, months)
    return analytics


@api_router.get("/users/{user_id}/analytics/summary")
async def get_analytics_summary(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Get overall analytics summary"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get streak data
    streak_data = await db.user_streaks.find_one({"user_id": user_id})
    
    # Get total entries
    total_entries = await db.food_entries.count_documents({"user_id": user_id})
    
    # Get achievements count
    total_achievements = await db.user_achievements.count_documents({"user_id": user_id})
    
    # Get this month's data
    today = dt.date.today()
    month_start = today.replace(day=1).isoformat()
    
    monthly_entries = await db.food_entries.find({
        "user_id": user_id,
        "date": {"$gte": month_start}
    }).to_list(1000)
    
    monthly_calories = sum(entry["total_calories"] for entry in monthly_entries)
    monthly_protein = sum(entry["total_protein"] for entry in monthly_entries)
    
    return {
        "current_streak": streak_data.get("current_streak", 0) if streak_data else 0,
        "longest_streak": streak_data.get("longest_streak", 0) if streak_data else 0,
        "total_days_logged": streak_data.get("total_days_logged", 0) if streak_data else 0,
        "total_entries": total_entries,
        "total_achievements": total_achievements,
        "this_month_entries": len(monthly_entries),
        "this_month_calories": round(monthly_calories, 1),
        "this_month_protein": round(monthly_protein, 1)
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()