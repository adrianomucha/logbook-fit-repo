/**
 * "Flag + message coach" sends the exercise context twice on purpose: as
 * reference ids the chat turns into an exercise card, and as plain lines at
 * the top of the text so the coach still sees it where no card renders
 * (push notifications, email, older builds). Chat views that do draw the
 * card strip those lines back out, or the context reads twice in one bubble.
 */

const FLAG_MARK = "🚩";

export function buildFlagMessageContent({
  exerciseName,
  prescription,
  setsCompleted,
  totalSets,
  flagNote,
  question,
}: {
  exerciseName: string;
  prescription: string;
  setsCompleted: number;
  totalSets: number;
  flagNote?: string | null;
  question: string;
}): string {
  const contextLine = `${FLAG_MARK} ${exerciseName} · ${prescription} · ${setsCompleted}/${totalSets} sets done`;
  const note = flagNote?.trim();
  const body = question.trim() || `I have a question about ${exerciseName}`;
  return `${contextLine}${note ? `\n“${note}”` : ""}\n\n${body}`;
}

/**
 * The message text minus the context lines buildFlagMessageContent put on
 * top. Only call it when the card is being shown. Text that doesn't start
 * with the flag line comes back unchanged.
 */
export function stripFlagContext(content: string): string {
  if (!content.startsWith(FLAG_MARK)) return content;
  const lines = content.split("\n");
  lines.shift(); // "🚩 Name · 3x 12 · 3/3 sets done"
  if (lines[0]?.trim().startsWith("“")) lines.shift(); // the quoted flag note
  const rest = lines.join("\n").trim();
  // Never render an empty bubble: fall back to the original if that was all
  return rest || content;
}
