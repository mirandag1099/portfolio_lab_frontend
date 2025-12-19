"""Analyst Agent - Explains past portfolio performance (Phase 7.1).

This agent interprets backend-computed portfolio metrics and factor analysis
to provide plain-English explanations of historical performance.

The agent:
- Only reads backend API outputs
- Never predicts returns
- Never suggests trades
- Always includes uncertainty language
- Says "insufficient data" when needed
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from app.ai.base import LLMClient, MockLLMClient
from app.core.exceptions import BadRequestError
from app.core.logging import get_logger

logger = get_logger(__name__)


def load_prompt_template() -> str:
    """Load the analyst prompt template from file."""
    prompt_path = Path(__file__).parent / "prompts" / "analyst.md"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Prompt template not found at {prompt_path}")
        raise BadRequestError("Analyst agent prompt template not found")


def format_portfolio_data(performance_data: Dict[str, Any]) -> str:
    """
    Format portfolio performance data for LLM prompt.
    
    Args:
        performance_data: Portfolio performance API response data
        
    Returns:
        Formatted string representation
    """
    portfolio = performance_data.get("portfolio", {})
    metrics = performance_data.get("metrics", {})
    returns = performance_data.get("returns", {})
    
    lines = [
        "## Portfolio Performance Data",
        "",
        f"**Portfolio Holdings:**",
    ]
    
    holdings = portfolio.get("holdings", [])
    for holding in holdings:
        ticker = holding.get("ticker", "N/A")
        weight = holding.get("weight", 0.0)
        lines.append(f"  - {ticker}: {weight:.1%}")
    
    lines.extend([
        "",
        f"**Date Range:** {portfolio.get('start_date', 'N/A')} to {portfolio.get('end_date', 'N/A')}",
        f"**Currency:** {portfolio.get('currency', 'N/A')}",
        "",
        "**Computed Metrics:**",
    ])
    
    if "cumulative_return" in metrics:
        lines.append(f"  - Cumulative Return: {metrics['cumulative_return']:.2%}")
    if "cagr" in metrics:
        lines.append(f"  - CAGR: {metrics['cagr']:.2%}")
    if "annualized_volatility" in metrics:
        lines.append(f"  - Annualized Volatility: {metrics['annualized_volatility']:.2%}")
    if "max_drawdown" in metrics:
        lines.append(f"  - Maximum Drawdown: {metrics['max_drawdown']:.2%}")
    if "sharpe_ratio" in metrics:
        lines.append(f"  - Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
    
    benchmark = portfolio.get("benchmark")
    if benchmark:
        lines.append(f"**Benchmark:** {benchmark}")
        benchmark_returns = returns.get("benchmark_returns")
        if benchmark_returns:
            lines.append("  - Benchmark returns data available")
    
    return "\n".join(lines)


def format_factor_data(factor_data: Dict[str, Any]) -> str:
    """
    Format factor analysis data for LLM prompt.
    
    Args:
        factor_data: Factor analysis API response data
        
    Returns:
        Formatted string representation
    """
    lines = [
        "",
        "## Factor Analysis Data",
        "",
    ]
    
    alpha = factor_data.get("alpha", {})
    if alpha:
        lines.extend([
            "**Alpha (excess return not explained by factors):**",
            f"  - Daily Alpha: {alpha.get('value', 0):.6f}",
            f"  - Annualized Alpha: {alpha.get('annualized', 0):.2%}",
            f"  - t-statistic: {alpha.get('t_statistic', 0):.2f}",
            f"  - p-value: {alpha.get('p_value', 0):.4f}",
            "",
        ])
    
    factor_loadings = factor_data.get("factor_loadings", {})
    if factor_loadings:
        lines.append("**Factor Loadings:**")
        
        market_beta = factor_loadings.get("market_beta", {})
        if market_beta:
            lines.append(
                f"  - Market Beta: {market_beta.get('value', 0):.3f} "
                f"(t-stat: {market_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {market_beta.get('p_value', 0):.4f})"
            )
        
        smb_beta = factor_loadings.get("smb_beta", {})
        if smb_beta:
            lines.append(
                f"  - SMB Beta (size): {smb_beta.get('value', 0):.3f} "
                f"(t-stat: {smb_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {smb_beta.get('p_value', 0):.4f})"
            )
        
        hml_beta = factor_loadings.get("hml_beta", {})
        if hml_beta:
            lines.append(
                f"  - HML Beta (value): {hml_beta.get('value', 0):.3f} "
                f"(t-stat: {hml_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {hml_beta.get('p_value', 0):.4f})"
            )
    
    regression_stats = factor_data.get("regression_statistics", {})
    if regression_stats:
        lines.extend([
            "",
            "**Regression Statistics:**",
            f"  - R-squared: {regression_stats.get('r_squared', 0):.4f}",
            f"  - Adjusted R-squared: {regression_stats.get('adjusted_r_squared', 0):.4f}",
            f"  - Number of Observations: {regression_stats.get('num_observations', 0)}",
        ])
    
    return "\n".join(lines)


def check_sufficient_data(
    performance_data: Optional[Dict[str, Any]],
    factor_data: Optional[Dict[str, Any]],
) -> tuple[bool, Optional[str]]:
    """
    Check if sufficient data is available for analysis.
    
    Args:
        performance_data: Portfolio performance data
        factor_data: Optional factor analysis data
        
    Returns:
        Tuple of (is_sufficient, reason_if_insufficient)
    """
    if not performance_data:
        return False, "Portfolio performance data is required but not provided"
    
    metrics = performance_data.get("metrics", {})
    if not metrics:
        return False, "Portfolio metrics are missing from performance data"
    
    # At minimum, need returns or key metrics
    required_metrics = ["cumulative_return", "cagr"]
    missing = [m for m in required_metrics if m not in metrics]
    
    if missing:
        return False, f"Required metrics missing: {', '.join(missing)}"
    
    return True, None


class AnalystAgent:
    """
    Analyst Agent - Explains past portfolio performance.
    
    This agent reads backend-computed portfolio metrics and factor analysis
    to generate plain-English explanations of historical performance.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize Analyst Agent.
        
        Args:
            llm_client: LLM client instance (defaults to MockLLMClient if not provided)
        """
        self.llm_client = llm_client or MockLLMClient()
        self.prompt_template = load_prompt_template()

    async def explain_performance(
        self,
        performance_data: Dict[str, Any],
        factor_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate explanation of past portfolio performance.
        
        Args:
            performance_data: Portfolio performance API response data
            factor_data: Optional factor analysis API response data
            
        Returns:
            Plain-English explanation of portfolio performance
            
        Raises:
            BadRequestError: If insufficient data is provided
        """
        # Check data sufficiency
        is_sufficient, reason = check_sufficient_data(performance_data, factor_data)
        if not is_sufficient:
            logger.warning(f"Insufficient data for analyst: {reason}")
            return (
                f"Insufficient data to provide analysis. {reason}. "
                "Please ensure portfolio performance data is available and contains "
                "required metrics (cumulative_return, cagr)."
            )
        
        # Check LLM availability
        if not await self.llm_client.is_available():
            raise BadRequestError(
                "LLM provider is not configured. Set LLM_API_KEY environment variable "
                "or configure an LLM client to enable analyst explanations."
            )
        
        # Build prompt
        prompt_parts = [
            self.prompt_template,
            "",
            format_portfolio_data(performance_data),
        ]
        
        if factor_data:
            prompt_parts.append(format_factor_data(factor_data))
        else:
            prompt_parts.append(
                "\n## Factor Analysis Data\n\n*No factor analysis data provided.*"
            )
        
        full_prompt = "\n".join(prompt_parts)
        
        # Generate explanation
        try:
            explanation = await self.llm_client.generate(
                prompt=full_prompt,
                system_message=(
                    "You are the Analyst Agent for PortfolioLab. "
                    "You explain past portfolio performance using only backend-computed metrics. "
                    "You never predict returns or suggest trades. "
                    "You always include uncertainty language and acknowledge data limitations."
                ),
                max_tokens=1500,
                temperature=0.7,
            )
            
            logger.info("Analyst agent generated explanation successfully")
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate analyst explanation: {str(e)}", exc_info=True)
            raise BadRequestError(f"Failed to generate analyst explanation: {str(e)}")

