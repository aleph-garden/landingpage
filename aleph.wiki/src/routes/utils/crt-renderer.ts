import type { Point } from './font-loader';

const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_beamPosition;
uniform sampler2D u_previousFrame;
uniform float u_time;

varying vec2 v_texCoord;

// Phosphor decay rate
const float DECAY = 0.94;

// Glow parameters
const float CORE_RADIUS = 25.0;
const float MEDIUM_RADIUS = 60.0;
const float OUTER_RADIUS = 120.0;

// Red phosphor color (P22)
const vec3 PHOSPHOR_COLOR = vec3(1.0, 0.118, 0.137);

void main() {
  vec2 pixelCoord = gl_FragCoord.xy;

  // Sample previous frame (phosphor persistence)
  vec4 previous = texture2D(u_previousFrame, v_texCoord);
  vec3 persistentGlow = previous.rgb * DECAY;

  // Calculate distance from current beam position
  float dist = distance(pixelCoord, u_beamPosition);

  // Central beam (very intense, tight) - burns in harder so persists longer
  float beamIntensity = exp(-pow(dist / 5.0, 4.0)) * 8.0;

  // Multi-layer phosphor glow with exponential falloff (less intense)
  float coreIntensity = exp(-pow(dist / CORE_RADIUS, 3.0)) * 0.6;
  float mediumIntensity = exp(-pow(dist / MEDIUM_RADIUS, 2.5)) * 0.3;
  float outerIntensity = exp(-pow(dist / OUTER_RADIUS, 2.0)) * 0.15;

  // Combine layers
  float totalIntensity = beamIntensity + coreIntensity + mediumIntensity + outerIntensity;

  // Apply phosphor color
  vec3 beamGlow = PHOSPHOR_COLOR * totalIntensity;

  // Combine beam with persistent trail
  vec3 finalColor = max(beamGlow, persistentGlow);

  // Add slight bloom/halation
  float bloom = smoothstep(OUTER_RADIUS * 1.5, 0.0, dist) * 0.1;
  finalColor += PHOSPHOR_COLOR * bloom;

  // Ensure we don't exceed maximum brightness
  finalColor = clamp(finalColor, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export class CRTRenderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private path: Point[] = [];
  private currentIndex = 0;
  private speed = 1.0;
  private animationId: number | null = null;

  // Framebuffers for ping-pong rendering
  private framebuffers: WebGLFramebuffer[] = [];
  private textures: WebGLTexture[] = [];
  private currentFramebuffer = 0;

  // Uniforms
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement, path: Point[]) {
    this.canvas = canvas;
    this.path = path;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    this.initWebGL();
    this.initFramebuffers();
  }

  private initWebGL() {
    const gl = this.gl;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile shaders');
    }

    // Create program
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Failed to link program: ' + info);
    }

    this.program = program;
    gl.useProgram(program);

    // Set up full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // TexCoord buffer
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    this.uniforms = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_beamPosition: gl.getUniformLocation(program, 'u_beamPosition'),
      u_previousFrame: gl.getUniformLocation(program, 'u_previousFrame'),
      u_time: gl.getUniformLocation(program, 'u_time'),
    };

    // Set resolution
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initFramebuffers() {
    const gl = this.gl;

    // Create two framebuffers for ping-pong rendering
    for (let i = 0; i < 2; i++) {
      const framebuffer = gl.createFramebuffer();
      const texture = gl.createTexture();

      if (!framebuffer || !texture) {
        throw new Error('Failed to create framebuffer or texture');
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      // Clear to background color (#ffe6e8)
      gl.clearColor(1.0, 0.902, 0.910, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.framebuffers.push(framebuffer);
      this.textures.push(texture);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public start() {
    this.animate();
  }

  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = () => {
    const gl = this.gl;

    // Update beam position along path
    this.currentIndex += this.speed;
    if (this.currentIndex >= this.path.length) {
      this.currentIndex = 0;
    }

    const index = Math.floor(this.currentIndex);
    const nextIndex = (index + 1) % this.path.length;
    const t = this.currentIndex - index;

    const p1 = this.path[index];
    const p2 = this.path[nextIndex];
    const beamX = p1.x + (p2.x - p1.x) * t;
    const beamY = p1.y + (p2.y - p1.y) * t;

    // Bind previous frame as texture
    const readBuffer = this.currentFramebuffer;
    const writeBuffer = (this.currentFramebuffer + 1) % 2;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[readBuffer]);
    gl.uniform1i(this.uniforms.u_previousFrame, 0);

    // Set beam position
    gl.uniform2f(this.uniforms.u_beamPosition, beamX, beamY);

    // Render to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeBuffer]);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Copy to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[writeBuffer]);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Swap buffers
    this.currentFramebuffer = writeBuffer;

    this.animationId = requestAnimationFrame(this.animate);
  };

  public destroy() {
    this.stop();

    const gl = this.gl;

    // Clean up framebuffers and textures
    this.framebuffers.forEach(fb => gl.deleteFramebuffer(fb));
    this.textures.forEach(tex => gl.deleteTexture(tex));

    if (this.program) {
      gl.deleteProgram(this.program);
    }
  }
}
