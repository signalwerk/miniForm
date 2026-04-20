import { Fragment, type ReactNode } from "react";

type MarkdownInlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: MarkdownInlineNode[] }
  | { type: "emphasis"; children: MarkdownInlineNode[] }
  | { type: "inlineCode"; value: string }
  | { type: "link"; url: string; children: MarkdownInlineNode[] };

type MarkdownBlockNode =
  | { type: "paragraph"; children: MarkdownInlineNode[] }
  | { type: "heading"; depth: 1 | 2 | 3; children: MarkdownInlineNode[] }
  | { type: "unorderedList"; items: MarkdownInlineNode[][] };

const isBlank = (line: string) => {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== " " && line[index] !== "\t") {
      return false;
    }
  }

  return true;
};

const findChar = (text: string, char: string, start: number) => {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === char) {
      return index;
    }
  }

  return -1;
};

const findClosingDoubleStar = (text: string, start: number) => {
  for (let index = start; index < text.length - 1; index += 1) {
    if (text[index] === "*" && text[index + 1] === "*") {
      return index;
    }
  }

  return -1;
};

const findClosingSingleStar = (text: string, start: number) => {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "*") {
      return index;
    }
  }

  return -1;
};

const parseInlines = (text: string): MarkdownInlineNode[] => {
  let index = 0;
  const nodes: MarkdownInlineNode[] = [];
  let buffer = "";

  const pushText = () => {
    if (!buffer) {
      return;
    }

    nodes.push({
      type: "text",
      value: buffer,
    });
    buffer = "";
  };

  while (index < text.length) {
    if (text[index] === "*" && text[index + 1] === "*") {
      const end = findClosingDoubleStar(text, index + 2);

      if (end !== -1) {
        pushText();
        nodes.push({
          type: "strong",
          children: parseInlines(text.slice(index + 2, end)),
        });
        index = end + 2;
        continue;
      }
    }

    if (text[index] === "*") {
      const end = findClosingSingleStar(text, index + 1);

      if (end !== -1) {
        pushText();
        nodes.push({
          type: "emphasis",
          children: parseInlines(text.slice(index + 1, end)),
        });
        index = end + 1;
        continue;
      }
    }

    if (text[index] === "`") {
      const end = findChar(text, "`", index + 1);

      if (end !== -1) {
        pushText();
        nodes.push({
          type: "inlineCode",
          value: text.slice(index + 1, end),
        });
        index = end + 1;
        continue;
      }
    }

    if (text[index] === "[") {
      const closeLabel = findChar(text, "]", index + 1);

      if (closeLabel !== -1 && text[closeLabel + 1] === "(") {
        const closeUrl = findChar(text, ")", closeLabel + 2);

        if (closeUrl !== -1) {
          pushText();
          nodes.push({
            type: "link",
            url: text.slice(closeLabel + 2, closeUrl),
            children: parseInlines(text.slice(index + 1, closeLabel)),
          });
          index = closeUrl + 1;
          continue;
        }
      }
    }

    buffer += text[index];
    index += 1;
  }

  pushText();
  return nodes;
};

const parseHeading = (line: string): MarkdownBlockNode | null => {
  let depth = 0;
  let index = 0;

  while (index < line.length && line[index] === "#" && depth < 3) {
    depth += 1;
    index += 1;
  }

  if (depth === 0 || line[index] !== " ") {
    return null;
  }

  return {
    type: "heading",
    depth: depth as 1 | 2 | 3,
    children: parseInlines(line.slice(index + 1)),
  };
};

const getUnorderedListItemContent = (line: string): string | null => {
  let index = 0;

  while (index < line.length && (line[index] === " " || line[index] === "\t")) {
    index += 1;
  }

  const marker = line[index];

  if ((marker !== "-" && marker !== "*") || line[index + 1] !== " ") {
    return null;
  }

  return line.slice(index + 2);
};

const isUnorderedListItem = (line: string) =>
  getUnorderedListItemContent(line) !== null;

export const fromMarkdown = (markdown: string): MarkdownBlockNode[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: MarkdownBlockNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const heading = parseHeading(line);

    if (heading) {
      nodes.push(heading);
      index += 1;
      continue;
    }

    if (isUnorderedListItem(line)) {
      const items: MarkdownInlineNode[][] = [];

      while (index < lines.length) {
        const itemContent = getUnorderedListItemContent(lines[index]);

        if (itemContent === null) {
          break;
        }

        const itemLines = [itemContent];
        index += 1;

        while (
          index < lines.length &&
          !isBlank(lines[index]) &&
          !parseHeading(lines[index]) &&
          !isUnorderedListItem(lines[index])
        ) {
          itemLines.push(lines[index].trim());
          index += 1;
        }

        items.push(parseInlines(itemLines.join(" ")));
      }

      nodes.push({
        type: "unorderedList",
        items,
      });

      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      !isBlank(lines[index]) &&
      !parseHeading(lines[index]) &&
      !isUnorderedListItem(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    nodes.push({
      type: "paragraph",
      children: parseInlines(paragraphLines.join(" ")),
    });
  }

  return nodes;
};

const renderInlineNode = (node: MarkdownInlineNode, key: string): ReactNode => {
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{node.value}</Fragment>;
    case "strong":
      return <strong key={key}>{renderInlineNodes(node.children, key)}</strong>;
    case "emphasis":
      return <em key={key}>{renderInlineNodes(node.children, key)}</em>;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "link":
      return (
        <a key={key} href={node.url}>
          {renderInlineNodes(node.children, key)}
        </a>
      );
  }
};

const renderInlineNodes = (nodes: MarkdownInlineNode[], keyPrefix: string) =>
  nodes.map((node, index) => renderInlineNode(node, `${keyPrefix}-${index}`));

export const renderMarkdown = (markdown: string, keyPrefix = "md") =>
  fromMarkdown(markdown).map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "heading":
        if (node.depth === 1) {
          return <h1 key={key}>{renderInlineNodes(node.children, key)}</h1>;
        }

        if (node.depth === 2) {
          return <h2 key={key}>{renderInlineNodes(node.children, key)}</h2>;
        }

        return <h3 key={key}>{renderInlineNodes(node.children, key)}</h3>;

      case "paragraph":
        return <p key={key}>{renderInlineNodes(node.children, key)}</p>;

      case "unorderedList":
        return (
          <ul key={key}>
            {node.items.map((item, itemIndex) => (
              <li key={`${key}-${itemIndex}`}>
                {renderInlineNodes(item, `${key}-${itemIndex}`)}
              </li>
            ))}
          </ul>
        );
    }
  });
