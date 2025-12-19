"""Factor regression engine for portfolio attribution.

This module implements linear regression of portfolio excess returns against
Fama-French factors to compute factor loadings, alpha, and statistical measures.

IMPORTANT: This is descriptive attribution, not forecasting. Alpha must be
reported with uncertainty (t-stats, p-values). Regression results describe
historical relationships only.
"""

import numpy as np
from scipy import stats
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.analytics.factors import AlignedFactorData

logger = get_logger(__name__)

# Minimum observations required for regression
MIN_OBSERVATIONS = 30


class FactorLoadings(BaseModel):
    """Factor loadings (betas) from regression."""

    market_beta: float = Field(..., description="Market factor loading (beta for MKT-RF)")
    smb_beta: float = Field(..., description="SMB factor loading (beta for SMB)")
    hml_beta: float = Field(..., description="HML factor loading (beta for HML)")


class RegressionStatistics(BaseModel):
    """Statistical measures from regression."""

    r_squared: float = Field(
        ...,
        description="R-squared (coefficient of determination), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    adjusted_r_squared: float = Field(
        ...,
        description="Adjusted R-squared (penalizes for degrees of freedom), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    alpha_t_stat: float = Field(..., description="t-statistic for alpha (intercept)")
    alpha_p_value: float = Field(
        ...,
        description="p-value for alpha (two-tailed test), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    market_t_stat: float = Field(..., description="t-statistic for market factor loading")
    market_p_value: float = Field(
        ...,
        description="p-value for market factor (two-tailed test), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    smb_t_stat: float = Field(..., description="t-statistic for SMB factor loading")
    smb_p_value: float = Field(
        ...,
        description="p-value for SMB factor (two-tailed test), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    hml_t_stat: float = Field(..., description="t-statistic for HML factor loading")
    hml_p_value: float = Field(
        ...,
        description="p-value for HML factor (two-tailed test), range [0, 1]",
        ge=0.0,
        le=1.0,
    )


class FactorRegressionResults(BaseModel):
    """Complete factor regression results."""

    alpha: float = Field(
        ...,
        description="Alpha (intercept) - excess return not explained by factors (decimal format, e.g., 0.01 = 1%)",
    )
    factor_loadings: FactorLoadings = Field(..., description="Factor loadings (betas)")
    statistics: RegressionStatistics = Field(..., description="Regression statistics")
    num_observations: int = Field(..., description="Number of observations used in regression", ge=MIN_OBSERVATIONS)
    assumptions: list[str] = Field(..., description="Explicit assumptions made in regression")


def run_factor_regression(aligned_data: AlignedFactorData) -> FactorRegressionResults:
    """
    Run OLS regression of portfolio excess returns against Fama-French factors.
    
    Regression model:
        R_portfolio - RF = alpha + beta_mkt * (MKT - RF) + beta_smb * SMB + beta_hml * HML + error
    
    Where:
        - R_portfolio - RF: Portfolio excess return (portfolio return minus risk-free rate)
        - alpha: Intercept (excess return not explained by factors)
        - beta_mkt: Market factor loading (sensitivity to market excess return)
        - beta_smb: SMB factor loading (sensitivity to small-minus-big)
        - beta_hml: HML factor loading (sensitivity to high-minus-low)
        - error: Residual (unexplained return)
    
    This is descriptive attribution, not forecasting. Alpha and betas describe
    historical relationships only.
    
    Args:
        aligned_data: Aligned portfolio and factor returns
        
    Returns:
        FactorRegressionResults with alpha, loadings, and statistics
        
    Raises:
        ValueError: If insufficient data or regression fails
    """
    matrix = aligned_data.matrix
    
    if len(matrix.dates) < MIN_OBSERVATIONS:
        raise ValueError(
            f"Insufficient data for regression: {len(matrix.dates)} observations, "
            f"minimum {MIN_OBSERVATIONS} required"
        )
    
    logger.info(
        f"Running factor regression",
        extra={
            "num_observations": len(matrix.dates),
            "start_date": str(matrix.dates[0]),
            "end_date": str(matrix.dates[-1]),
        },
    )
    
    # Convert to numpy arrays
    portfolio_returns = np.array(matrix.portfolio_returns)
    market_excess = np.array(matrix.market_excess_returns)
    smb = np.array(matrix.smb_returns)
    hml = np.array(matrix.hml_returns)
    risk_free = np.array(matrix.risk_free_rates)
    
    # Compute portfolio excess returns: R_portfolio - RF
    portfolio_excess = portfolio_returns - risk_free
    
    # Construct regression matrix X: [1, MKT-RF, SMB, HML]
    # Column 0: intercept (ones)
    # Column 1: market excess return
    # Column 2: SMB
    # Column 3: HML
    X = np.column_stack([
        np.ones(len(portfolio_excess)),  # Intercept
        market_excess,  # MKT-RF
        smb,  # SMB
        hml,  # HML
    ])
    
    # Dependent variable: portfolio excess returns
    y = portfolio_excess
    
    # Solve OLS: (X'X)^(-1)X'y
    try:
        # Use numpy's least squares solver
        coefficients, residuals, rank, s = np.linalg.lstsq(X, y, rcond=None)
        
        if rank < X.shape[1]:
            raise ValueError(f"Regression matrix is rank-deficient (rank={rank}, expected {X.shape[1]})")
        
        # Extract coefficients
        alpha = float(coefficients[0])
        beta_mkt = float(coefficients[1])
        beta_smb = float(coefficients[2])
        beta_hml = float(coefficients[3])
        
        # Compute fitted values and residuals
        y_fitted = X @ coefficients
        residuals_array = y - y_fitted
        
        # Compute R-squared
        ss_res = np.sum(residuals_array ** 2)  # Sum of squared residuals
        ss_tot = np.sum((y - np.mean(y)) ** 2)  # Total sum of squares
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        
        # Compute adjusted R-squared
        n = len(y)
        k = X.shape[1] - 1  # Number of predictors (excluding intercept)
        adjusted_r_squared = 1.0 - (1.0 - r_squared) * (n - 1) / (n - k - 1) if (n - k - 1) > 0 else 0.0
        
        # Compute standard errors and t-statistics
        # Standard error of regression (residual standard error)
        mse = ss_res / (n - k - 1) if (n - k - 1) > 0 else 0.0
        se_regression = np.sqrt(mse)
        
        # Covariance matrix of coefficients: (X'X)^(-1) * MSE
        XtX_inv = np.linalg.inv(X.T @ X)
        cov_matrix = XtX_inv * mse
        
        # Standard errors of coefficients
        se_coefficients = np.sqrt(np.diag(cov_matrix))
        
        # t-statistics: coefficient / standard_error
        t_stats = coefficients / se_coefficients
        
        # p-values (two-tailed t-test)
        degrees_of_freedom = n - k - 1
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), degrees_of_freedom))
        
        # Extract statistics for each coefficient
        alpha_t_stat = float(t_stats[0])
        alpha_p_value = float(p_values[0])
        
        market_t_stat = float(t_stats[1])
        market_p_value = float(p_values[1])
        
        smb_t_stat = float(t_stats[2])
        smb_p_value = float(p_values[2])
        
        hml_t_stat = float(t_stats[3])
        hml_p_value = float(p_values[3])
        
        factor_loadings = FactorLoadings(
            market_beta=beta_mkt,
            smb_beta=beta_smb,
            hml_beta=beta_hml,
        )
        
        statistics = RegressionStatistics(
            r_squared=r_squared,
            adjusted_r_squared=adjusted_r_squared,
            alpha_t_stat=alpha_t_stat,
            alpha_p_value=alpha_p_value,
            market_t_stat=market_t_stat,
            market_p_value=market_p_value,
            smb_t_stat=smb_t_stat,
            smb_p_value=smb_p_value,
            hml_t_stat=hml_t_stat,
            hml_p_value=hml_p_value,
        )
        
        assumptions = [
            "Linear relationship between portfolio returns and factors",
            "Factors are exogenous (not correlated with error term)",
            "Homoscedasticity (constant variance of residuals)",
            "No autocorrelation in residuals",
            "Residuals are normally distributed (for t-stats and p-values)",
            "Factors are stationary (mean and variance constant over time)",
            "Regression is descriptive attribution, not forecasting",
            "Alpha represents excess return not explained by factors",
            "Factor loadings represent sensitivity to factor returns",
        ]
        
        logger.info(
            f"Factor regression completed",
            extra={
                "alpha": alpha,
                "market_beta": beta_mkt,
                "smb_beta": beta_smb,
                "hml_beta": beta_hml,
                "r_squared": r_squared,
                "alpha_t_stat": alpha_t_stat,
                "alpha_p_value": alpha_p_value,
            },
        )
        
        return FactorRegressionResults(
            alpha=alpha,
            factor_loadings=factor_loadings,
            statistics=statistics,
            num_observations=n,
            assumptions=assumptions,
        )
        
    except np.linalg.LinAlgError as e:
        logger.error(f"Linear algebra error in regression: {str(e)}", exc_info=True)
        raise ValueError(f"Regression failed due to numerical issues: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in regression: {str(e)}", exc_info=True)
        raise ValueError(f"Regression failed: {str(e)}")

