"""Auditor Agent - Flags risks and data issues (Phase 7.2).

This agent analyzes backend-computed portfolio metrics to identify:
- Concentration risk
- Volatility risk
- Drawdown severity
- Data quality limitations

The agent:
- Only reads backend API outputs
- Never gives advice or recommendations
- Never suggests optimizations
- Never forecasts risks
- Always includes uncertainty language
- Says "insufficient data" when needed
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from app.ai.base import LLMClient, MockLLMClient
from app.core.exceptions import BadRequestError
from app.core.logging import get_logger

logger = get_logger(__name__)


def load_prompt_template() -> str:
    """Load the auditor prompt template from file."""
    prompt_path = Path(__file__).parent / "prompts" / "auditor.md"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Prompt template not found at {prompt_path}")
        raise BadRequestError("Auditor agent prompt template not found")


def format_portfolio_data_for_audit(performance_data: Dict[str, Any]) -> str:
    """
    Format portfolio performance data for auditor LLM prompt.
    
    Focuses on risk-relevant metrics: holdings, volatility, drawdowns.
    
    Args:
        performance_data: Portfolio performance API response data
        
    Returns:
        Formatted string representation
    """
    portfolio = performance_data.get("portfolio", {})
    metrics = performance_data.get("metrics", {})
    returns = performance_data.get("returns", {})
    metadata = performance_data.get("metadata", {})
    
    lines = [
        "## Portfolio Performance Data for Risk Audit",
        "",
        "**Portfolio Holdings (for concentration analysis):**",
    ]
    
    holdings = portfolio.get("holdings", [])
    if holdings:
        for holding in holdings:
            ticker = holding.get("ticker", "N/A")
            weight = holding.get("weight", 0.0)
            lines.append(f"  - {ticker}: {weight:.1%}")
    else:
        lines.append("  - No holdings data available")
    
    lines.extend([
        "",
        f"**Date Range:** {portfolio.get('start_date', 'N/A')} to {portfolio.get('end_date', 'N/A')}",
        f"**Currency:** {portfolio.get('currency', 'N/A')}",
        "",
        "**Risk-Relevant Metrics:**",
    ])
    
    if "annualized_volatility" in metrics:
        lines.append(f"  - Annualized Volatility: {metrics['annualized_volatility']:.2%}")
    if "max_drawdown" in metrics:
        lines.append(f"  - Maximum Drawdown: {metrics['max_drawdown']:.2%}")
    if "sharpe_ratio" in metrics:
        lines.append(f"  - Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
    if "cagr" in metrics:
        lines.append(f"  - CAGR: {metrics['cagr']:.2%}")
    if "cumulative_return" in metrics:
        lines.append(f"  - Cumulative Return: {metrics['cumulative_return']:.2%}")
    
    benchmark = portfolio.get("benchmark")
    if benchmark:
        lines.append(f"**Benchmark:** {benchmark}")
        benchmark_returns = returns.get("benchmark_returns")
        if benchmark_returns:
            lines.append("  - Benchmark returns data available for comparison")
    
    # Include metadata for data quality assessment
    alignment = metadata.get("alignment", {})
    if alignment:
        lines.extend([
            "",
            "**Data Quality Metadata:**",
            f"  - Total Trading Days: {alignment.get('total_trading_days', 'N/A')}",
            f"  - Aligned Start Date: {alignment.get('aligned_start_date', 'N/A')}",
            f"  - Aligned End Date: {alignment.get('aligned_end_date', 'N/A')}",
        ])
    
    return "\n".join(lines)


def format_factor_data_for_audit(factor_data: Dict[str, Any]) -> str:
    """
    Format factor analysis data for auditor LLM prompt.
    
    Focuses on exposure risks and statistical quality.
    
    Args:
        factor_data: Factor analysis API response data
        
    Returns:
        Formatted string representation
    """
    lines = [
        "",
        "## Factor Analysis Data for Risk Audit",
        "",
    ]
    
    factor_loadings = factor_data.get("factor_loadings", {})
    if factor_loadings:
        lines.append("**Factor Exposures (for risk assessment):**")
        
        market_beta = factor_loadings.get("market_beta", {})
        if market_beta:
            beta_value = market_beta.get("value", 0)
            p_value = market_beta.get("p_value", 1.0)
            lines.append(
                f"  - Market Beta: {beta_value:.3f} "
                f"(p-value: {p_value:.4f}, "
                f"{'statistically significant' if p_value < 0.05 else 'not statistically significant'})"
            )
        
        smb_beta = factor_loadings.get("smb_beta", {})
        if smb_beta:
            beta_value = smb_beta.get("value", 0)
            p_value = smb_beta.get("p_value", 1.0)
            lines.append(
                f"  - SMB Beta (size exposure): {smb_beta.get('value', 0):.3f} "
                f"(p-value: {p_value:.4f}, "
                f"{'statistically significant' if p_value < 0.05 else 'not statistically significant'})"
            )
        
        hml_beta = factor_loadings.get("hml_beta", {})
        if hml_beta:
            beta_value = hml_beta.get("value", 0)
            p_value = hml_beta.get("p_value", 1.0)
            lines.append(
                f"  - HML Beta (value exposure): {hml_beta.get('value', 0):.3f} "
                f"(p-value: {p_value:.4f}, "
                f"{'statistically significant' if p_value < 0.05 else 'not statistically significant'})"
            )
    
    regression_stats = factor_data.get("regression_statistics", {})
    if regression_stats:
        r_squared = regression_stats.get("r_squared", 0)
        num_obs = regression_stats.get("num_observations", 0)
        lines.extend([
            "",
            "**Model Quality (for data quality assessment):**",
            f"  - R-squared: {r_squared:.4f} ({'high' if r_squared > 0.7 else 'moderate' if r_squared > 0.5 else 'low'} explanatory power)",
            f"  - Number of Observations: {num_obs}",
        ])
    
    alpha = factor_data.get("alpha", {})
    if alpha:
        p_value = alpha.get("p_value", 1.0)
        lines.extend([
            "",
            "**Alpha Statistical Quality:**",
            f"  - Alpha p-value: {p_value:.4f} "
            f"({'statistically significant' if p_value < 0.05 else 'not statistically significant'})",
        ])
    
    return "\n".join(lines)


def check_sufficient_data_for_audit(
    performance_data: Optional[Dict[str, Any]],
    factor_data: Optional[Dict[str, Any]],
) -> tuple[bool, Optional[str]]:
    """
    Check if sufficient data is available for risk audit.
    
    Args:
        performance_data: Portfolio performance data
        factor_data: Optional factor analysis data
        
    Returns:
        Tuple of (is_sufficient, reason_if_insufficient)
    """
    if not performance_data:
        return False, "Portfolio performance data is required but not provided"
    
    portfolio = performance_data.get("portfolio", {})
    holdings = portfolio.get("holdings", [])
    if not holdings:
        return False, "Portfolio holdings are required for concentration risk analysis"
    
    metrics = performance_data.get("metrics", {})
    if not metrics:
        return False, "Portfolio metrics are missing from performance data"
    
    # Need at least volatility or drawdown for risk assessment
    has_volatility = "annualized_volatility" in metrics
    has_drawdown = "max_drawdown" in metrics
    
    if not (has_volatility or has_drawdown):
        return False, "At least one risk metric (volatility or drawdown) is required for audit"
    
    return True, None


class AuditorAgent:
    """
    Auditor Agent - Flags risks and data issues.
    
    This agent analyzes backend-computed portfolio metrics to identify:
    - Concentration risk
    - Volatility risk
    - Drawdown severity
    - Data quality limitations
    
    The agent never provides recommendations or advice.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize Auditor Agent.
        
        Args:
            llm_client: LLM client instance (defaults to MockLLMClient if not provided)
        """
        self.llm_client = llm_client or MockLLMClient()
        self.prompt_template = load_prompt_template()

    async def audit_risks(
        self,
        performance_data: Dict[str, Any],
        factor_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate risk audit report for portfolio.
        
        Args:
            performance_data: Portfolio performance API response data
            factor_data: Optional factor analysis API response data
            
        Returns:
            Risk audit report identifying concentration, volatility, drawdown, and data quality issues
            
        Raises:
            BadRequestError: If insufficient data is provided
        """
        # Check data sufficiency
        is_sufficient, reason = check_sufficient_data_for_audit(performance_data, factor_data)
        if not is_sufficient:
            logger.warning(f"Insufficient data for auditor: {reason}")
            return (
                f"Insufficient data to perform risk audit. {reason}. "
                "Please ensure portfolio performance data is available and contains "
                "holdings and at least one risk metric (volatility or drawdown)."
            )
        
        # Check LLM availability
        if not await self.llm_client.is_available():
            raise BadRequestError(
                "LLM provider is not configured. Set LLM_API_KEY environment variable "
                "or configure an LLM client to enable auditor risk analysis."
            )
        
        # Build prompt
        prompt_parts = [
            self.prompt_template,
            "",
            format_portfolio_data_for_audit(performance_data),
        ]
        
        if factor_data:
            prompt_parts.append(format_factor_data_for_audit(factor_data))
        else:
            prompt_parts.append(
                "\n## Factor Analysis Data\n\n*No factor analysis data provided.*"
            )
        
        full_prompt = "\n".join(prompt_parts)
        
        # Generate audit report
        try:
            audit_report = await self.llm_client.generate(
                prompt=full_prompt,
                system_message=(
                    "You are the Auditor Agent for PortfolioLab. "
                    "You flag risks and data quality issues using only backend-computed metrics. "
                    "You never give advice, recommendations, or optimization suggestions. "
                    "You never forecast future risks. "
                    "You always include uncertainty language and acknowledge data limitations."
                ),
                max_tokens=2000,
                temperature=0.7,
            )
            
            logger.info("Auditor agent generated risk audit successfully")
            return audit_report
            
        except Exception as e:
            logger.error(f"Failed to generate auditor risk audit: {str(e)}", exc_info=True)
            raise BadRequestError(f"Failed to generate auditor risk audit: {str(e)}")

