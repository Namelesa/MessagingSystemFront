export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function truncateText(text: string, maxLength: number = 50): string {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function computeContextMenuPosition(
  blockRect: DOMRect,
  containerRect: DOMRect,
  isMyMessage: boolean,
  menuSize: { width: number; height: number } = { width: 150, height: 120 }
): { x: number; y: number } {
  const menuWidth = menuSize.width;
  const menuHeight = menuSize.height;

  let x: number;
  if (isMyMessage) {
    x = blockRect.left - menuWidth - 8;
    if (x < containerRect.left + 8) {
      x = blockRect.right + 8;
    }
  } else {
    x = blockRect.right + 8;
    if (x + menuWidth > containerRect.right - 8) {
      x = blockRect.left - menuWidth - 8;
    }
  }

  let y = blockRect.top + blockRect.height / 2 - menuHeight / 2;
  const minY = 10;
  const maxY = window.innerHeight - menuHeight - 10;
  y = Math.max(minY, Math.min(y, maxY));

  return { x, y };
}


