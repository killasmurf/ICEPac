"""User service with business logic."""
from datetime import datetime
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.database.user import User
from app.models.schemas.user import UserCreate, UserUpdate, UserPasswordUpdate
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def get(self, user_id: int) -> Optional[User]:
        return self.repository.get(user_id)

    def get_or_404(self, user_id: int) -> User:
        user = self.repository.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def get_by_username(self, username: str) -> Optional[User]:
        return self.repository.get_by_username(username)

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repository.get_multi(skip=skip, limit=limit)

    def count(self) -> int:
        return self.repository.count()

    def create(self, user_in: UserCreate) -> User:
        # Check for duplicates
        if self.repository.get_by_email(user_in.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if self.repository.get_by_username(user_in.username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

        user_data = user_in.model_dump(exclude={"password"})
        user_data["hashed_password"] = get_password_hash(user_in.password)
        return self.repository.create(user_data)

    def update(self, user_id: int, user_in: UserUpdate) -> User:
        user = self.get_or_404(user_id)
        update_data = user_in.model_dump(exclude_unset=True)

        # Check uniqueness if email/username changing
        if "email" in update_data and update_data["email"] != user.email:
            if self.repository.get_by_email(update_data["email"]):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if "username" in update_data and update_data["username"] != user.username:
            if self.repository.get_by_username(update_data["username"]):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

        return self.repository.update(user, update_data)

    def update_password(self, user_id: int, password_update: UserPasswordUpdate) -> User:
        user = self.get_or_404(user_id)
        if not verify_password(password_update.current_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        return self.repository.update(user, {"hashed_password": get_password_hash(password_update.new_password)})

    def delete(self, user_id: int) -> bool:
        self.get_or_404(user_id)
        return self.repository.delete(user_id)

    def authenticate(self, username: str, password: str) -> Optional[User]:
        user = self.repository.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        # Update last login
        self.repository.update(user, {"last_login": datetime.utcnow()})
        return user
