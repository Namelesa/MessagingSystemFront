import { isToday, truncateText, computeContextMenuPosition } from './messages-helpers';

describe('utils', () => {
  describe('isToday', () => {
    it('should return true for today date', () => {
      const today = new Date();
      expect(isToday(today)).toBeTrue();
    });

    it('should return false for past date', () => {
      const past = new Date('2000-01-01');
      expect(isToday(past)).toBeFalse();
    });

    it('should handle string input correctly', () => {
      const today = new Date();
      expect(isToday(today.toISOString())).toBeTrue();
    });
  });

  describe('truncateText', () => {
    it('should return original text if shorter than maxLength', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('should truncate text longer than maxLength', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz';
      expect(truncateText(text, 5)).toBe('abcde...');
    });

    it('should use default maxLength if not provided', () => {
      const text = 'a'.repeat(60);
      const result = truncateText(text);
      expect(result.endsWith('...')).toBeTrue();
      expect(result.length).toBe(53);
    });
  });

  describe('computeContextMenuPosition', () => {
    const containerRect: DOMRect = {
      left: 0,
      top: 0,
      right: 500,
      bottom: 500,
      width: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    };

    beforeEach(() => {
      spyOnProperty(window, 'innerHeight').and.returnValue(800);
    });

    it('should position to the left of my message if space available', () => {
      const blockRect: DOMRect = {
        left: 300,
        right: 350,
        top: 100,
        bottom: 150,
        width: 50,
        height: 50,
        x: 300,
        y: 100,
        toJSON: () => {}
      };
      const pos = computeContextMenuPosition(blockRect, containerRect, true);
      expect(pos.x).toBeLessThan(blockRect.left);
    });

    it('should position to the right of my message if no left space', () => {
      const blockRect: DOMRect = {
        left: 10,
        right: 60,
        top: 100,
        bottom: 150,
        width: 50,
        height: 50,
        x: 10,
        y: 100,
        toJSON: () => {}
      };
      const pos = computeContextMenuPosition(blockRect, containerRect, true);
      expect(pos.x).toBeGreaterThan(blockRect.right);
    });

    it('should position to the right of other message if space available', () => {
      const blockRect: DOMRect = {
        left: 100,
        right: 150,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
        x: 100,
        y: 200,
        toJSON: () => {}
      };
      const pos = computeContextMenuPosition(blockRect, containerRect, false);
      expect(pos.x).toBeGreaterThan(blockRect.right);
    });

    it('should position to the left of other message if no right space', () => {
      const blockRect: DOMRect = {
        left: 460,
        right: 490,
        top: 200,
        bottom: 230,
        width: 30,
        height: 30,
        x: 460,
        y: 200,
        toJSON: () => {}
      };
      const pos = computeContextMenuPosition(blockRect, containerRect, false);
      expect(pos.x).toBeLessThan(blockRect.left);
    });

    it('should keep y within viewport bounds', () => {
      const blockRect: DOMRect = {
        left: 100,
        right: 150,
        top: 0,
        bottom: 10,
        width: 50,
        height: 10,
        x: 100,
        y: 0,
        toJSON: () => {}
      };
      const pos = computeContextMenuPosition(blockRect, containerRect, false);
      expect(pos.y).toBeGreaterThanOrEqual(10);
    });
  });
});
