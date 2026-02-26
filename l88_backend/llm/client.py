"""
LLM client — thin Ollama wrapper via langchain_ollama.

GPU primary (qwen2.5-7b-awq), CPU fallback (qwen2.5:14b).
Singleton _llm instance reused across all calls to avoid repeated instantiation.
Small num_ctx for analyzer/rewriter, full 16384 for generator.
"""

from langchain_ollama import ChatOllama

from l88_backend.config import LLM_MODEL, LLM_TEMPERATURE, LLM_NUM_CTX

_llm = ChatOllama(
    model=LLM_MODEL,
    temperature=LLM_TEMPERATURE,
    num_ctx=LLM_NUM_CTX,
)

_llm_small = ChatOllama(
    model=LLM_MODEL,
    temperature=LLM_TEMPERATURE,
    num_ctx=2048,
)


def call_llm(prompt: str, model: str | None = None, small_ctx: bool = False) -> str:
    """
    Send a prompt to Ollama and return the raw response string.

    Args:
        prompt: The full prompt text.
        model: Ollama model name. Defaults to config.LLM_MODEL.
        small_ctx: If True, uses 2048 context window. For short prompts
                   like analyzer and rewriter where 16384 is wasteful.

    Returns:
        The LLM's response as a plain string.
    """
    if model is not None:
        llm = ChatOllama(
            model=model,
            temperature=LLM_TEMPERATURE,
            num_ctx=LLM_NUM_CTX,
        )
    elif small_ctx:
        llm = _llm_small
    else:
        llm = _llm

    response = llm.invoke(prompt)
    return response.content