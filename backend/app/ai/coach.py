"""Coach Agent - Structured reflection on risk tolerance and alignment (Phase 7.4).

This agent helps users reflect on their portfolio's alignment with their
risk tolerance, drawdown comfort, and time horizon. It asks questions
to prompt self-reflection; it does not provide answers or recommendations.

The agent:
- Only reads backend API outputs
- Asks questions, never gives answers
- Never implies superiority of outcomes
- Never suggests performance chasing
- Always includes uncertainty language
- Says "insufficient data" when needed
"""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.ai.base import LLMClient, MockLLMClient
from app.core.exceptions import BadRequestError
from app.core.logging import get_logger

logger = get_logger(__name__)


def load_prompt_template() -> str:
    """Load the coach prompt template from file."""
    prompt_path = Path(__file__).parent / "prompts" / "coach.md"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Prompt template not found at {prompt_path}")
        raise BadRequestError("Coach agent prompt template not found")


def format_portfolio_data_for_coaching(performance_data: Dict[str, Any]) -> str:
    """
    Format portfolio performance data for coach LLM prompt.
    
    Focuses on metrics relevant to risk tolerance, drawdown comfort, and time horizon.
    
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
        "## Portfolio Performance Data for Reflection",
        "",
        "**Portfolio Holdings:**",
    ]
    
    holdings = portfolio.get("holdings", [])
    if holdings:
        for holding in holdings:
            ticker = holding.get("ticker", "N/A")
            weight = holding.get("weight", 0.0)
            lines.append(f"  - {ticker}: {weight:.1%}")
    else:
        lines.append("  - No holdings data available")
    
    # Calculate time horizon
    start_date_str = portfolio.get("start_date", "")
    end_date_str = portfolio.get("end_date", "")
    duration_note = ""
    if start_date_str and end_date_str:
        try:
            start = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            delta = end - start
            days = delta.days
            years = days / 365.25
            if years >= 1:
                duration_note = f" ({years:.1f} years)"
            else:
                duration_note = f" ({days} days)"
        except Exception:
            pass
    
    lines.extend([
        "",
        f"**Date Range:** {start_date_str} to {end_date_str}{duration_note}",
        f"**Currency:** {portfolio.get('currency', 'N/A')}",
        "",
        "**Metrics Relevant to Risk Tolerance and Alignment:**",
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
    
    # Include metadata for context
    alignment = metadata.get("alignment", {})
    if alignment:
        lines.extend([
            "",
            "**Analysis Context:**",
            f"  - Total Trading Days: {alignment.get('total_trading_days', 'N/A')}",
            f"  - Aligned Start Date: {alignment.get('aligned_start_date', 'N/A')}",
            f"  - Aligned End Date: {alignment.get('aligned_end_date', 'N/A')}",
        ])
    
    return "\n".join(lines)


def format_factor_data_for_coaching(factor_data: Dict[str, Any]) -> str:
    """
    Format factor analysis data for coach LLM prompt.
    
    Focuses on factor exposures relevant to investment philosophy reflection.
    
    Args:
        factor_data: Factor analysis API response data
        
    Returns:
        Formatted string representation
    """
    lines = [
        "",
        "## Factor Analysis Data for Reflection",
        "",
    ]
    
    factor_loadings = factor_data.get("factor_loadings", {})
    if factor_loadings:
        lines.append("**Factor Exposures (for investment philosophy reflection):**")
        
        market_beta = factor_loadings.get("market_beta", {})
        if market_beta:
            beta_value = market_beta.get("value", 0)
            lines.append(f"  - Market Beta: {beta_value:.3f}")
        
        smb_beta = factor_loadings.get("smb_beta", {})
        if smb_beta:
            beta_value = smb_beta.get("value", 0)
            size_tilt = "small-cap tilt" if beta_value > 0.2 else "large-cap tilt" if beta_value < -0.2 else "neutral size exposure"
            lines.append(f"  - SMB Beta (size): {beta_value:.3f} ({size_tilt})")
        
        hml_beta = factor_loadings.get("hml_beta", {})
        if hml_beta:
            beta_value = hml_beta.get("value", 0)
            value_tilt = "value tilt" if beta_value > 0.2 else "growth tilt" if beta_value < -0.2 else "neutral value/growth exposure"
            lines.append(f"  - HML Beta (value): {beta_value:.3f} ({value_tilt})")
    
    return "\n".join(lines)


def check_sufficient_data_for_coaching(
    performance_data: Optional[Dict[str, Any]],
    factor_data: Optional[Dict[str, Any]],
) -> tuple[bool, Optional[str]]:
    """
    Check if sufficient data is available for coaching reflection.
    
    Args:
        performance_data: Portfolio performance data
        factor_data: Optional factor analysis data
        
    Returns:
        Tuple of (is_sufficient, reason_if_insufficient)
    """
    if not performance_data:
        return False, "Portfolio performance data is required but not provided"
    
    portfolio = performance_data.get("portfolio", {})
    if not portfolio:
        return False, "Portfolio data is missing from performance data"
    
    metrics = performance_data.get("metrics", {})
    if not metrics:
        return False, "Portfolio metrics are missing from performance data"
    
    # Need at least volatility or drawdown for risk tolerance reflection
    has_volatility = "annualized_volatility" in metrics
    has_drawdown = "max_drawdown" in metrics
    
    if not (has_volatility or has_drawdown):
        return False, "At least one risk metric (volatility or drawdown) is required for reflection questions"
    
    return True, None


class CoachAgent:
    """
    Coach Agent - Structured reflection on risk tolerance and alignment.
    
    This agent helps users reflect on their portfolio's alignment with their
    risk tolerance, drawdown comfort, and time horizon. It asks questions
    to prompt self-reflection; it does not provide answers or recommendations.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize Coach Agent.
        
        Args:
            llm_client: LLM client instance (defaults to MockLLMClient if not provided)
        """
        self.llm_client = llm_client or MockLLMClient()
        self.prompt_template = load_prompt_template()

    async def prompt_reflection(
        self,
        performance_data: Dict[str, Any],
        factor_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate reflective questions for portfolio alignment.
        
        Args:
            performance_data: Portfolio performance API response data
            factor_data: Optional factor analysis API response data
            
        Returns:
            Set of reflective questions about risk tolerance, drawdown comfort, and time horizon alignment
            
        Raises:
            BadRequestError: If insufficient data is provided
        """
        # Check data sufficiency
        is_sufficient, reason = check_sufficient_data_for_coaching(performance_data, factor_data)
        if not is_sufficient:
            logger.warning(f"Insufficient data for coach: {reason}")
            return (
                f"Insufficient data to generate reflection questions. {reason}. "
                "Please ensure portfolio performance data is available and contains "
                "at least one risk metric (volatility or drawdown)."
            )
        
        # Check LLM availability
        if not await self.llm_client.is_available():
            raise BadRequestError(
                "LLM provider is not configured. Set LLM_API_KEY environment variable "
                "or configure an LLM client to enable coach reflection questions."
            )
        
        # Build prompt
        prompt_parts = [
            self.prompt_template,
            "",
            format_portfolio_data_for_coaching(performance_data),
        ]
        
        if factor_data:
            prompt_parts.append(format_factor_data_for_coaching(factor_data))
        else:
            prompt_parts.append(
                "\n## Factor Analysis Data\n\n*No factor analysis data provided.*"
            )
        
        full_prompt = "\n".join(prompt_parts)
        
        # Generate reflection questions
        try:
            reflection_questions = await self.llm_client.generate(
                prompt=full_prompt,
                system_message=(
                    "You are the Coach Agent for PortfolioLab. "
                    "You help users reflect on risk tolerance and alignment using only backend-computed metrics. "
                    "You ask questions, never give answers. "
                    "You never imply that any outcome is superior. "
                    "You never suggest performance chasing. "
                    "You always include uncertainty language and acknowledge data limitations."
                ),
                max_tokens=1500,
                temperature=0.7,
            )
            
            logger.info("Coach agent generated reflection questions successfully")
            return reflection_questions
            
        except Exception as e:
            logger.error(f"Failed to generate coach reflection questions: {str(e)}", exc_info=True)
            raise BadRequestError(f"Failed to generate coach reflection questions: {str(e)}")

