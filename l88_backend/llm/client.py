"""
LLM client — thin Ollama wrapper via langchain_ollama.

GPU primary (qwen2.5-7b-awq), CPU fallback (qwen2.5:14b).
Sets num_ctx=16384 on every call to override Ollama's default of 4096.
Singleton _llm instance reused across all calls to avoid repeated instantiation.
"""

from langchain_ollama import ChatOllama

from l88_backend.config import LLM_MODEL, LLM_TEMPERATURE, LLM_NUM_CTX


_llm = ChatOllama(
    model=LLM_MODEL,
    temperature=LLM_TEMPERATURE,
    num_ctx=LLM_NUM_CTX,
)

def call_llm(prompt: str, model: str | None = None) -> str:
    """
    Send a prompt to Ollama and return the raw response string.

    Args:
        prompt: The full prompt text.
        model: Ollama model name. Defaults to config.LLM_MODEL.

    Returns:
        The LLM's response as a plain string.
    """
    llm = _llm if model is None else ChatOllama(
        model=model,
        temperature=LLM_TEMPERATURE,
        num_ctx=LLM_NUM_CTX,
    )
    response = llm.invoke(prompt)
    return response.content
