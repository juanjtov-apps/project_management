/**
 * Highlights search term in text
 * @param text - The text to search in
 * @param searchTerm - The term to highlight
 * @returns JSX with highlighted matches
 */
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800 font-medium"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
