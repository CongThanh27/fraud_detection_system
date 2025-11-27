
# Project Overview `fraud_service_main`

## Goal
FastAPI service for real-time and batch transaction fraud scoring, ML model integration (logs from MLflow), explanation provisioning, and batch job support, training scripts, and JWT authentication system that manages users/tokens right in the database.

## Directory tree (shortened)
```
fraud_service_main/
├── app/
│ ├── __init__.py
│ ├── api.py # Declare FastAPI routes (scoring, auth, health)
│ ├── auth.py # JWT logic: password hashing, token issuance/revocation, dependency
│ ├── batch_job.py # Batch scoring, write results to DB
│ ├── config.py # Read environment variables into dataclass Settings
│ ├── database.py # Create SQLAlchemy engine, session, helper get_db
│ ├── explain.py # Generate explanation (feature importance) for transaction
│ ├── model_io.py # Load model and artifacts (local/MLflow)
│ ├── models_auth.py # ORM table auth_users & auth_tokens
│ ├── preprocess.py # Clean, encode, align input data
│ └── scoring.py # Calculate scores/assign decisions based on model
├── artifacts/ # Save artifacts (encoder, schema, threshold) in use
├── data/
│ ├── fraud_seqs.csv # List of fraud seqs used for fetch script
│ └── sql.py # SQL to get training data (nonfraud/fraud)
├── migrations/
│ ├── 001_create_fraud_tables.sql # Create tables fraud_scores & fraud_explanations
│ └── 002_create_auth_tables.sql # Create tables auth_users & auth_tokens
├── models/ # Directory containing exported models
├── scripts/
│ ├── fetch_window.py # Get data by time window for training
│ ├── retrain_rolling_mlflow.py# Rolling retrain and auto-promote model
│ └── train_and_export_mlflow.py # Train and log model to MLflow
├── utils/
│ └── common.py # Common utility function
├── README.md
├── docker-compose.yml
├── requirements.txt
└── tomtat.md
```