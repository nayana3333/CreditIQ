import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def train_and_save_model():
    """Train Random Forest model and save it"""
    
    # Load dataset (you'll need to update this path)
    # For now, let's create synthetic data based on the notebook analysis
    np.random.seed(42)
    
    # Create synthetic dataset matching the structure from notebook
    n_samples = 1000
    data = []
    
    for i in range(n_samples):
        age = np.random.randint(25, 55)
        gender = np.random.choice([0, 1])  # 0=Female, 1=Male
        income = np.random.randint(25000, 150000)
        education = np.random.choice([0, 1, 2, 3, 4])  # 0=High School, 4=Doctorate
        marital_status = np.random.choice([0, 1])  # 0=Single, 1=Married
        children = np.random.randint(0, 4)
        home_ownership = np.random.choice([0, 1])  # 0=Rented, 1=Owned
        
        # Credit score logic based on features
        base_score = 650
        if income > 80000:
            base_score += 100
        if education >= 3:  # Bachelor's or higher
            base_score += 50
        if home_ownership == 1:  # Owned
            base_score += 30
        if marital_status == 1:  # Married
            base_score += 20
            
        # Add some noise
        credit_score = base_score + np.random.normal(0, 50)
        credit_score = np.clip(credit_score, 300, 900)
        
        # Classify credit score
        if credit_score >= 750:
            credit_class = 2  # High
        elif credit_score >= 600:
            credit_class = 1  # Average
        else:
            credit_class = 0  # Low
            
        data.append([age, gender, income, education, marital_status, children, home_ownership, credit_class])
    
    # Create DataFrame
    df = pd.DataFrame(data, columns=['Age', 'Gender', 'Income', 'Education', 'Marital Status', 'Number of Children', 'Home Ownership', 'Credit Score'])
    
    # Features and target
    X = df.drop('Credit Score', axis=1)
    y = df['Credit Score']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Train Random Forest
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )
    
    rf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = rf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Random Forest Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = rf.feature_importances_
    features = X.columns
    importance_df = pd.DataFrame({'feature': features, 'importance': feature_importance})
    importance_df = importance_df.sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(importance_df)
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'random_forest_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(rf, f)
    
    print(f"\nModel saved to: {model_path}")
    
    return rf, accuracy

if __name__ == "__main__":
    train_and_save_model()
