"""Train XGBoost stress model. Run once before starting server."""
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

def generate_data(n=8000):
    np.random.seed(42)
    return pd.DataFrame({
        'leave_anomaly': np.random.uniform(0, 1, n),
        'career_index': np.random.uniform(0, 1, n),
        'hrv': np.random.randint(20, 80, n),
        'heart_rate': np.random.randint(60, 110, n),
        'sleep_hours': np.random.uniform(3, 9, n),
        'self_report': np.random.randint(1, 11, n),
        'family_separation': np.random.randint(0, 2, n),
        'grievance': np.random.randint(0, 2, n),
    })

def main():
    df = generate_data()
    stress = (
        df['leave_anomaly'] * 2.0
        + (1 - df['career_index']) * 1.5
        + (80 - df['hrv']) / 40
        + df['self_report'] * 0.4
        + df['family_separation'] * 1.2
        + df['grievance'] * 1.3
        + (8 - df['sleep_hours']) * 0.3
        - 5.0
    )
    df['label'] = (stress > 3.5).astype(int)

    X, y = df.drop('label', axis=1), df['label']
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.9, colsample_bytree=0.9,
        eval_metric='logloss', use_label_encoder=False, random_state=42
    )
    model.fit(Xtr, ytr)
    acc = accuracy_score(yte, model.predict(Xte))
    print(f"✅ Model accuracy: {acc*100:.2f}%")
    print(classification_report(yte, model.predict(Xte)))
    joblib.dump(model, 'stress_model.pkl')
    print("💾 Saved stress_model.pkl")

if __name__ == "__main__":
    main()