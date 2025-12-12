"""
Generate EDA and preprocessing insights for the admin dashboard.
References the analysis in doc/doc.ipynb and train_and_export_mlflow.py
"""

import logging
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple
import json

LOGGER = logging.getLogger(__name__)

# Data paths
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
NONFRAUD_PATH = DATA_DIR / "transactions.csv"
FRAUD_PATH = DATA_DIR / "is_fraud.csv"


def load_transaction_data() -> pd.DataFrame:
    """Load and merge non-fraud and fraud transaction data."""
    try:
        df_nonfraud = pd.read_csv(NONFRAUD_PATH)
        df_nonfraud["is_fraud"] = False
        
        df_fraud = pd.read_csv(FRAUD_PATH)
        df_fraud["is_fraud"] = True
        
        df = pd.concat([df_nonfraud, df_fraud], ignore_index=True)
        df = df.drop_duplicates(subset=["transaction_seq"], keep="first").reset_index(drop=True)
        
        # Fill missing categorical values
        string_cols = df.select_dtypes(include=['object']).columns
        for col in string_cols:
            df[col] = df[col].fillna('Unknown')
        
        LOGGER.info(f"Loaded {len(df):,} transactions")
        return df
    except Exception as e:
        LOGGER.error(f"Error loading transaction data: {e}")
        raise


