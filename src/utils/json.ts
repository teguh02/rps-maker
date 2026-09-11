/**
 * Strip markdown code fences, thinking tags, and other non-JSON wrapper
 * from AI model responses. Returns clean JSON string ready for JSON.parse().
 */
export function cleanAiJson(text: string): string {
  let s = text.trim()
  // Strip Qwen thinking tokens
  s = s.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  // Strip code fences: ```json ... ``` or ``` ... ```
  const fencePattern = /(\x60\x60\x60(?:json)?\s*\n?)([\s\S]*?)(\n?\s*\x60\x60\x60)/
  const fenceMatch = s.match(fencePattern)
  if (fenceMatch) s = fenceMatch[2].trim()
  return s
}
