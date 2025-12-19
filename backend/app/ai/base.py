"""Base LLM client interface for AI agents (Phase 7).

This module defines the abstract interface for LLM providers.
Concrete implementations (OpenAI, Anthropic, etc.) should be added
as separate modules.
"""

from abc import ABC, abstractmethod
from typing import Optional


class LLMClient(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate text completion from prompt.
        
        Args:
            prompt: User prompt text
            system_message: Optional system message/instructions
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            
        Returns:
            Generated text response
            
        Raises:
            Exception: If LLM call fails
        """
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if LLM provider is configured and available."""
        pass


class MockLLMClient(LLMClient):
    """
    Mock LLM client for development/testing.
    
    Returns a simple template response without calling any LLM API.
    Useful for testing agent logic without API costs.
    """

    async def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.7,
    ) -> str:
        """Return a mock response indicating the agent would generate text here."""
        return (
            "[Mock LLM Response] This is a placeholder response. "
            "Configure a real LLM provider (OpenAI, Anthropic, etc.) "
            "to generate actual explanations."
        )

    async def is_available(self) -> bool:
        """Mock client is always 'available' for testing."""
        return True

