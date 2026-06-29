import React from "react";

interface FormattedTextProps {
  text: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];

  const flushList = (key: string | number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check if the line is a list item starting with "- " or "* "
    const listMatch = line.match(/^(\s*)[-*]\s+(.*)/);
    if (listMatch) {
      const content = listMatch[2];
      currentListItems.push(
        <li key={`li-${index}`} className="text-sm">
          {renderInlineStyles(content)}
        </li>
      );
    } else {
      // If there's an ongoing list, render it before processing the paragraph
      flushList(index);

      if (trimmedLine === "") {
        elements.push(<div key={`empty-${index}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className="text-sm leading-relaxed mb-2">
            {renderInlineStyles(line)}
          </p>
        );
      }
    }
  });

  // Flush any remaining list items at the end of the text
  flushList("final");

  return <div className="formatted-text">{elements}</div>;
};

function renderInlineStyles(text: string): React.ReactNode[] {
  // Regex to split and capture **bold**, *italic*, and [text](url)
  const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}