def calculate_eda_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate exploratory data analysis (EDA) summary statistics."""
    
    # Dataset overview
    dataset_info = {
        "rows": int(len(df)),
        "cols": int(df.shape[1]),
        "sampleColumns": list(df.columns[:5]),  # First 5 column names
    }
    
    # Label distribution
    label_dist = df["is_fraud"].value_counts().to_dict()
    label_distribution = [
        {"label": "Non-Fraud", "count": int(label_dist.get(False, 0)), "value": "NO_FRAUD"},
        {"label": "Fraud", "count": int(label_dist.get(True, 0)), "value": "FRAUD"},
    ]
    
    # Missing rates
    missing_rates = []
    missing_data = df.isna().sum()
    for col, count in missing_data[missing_data > 0].items():
        missing_rates.append({
            "column": str(col),
            "missing_count": int(count),
            "missing_pct": float(count / len(df) * 100)
        })
    missing_rates = sorted(missing_rates, key=lambda x: x["missing_pct"], reverse=True)
    
    # Deposit amount analysis
    amount_histogram = []
    try:
        amounts = pd.to_numeric(df["deposit_amount"], errors='coerce').dropna()
        counts, bins = np.histogram(amounts, bins=30)
        for i, count in enumerate(counts):
            amount_histogram.append({
                "bin": f"${bins[i]:,.0f}-${bins[i+1]:,.0f}",
                "count": int(count),
                "is_fraud_count": int(df[(df["deposit_amount"] >= bins[i]) & 
                                         (df["deposit_amount"] < bins[i+1]) & 
                                         (df["is_fraud"] == True)].shape[0])
            })
    except Exception as e:
        LOGGER.warning(f"Error calculating amount histogram: {e}")
    
    # Payment methods
    payment_methods = []
    if "payment_method" in df.columns:
        df["payment_method_filled"] = df["payment_method"].fillna("Unknown")
        payment_summary = df.groupby("payment_method_filled")["transaction_seq"].count().sort_values(ascending=False)
        for method, count in payment_summary.head(10).items():
            fraud_count = int(df[(df["payment_method_filled"] == method) & (df["is_fraud"] == True)].shape[0])
            payment_methods.append({
                "method": str(method),
                "count": int(count),
                "fraud_count": fraud_count,
                "fraud_rate": float(fraud_count / count * 100) if count > 0 else 0
            })
    
    # Country distribution
    country_distribution = []
    if "receiving_country" in df.columns:
        country_summary = df.groupby("receiving_country")["transaction_seq"].count().sort_values(ascending=False)
        for country, count in country_summary.head(10).items():
            fraud_count = int(df[(df["receiving_country"] == country) & (df["is_fraud"] == True)].shape[0])
            country_distribution.append({
                "country": str(country),
                "count": int(count),
                "fraud_count": fraud_count,
                "fraud_rate": float(fraud_count / count * 100) if count > 0 else 0
            })
    
    # Hourly distribution (if datetime exists)
    hourly_distribution = []
    if "create_dt" in df.columns:
        try:
            df["create_dt_parsed"] = pd.to_datetime(df["create_dt"], errors='coerce')
            df["hour"] = df["create_dt_parsed"].dt.hour
            hourly_summary = df.groupby("hour")["transaction_seq"].count()
            for hour in range(24):
                count = int(hourly_summary.get(hour, 0))
                fraud_count = int(df[(df["hour"] == hour) & (df["is_fraud"] == True)].shape[0])
                hourly_distribution.append({
                    "hour": int(hour),
                    "count": count,
                    "fraud_count": fraud_count
                })
        except Exception as e:
            LOGGER.warning(f"Error calculating hourly distribution: {e}")
    
    # Correlation pairs (numeric columns)
    corr_pairs = []
    try:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        numeric_cols = [c for c in numeric_cols if c not in ["transaction_seq", "user_seq"]][:5]  # Top 5
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            for i, col1 in enumerate(numeric_cols):
                for col2 in numeric_cols[i+1:]:
                    corr_value = float(corr_matrix.loc[col1, col2])
                    if abs(corr_value) > 0.3:  # Only significant correlations
                        corr_pairs.append({
                            "col1": str(col1),
                            "col2": str(col2),
                            "correlation": round(corr_value, 3)
                        })
    except Exception as e:
        LOGGER.warning(f"Error calculating correlations: {e}")
    
    # Calendar analysis
    calendar = {"month": [], "dayOfWeek": [], "dayOfMonth": []}
    if "create_dt" in df.columns:
        try:
            df["create_dt_parsed"] = pd.to_datetime(df["create_dt"], errors='coerce')
            
            # Monthly
            monthly = df.groupby(df["create_dt_parsed"].dt.month)["transaction_seq"].count()
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            for month_num in range(1, 13):
                calendar["month"].append({
                    "month": months[month_num - 1],
                    "count": int(monthly.get(month_num, 0))
                })
            
            # Day of week
            dow_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
            dow_counts = df.groupby(df["create_dt_parsed"].dt.dayofweek)["transaction_seq"].count()
            for dow in range(7):
                calendar["dayOfWeek"].append({
                    "day": dow_map[dow],
                    "count": int(dow_counts.get(dow, 0))
                })
            
            # Day of month
            dom_counts = df.groupby(df["create_dt_parsed"].dt.day)["transaction_seq"].count()
            for day in range(1, 32):
                calendar["dayOfMonth"].append({
                    "day": day,
                    "count": int(dom_counts.get(day, 0))
                })
        except Exception as e:
            LOGGER.warning(f"Error calculating calendar analysis: {e}")
    
    return {
        "dataset": dataset_info,
        "labelDistribution": label_distribution,
        "paymentMethods": payment_methods,
        "countryDistribution": country_distribution,
        "hourlyDistribution": hourly_distribution,
        "amountHistogram": amount_histogram,
        "missingRates": missing_rates,
        "calendar": calendar,
        "corrPairs": corr_pairs,
    }


def calculate_preprocessing_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate preprocessing pipeline summary statistics."""
    
    # Amount clipping stats (from train_and_export_mlflow.py logic)
    clipping_stats = {}
    amount_cols = [c for c in df.columns if 'amount' in c.lower()]
    
    for col in amount_cols:
        try:
            series = pd.to_numeric(df[col], errors='coerce')
            if series.notna().sum() == 0:
                continue
            
            q1, q3 = series.quantile([0.25, 0.75])
            iqr = q3 - q1
            upper = q3 + 1.5 * iqr
            lower = max(q1 - 1.5 * iqr, 0)
            
            clipped_series = series.clip(lower=lower, upper=upper)
            
            clipping_stats[col] = {
                "original_min": float(series.min()),
                "original_max": float(series.max()),
                "original_mean": float(series.mean()),
                "clipped_min": float(clipped_series.min()),
                "clipped_max": float(clipped_series.max()),
                "clipped_mean": float(clipped_series.mean()),
                "lower_bound": float(lower),
                "upper_bound": float(upper),
                "values_clipped": int((series != clipped_series).sum())
            }
        except Exception as e:
            LOGGER.warning(f"Error clipping {col}: {e}")
    
    # Categorical encoding preview
    maybe_cats = ["receiving_country", "country_code", "id_type", "stay_qualify", "payment_method"]
    categorical_encoding = []
    for cat_col in maybe_cats:
        if cat_col in df.columns:
            unique_values = df[cat_col].nunique()
            top_values = df[cat_col].value_counts().head(5).to_dict()
            categorical_encoding.append({
                "column": cat_col,
                "unique_count": int(unique_values),
                "top_values": [
                    {"value": str(k), "count": int(v)} 
                    for k, v in top_values.items()
                ]
            })
    
    # Scaling preview (mean and std for numeric columns)
    scaling_preview = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c not in ["transaction_seq", "user_seq"]][:10]
    
    for col in numeric_cols:
        try:
            series = pd.to_numeric(df[col], errors='coerce').dropna()
            if series.notna().sum() == 0:
                continue
            
            scaling_preview.append({
                "column": str(col),
                "original_mean": float(series.mean()),
                "original_std": float(series.std()),
                "scaled_mean": 0.0,  # After StandardScaler
                "scaled_std": 1.0,   # After StandardScaler
                "min_value": float(series.min()),
                "max_value": float(series.max()),
            })
        except Exception as e:
            LOGGER.warning(f"Error scaling stats for {col}: {e}")
    
    # Pipeline stages (from train_and_export_mlflow.py)
    pipeline_shape = [
        {
            "stage": "Load",
            "columns": int(df.shape[1]),
            "rows": int(df.shape[0]),
            "description": "Raw transaction data"
        },
        {
            "stage": "Clean",
            "columns": int(df.shape[1]),
            "rows": int(df.shape[0]),
            "description": "Fill missing categorical values"
        },
        {
            "stage": "Clip Amount",
            "columns": int(df.shape[1]),
            "rows": int(df.shape[0]),
            "description": f"IQR clipping on {len(amount_cols)} amount columns"
        },
        {
            "stage": "Feature Eng",
            "columns": int(df.shape[1]) + 5,  # Adding ~5 engineered features
            "rows": int(df.shape[0]),
            "description": "Datetime features + account metrics"
        },
        {
            "stage": "Encode & Scale",
            "columns": int(df.shape[1]) + 5 + len(maybe_cats) * 2,  # One-hot encoding
            "rows": int(df.shape[0]),
            "description": "OneHot encode categoricals, StandardScale numerics"
        }
    ]
    
    # Feature engineering details
    engineered_features = [
        {
            "name": "account_age",
            "type": "numeric",
            "description": "Days since account registration",
            "source": "register_date"
        },
        {
            "name": "user_seniority",
            "type": "numeric",
            "description": "Days since first transaction",
            "source": "first_transaction_date"
        },
        {
            "name": "time_to_activate",
            "type": "numeric",
            "description": "Days from registration to first transaction",
            "source": "register_date + first_transaction_date"
        },
        {
            "name": "amount_type",
            "type": "categorical",
            "description": "Categorize amounts into low/medium/high ranges",
            "source": "deposit_amount"
        },
        {
            "name": "create_dt_is_night",
            "type": "boolean",
            "description": "Transaction occurred between 20:00-06:00",
            "source": "create_dt"
        },
        {
            "name": "country_mismatch",
            "type": "boolean",
            "description": "User country vs receiving country mismatch",
            "source": "country_code + receiving_country"
        }
    ]
    
    # Engineered feature distributions
    engineered_distributions = []
    if "create_dt" in df.columns:
        try:
            df["create_dt_parsed"] = pd.to_datetime(df["create_dt"], errors='coerce')
            df["create_dt_hour"] = df["create_dt_parsed"].dt.hour
            df["is_night"] = (df["create_dt_hour"] >= 20) | (df["create_dt_hour"] < 6)
            
            night_count = int(df["is_night"].sum())
            engineered_distributions.append({
                "feature": "create_dt_is_night",
                "night_transactions": night_count,
                "day_transactions": int(df.shape[0] - night_count),
                "night_fraud_rate": float(
                    df[df["is_night"]]["is_fraud"].mean() * 100
                ) if night_count > 0 else 0
            })
        except Exception as e:
            LOGGER.warning(f"Error calculating night feature: {e}")
    
    return {
        "clippingStats": clipping_stats,
        "categoricalEncoding": categorical_encoding,
        "scalingPreview": scaling_preview,
        "pipelineShape": pipeline_shape,
        "engineeredFeatures": engineered_features,
        "engineeredDistributions": engineered_distributions,
    }


def get_insights_summary() -> Dict[str, Any]:
    """Generate complete insights summary for the admin dashboard."""
    try:
        df = load_transaction_data()
        
        eda_summary = calculate_eda_summary(df)
        preprocessing_summary = calculate_preprocessing_summary(df)
        
        return {
            "success": True,
            "eda": eda_summary,
            "preprocessing": preprocessing_summary,
            "generated_at": pd.Timestamp.now().isoformat(),
            "data_rows": int(len(df)),
        }
    except Exception as e:
        LOGGER.error(f"Error generating insights: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "eda": None,
            "preprocessing": None,
        }
