from app import create_app
from app.extensions import db
from app.models import User, Transaction
from datetime import date, datetime
from werkzeug.security import generate_password_hash

def create_demo_user_and_data():
    app = create_app()
    with app.app_context():
        # Create demo user if not exists
        user = User.query.filter_by(email="demo@credit.ai").first()
        if not user:
            user = User(
                name="Demo User",
                email="demo@credit.ai",
                password_hash=generate_password_hash("password123")
            )
            db.session.add(user)
            db.session.commit()
            print("Created demo user!")
        else:
            print("Demo user already exists!")
        
        # Check if transactions already exist
        existing_tx = Transaction.query.filter_by(user_id=user.id).first()
        if existing_tx:
            print("Sample transactions already exist!")
            return
        
        # Add sample transactions
        transactions = [
            Transaction(
                user_id=user.id,
                amount=50000,
                type="income",
                category="Salary",
                tx_date=date(2024, 1, 1),
                description="Monthly salary"
            ),
            Transaction(
                user_id=user.id,
                amount=12000,
                type="expense",
                category="Food",
                tx_date=date(2024, 1, 5),
                description="Groceries and dining"
            ),
            Transaction(
                user_id=user.id,
                amount=8000,
                type="expense",
                category="Travel",
                tx_date=date(2024, 1, 10),
                description="Weekend trip"
            ),
            Transaction(
                user_id=user.id,
                amount=5000,
                type="expense",
                category="Shopping",
                tx_date=date(2024, 1, 15),
                description="Clothes and accessories"
            ),
            Transaction(
                user_id=user.id,
                amount=3000,
                type="expense",
                category="Food",
                tx_date=date(2024, 1, 20),
                description="Restaurant meals"
            ),
            Transaction(
                user_id=user.id,
                amount=2000,
                type="expense",
                category="Other",
                tx_date=date(2024, 1, 25),
                description="Miscellaneous expenses"
            )
        ]
        
        for tx in transactions:
            db.session.add(tx)
        
        db.session.commit()
        print(f"Added {len(transactions)} sample transactions for demo user!")

if __name__ == "__main__":
    create_demo_user_and_data()
