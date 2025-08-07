function escapeMarkdown(text) {
  if (!text) return '';

  const escapeCharacters = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

  return text
    .split('')
    .map((char) => (escapeCharacters.includes(char) ? `\\${char}` : char))
    .join('');
}

module.exports = { escapeMarkdown };
