"""
Utility script to manage user roles in the fraud detection system.
This script helps with creating users with specific roles and updating roles.

Usage:
    python -m scripts.manage_roles create_user <username> <password> [--role admin|user]
    python -m scripts.manage_roles set_role <username> <role>
    python -m scripts.manage_roles list_users
"""

import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.database import get_db, get_engine
from app.models_auth import AuthUser


def create_user(username: str, password: str, role: str = "user") -> None:
    """Create a new user with specified role."""
    if role not in ("admin", "user"):
        print(f"Error: Invalid role '{role}'. Must be 'admin' or 'user'.")
        return
    
    engine = get_engine()
    with Session(engine) as db:
        # Check if user exists
        stmt = select(AuthUser).where(AuthUser.username == username)
        if db.execute(stmt).scalar_one_or_none():
            print(f"Error: User '{username}' already exists.")
            return
        
        # Validate password
        password_bytes = password.encode("utf-8")
        if len(password_bytes) > 72:
            print("Error: Password is too long (maximum 72 bytes when UTF-8 encoded).")
            return
        
        # Create user
        new_user = AuthUser(
            username=username,
            password_hash=hash_password(password),
            role=role,
        )
        db.add(new_user)
        db.commit()
        print(f"✓ User '{username}' created with role '{role}'")


def set_role(username: str, role: str) -> None:
    """Update user's role."""
    if role not in ("admin", "user"):
        print(f"Error: Invalid role '{role}'. Must be 'admin' or 'user'.")
        return
    
    engine = get_engine()
    with Session(engine) as db:
        stmt = select(AuthUser).where(AuthUser.username == username)
        user = db.execute(stmt).scalar_one_or_none()
        
        if not user:
            print(f"Error: User '{username}' not found.")
            return
        
        user.role = role
        db.commit()
        print(f"✓ User '{username}' role updated to '{role}'")


def list_users() -> None:
    """List all users and their roles."""
    engine = get_engine()
    with Session(engine) as db:
        stmt = select(AuthUser).order_by(AuthUser.id)
        users = db.execute(stmt).scalars().all()
        
        if not users:
            print("No users found.")
            return
        
        print(f"\n{'ID':<5} {'Username':<20} {'Role':<10} {'Active':<8} {'Created':<20}")
        print("-" * 70)
        for user in users:
            print(f"{user.id:<5} {user.username:<20} {user.role:<10} {str(user.is_active):<8} {str(user.created_at):<20}")
        print()


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "create_user":
        if len(sys.argv) < 4:
            print("Usage: create_user <username> <password> [--role admin|user]")
            sys.exit(1)
        
        username = sys.argv[2]
        password = sys.argv[3]
        role = "user"
        
        if len(sys.argv) > 5 and sys.argv[4] == "--role":
            role = sys.argv[5]
        
        create_user(username, password, role)
    
    elif command == "set_role":
        if len(sys.argv) < 4:
            print("Usage: set_role <username> <role>")
            sys.exit(1)
        
        username = sys.argv[2]
        role = sys.argv[3]
        set_role(username, role)
    
    elif command == "list_users":
        list_users()
    
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
