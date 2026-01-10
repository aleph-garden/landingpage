import opentype from 'opentype.js';

export interface Point {
  x: number;
  y: number;
}

/**
 * Extract the Aleph (ℵ) glyph path from a font and convert to normalized 2D points
 */
export async function extractAlephPath(
  fontUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Point[]> {
  try {
    // Load font
    const font = await opentype.load(fontUrl);

    // Get Aleph glyph (Unicode U+2135)
    const glyphs = font.stringToGlyphs('ℵ');
    if (glyphs.length === 0) {
      throw new Error('Aleph glyph not found in font');
    }

    const glyph = glyphs[0];
    const path = glyph.getPath(0, 0, 72); // Get path at 72pt size

    // Convert path commands to points
    const points: Point[] = [];
    let currentX = 0;
    let currentY = 0;

    // Tessellate the path into line segments
    path.commands.forEach((cmd) => {
      switch (cmd.type) {
        case 'M': // Move to
          currentX = cmd.x;
          currentY = cmd.y;
          points.push({ x: currentX, y: currentY });
          break;

        case 'L': // Line to
          currentX = cmd.x;
          currentY = cmd.y;
          points.push({ x: currentX, y: currentY });
          break;

        case 'C': // Cubic Bézier curve
          // Sample curve at regular intervals
          for (let t = 0; t <= 1; t += 0.05) {
            const x = Math.pow(1 - t, 3) * currentX +
                     3 * Math.pow(1 - t, 2) * t * cmd.x1 +
                     3 * (1 - t) * Math.pow(t, 2) * cmd.x2 +
                     Math.pow(t, 3) * cmd.x;
            const y = Math.pow(1 - t, 3) * currentY +
                     3 * Math.pow(1 - t, 2) * t * cmd.y1 +
                     3 * (1 - t) * Math.pow(t, 2) * cmd.y2 +
                     Math.pow(t, 3) * cmd.y;
            points.push({ x, y });
          }
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case 'Q': // Quadratic Bézier curve
          // Sample curve at regular intervals
          for (let t = 0; t <= 1; t += 0.05) {
            const x = Math.pow(1 - t, 2) * currentX +
                     2 * (1 - t) * t * cmd.x1 +
                     Math.pow(t, 2) * cmd.x;
            const y = Math.pow(1 - t, 2) * currentY +
                     2 * (1 - t) * t * cmd.y1 +
                     Math.pow(t, 2) * cmd.y;
            points.push({ x, y });
          }
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case 'Z': // Close path
          if (points.length > 0) {
            points.push({ x: points[0].x, y: points[0].y });
          }
          break;
      }
    });

    // Normalize to canvas space
    const normalizedPoints = normalizePoints(points, targetWidth, targetHeight);

    return normalizedPoints;
  } catch (error) {
    console.error('Failed to load font or extract glyph:', error);
    throw error;
  }
}

/**
 * Normalize points to fit within target dimensions while maintaining aspect ratio
 */
function normalizePoints(points: Point[], targetWidth: number, targetHeight: number): Point[] {
  if (points.length === 0) return [];

  // Find bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Calculate scale to fit within target dimensions
  const scale = Math.min(targetWidth / width, targetHeight / height) * 0.6; // 0.6 for padding

  // Center in canvas
  const offsetX = (targetWidth - width * scale) / 2;
  const offsetY = (targetHeight - height * scale) / 2;

  // Normalize points
  return points.map(p => ({
    x: (p.x - minX) * scale + offsetX,
    y: (p.y - minY) * scale + offsetY
  }));
}

/**
 * Fallback manually-defined Aleph path
 */
export function getFallbackAlephPath(width: number, height: number): Point[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 3;

  // Simplified Aleph symbol path
  const relativePath: [number, number][] = [
    // Left diagonal stroke
    [-0.5, 0.7], [-0.45, 0.6], [-0.4, 0.5], [-0.35, 0.4], [-0.3, 0.3],
    [-0.25, 0.2], [-0.2, 0.1], [-0.15, 0], [-0.1, -0.1], [-0.05, -0.2],
    [0, -0.3], [0.05, -0.4], [0.1, -0.5], [0.12, -0.55], [0.14, -0.6],

    // Right diagonal stroke
    [0.14, -0.6], [0.1, -0.6], [0.05, -0.55], [0, -0.5], [-0.05, -0.45],
    [-0.1, -0.4], [-0.05, -0.35], [0, -0.3], [0.05, -0.25],
    [0.1, -0.2], [0.15, -0.15], [0.2, -0.1], [0.25, -0.05],
    [0.3, 0], [0.35, 0.05], [0.4, 0.1], [0.43, 0.15], [0.46, 0.2],
    [0.49, 0.25], [0.52, 0.3], [0.54, 0.35], [0.56, 0.4], [0.57, 0.45],
    [0.58, 0.5], [0.59, 0.55], [0.6, 0.6], [0.6, 0.65], [0.6, 0.7],

    // Middle horizontal stroke
    [0.6, 0.7], [0.5, 0.6], [0.4, 0.5], [0.3, 0.4], [0.2, 0.3],
    [0.1, 0.2], [0, 0.15], [-0.1, 0.12], [-0.2, 0.1],
    [-0.25, 0.08], [-0.3, 0.05], [-0.32, 0.02], [-0.34, 0],
    [-0.32, -0.02], [-0.3, -0.04], [-0.25, -0.05], [-0.2, -0.05],
    [-0.15, -0.04], [-0.1, -0.03], [-0.05, -0.02], [0, -0.01],
    [0.05, 0], [0.1, 0.02], [0.15, 0.05], [0.2, 0.08], [0.25, 0.12],
    [0.3, 0.16], [0.33, 0.19], [0.35, 0.22],
  ];

  return relativePath.map(([x, y]) => ({
    x: centerX + x * scale,
    y: centerY + y * scale
  }));
}
