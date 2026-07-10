from app import create_app
from app.extensions import db
from app.models import User, Transaction
from datetime import date, datetime

def add_sample_data():
    app = create_app()
    with app.app_context():
        # Get the demo user
        user = User.query.filter_by(email="demo@creditiq.com").first()
        if not user:
            print("Demo user not found!")
            return
        
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
    add_sample_data()
