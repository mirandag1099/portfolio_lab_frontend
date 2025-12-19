"""Planner Agent - Scenario framing (Phase 7.3).

This agent helps users think about hypothetical scenarios using
neutral, conditional language. It does not predict outcomes or
recommend actions.

The agent:
- Only reads backend API outputs
- Uses conditional language ("if X were to occur", "historically...")
- Never predicts returns or specific outcomes
- Never suggests trades or optimizations
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
    """Load the planner prompt template from file."""
    prompt_path = Path(__file__).parent / "prompts" / "planner.md"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Prompt template not found at {prompt_path}")
        raise BadRequestError("Planner agent prompt template not found")


def format_portfolio_data_for_planner(performance_data: Dict[str, Any]) -> str:
    """Format portfolio performance data for planner LLM prompt.

    Focuses on characteristics relevant to scenario framing:
    returns, volatility, drawdowns, and basic holdings context.
    """
    portfolio = performance_data.get("portfolio", {})
    metrics = performance_data.get("metrics", {})

    lines = [
        "## Portfolio Characteristics for Scenario Framing",
        "",
        "**Holdings (for style / sector context):**",
    ]

    holdings = portfolio.get("holdings", [])
    if holdings:
        for holding in holdings:
            ticker = holding.get("ticker", "N/A")
            weight = holding.get("weight", 0.0)
            lines.append(f"  - {ticker}: {weight:.1%}")
    else:
        lines.append("  - No holdings data available")

    lines.extend(
        [
            "",
            f"**Date Range:** {portfolio.get('start_date', 'N/A')} to {portfolio.get('end_date', 'N/A')}",
            f"**Currency:** {portfolio.get('currency', 'N/A')}",
            "",
            "**Key Metrics:**",
        ]
    )

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

    return "\n".join(lines)


def format_factor_data_for_planner(factor_data: Dict[str, Any]) -> str:
    """Format factor analysis data for planner LLM prompt.

    Focuses on factor tilts relevant to scenario framing:
    market, size (SMB), and value (HML) exposures.
    """
    lines = [
        "",
        "## Factor Exposures for Scenario Framing",
        "",
    ]

    factor_loadings = factor_data.get("factor_loadings", {})
    if factor_loadings:
        market_beta = factor_loadings.get("market_beta", {})
        smb_beta = factor_loadings.get("smb_beta", {})
        hml_beta = factor_loadings.get("hml_beta", {})

        if market_beta or smb_beta or hml_beta:
            lines.append("**Factor Loadings:**")

        if market_beta:
            lines.append(
                f"  - Market Beta: {market_beta.get('value', 0):.3f} "
                f"(t-stat: {market_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {market_beta.get('p_value', 0):.4f})"
            )

        if smb_beta:
            lines.append(
                f"  - SMB Beta (size tilt): {smb_beta.get('value', 0):.3f} "
                f"(t-stat: {smb_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {smb_beta.get('p_value', 0):.4f})"
            )

        if hml_beta:
            lines.append(
                f"  - HML Beta (value tilt): {hml_beta.get('value', 0):.3f} "
                f"(t-stat: {hml_beta.get('t_statistic', 0):.2f}, "
                f"p-value: {hml_beta.get('p_value', 0):.4f})"
            )

    regression_stats = factor_data.get("regression_statistics", {})
    if regression_stats:
        lines.extend(
            [
                "",
                "**Regression Statistics (for context, not prediction):**",
                f"  - R-squared: {regression_stats.get('r_squared', 0):.4f}",
                f"  - Adjusted R-squared: {regression_stats.get('adjusted_r_squared', 0):.4f}",
                f"  - Number of Observations: {regression_stats.get('num_observations', 0)}",
            ]
        )

    return "\n".join(lines)


def check_sufficient_data_for_planner(
    performance_data: Optional[Dict[str, Any]],
    factor_data: Optional[Dict[str, Any]],
) -> tuple[bool, Optional[str]]:
    """Check if sufficient data is available for scenario framing."""
    if not performance_data:
        return False, "Portfolio performance data is required but not provided"

    metrics = performance_data.get("metrics", {})
    if not metrics:
        return False, "Portfolio metrics are missing from performance data"

    # For scenario framing, we want at least volatility or drawdown context.
    has_volatility = "annualized_volatility" in metrics
    has_drawdown = "max_drawdown" in metrics

    if not (has_volatility or has_drawdown):
        return (
            False,
            "At least one risk metric (volatility or drawdown) is required "
            "to frame hypothetical scenarios",
        )

    return True, None


class PlannerAgent:
    """Planner Agent - Frames hypothetical scenarios (non-predictive).

    This agent uses backend-computed metrics to describe how portfolios
    *like this* have behaved historically under different conditions,
    using strictly conditional and historical language.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """Initialize Planner Agent."""
        self.llm_client = llm_client or MockLLMClient()
        self.prompt_template = load_prompt_template()

    async def frame_scenarios(
        self,
        performance_data: Dict[str, Any],
        factor_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate hypothetical scenario framing for a portfolio.

        Args:
            performance_data: Portfolio performance API response data
            factor_data: Optional factor analysis API response data

        Returns:
            Scenario framing text using conditional, historical language

        Raises:
            BadRequestError: If insufficient data or LLM unavailable
        """
        # Check data sufficiency
        is_sufficient, reason = check_sufficient_data_for_planner(
            performance_data, factor_data
        )
        if not is_sufficient:
            logger.warning(f"Insufficient data for planner: {reason}")
            return (
                "Insufficient data to frame hypothetical scenarios. "
                f"{reason}. Please ensure portfolio performance data "
                "includes at least volatility or drawdown metrics."
            )

        # Check LLM availability
        if not await self.llm_client.is_available():
            raise BadRequestError(
                "LLM provider is not configured. Set LLM_API_KEY environment variable "
                "or configure an LLM client to enable planner scenario framing."
            )

        # Build prompt
        prompt_parts = [
            self.prompt_template,
            "",
            format_portfolio_data_for_planner(performance_data),
        ]

        if factor_data:
            prompt_parts.append(format_factor_data_for_planner(factor_data))
        else:
            prompt_parts.append(
                "\n## Factor Analysis Data\n\n*No factor analysis data provided.*"
            )

        full_prompt = "\n".join(prompt_parts)

        # Generate scenario framing
        try:
            scenarios = await self.llm_client.generate(
                prompt=full_prompt,
                system_message=(
                    "You are the Planner Agent for PortfolioLab. "
                    "You frame hypothetical scenarios using only backend-computed metrics. "
                    "You always use conditional and historical language "
                    "(e.g., 'if X were to occur', 'historically, portfolios like this have...'). "
                    "You never predict specific outcomes, never recommend trades, "
                    "and never optimize allocations. You always include uncertainty language "
                    "and emphasize that scenarios are hypothetical and non-predictive."
                ),
                max_tokens=2000,
                temperature=0.7,
            )

            logger.info("Planner agent generated scenario framing successfully")
            return scenarios

        except Exception as e:
            logger.error(
                f"Failed to generate planner scenarios: {str(e)}", exc_info=True
            )
            raise BadRequestError(f"Failed to generate planner scenarios: {str(e)}")


