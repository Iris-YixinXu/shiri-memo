export async function completeDeepSeek(apiKey, messages, maxTokens, timeout = 24000) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-flash",
      thinking: { type: "disabled" },
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(timeout),
    redirect: "error",
  });
  if (!response.ok) return null;
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() || null : null;
}
