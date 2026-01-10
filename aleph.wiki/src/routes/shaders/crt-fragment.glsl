precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_beamPosition;
uniform sampler2D u_previousFrame;
uniform float u_time;

varying vec2 v_texCoord;

// Phosphor decay rate
const float DECAY = 0.92;

// Glow parameters
const float CORE_RADIUS = 8.0;
const float MEDIUM_RADIUS = 18.0;
const float OUTER_RADIUS = 35.0;

// Red phosphor color (P22)
const vec3 PHOSPHOR_COLOR = vec3(1.0, 0.118, 0.137); // #FF1E23

void main() {
  vec2 pixelCoord = gl_FragCoord.xy;

  // Sample previous frame (phosphor persistence)
  vec4 previous = texture2D(u_previousFrame, v_texCoord);
  vec3 persistentGlow = previous.rgb * DECAY;

  // Calculate distance from current beam position
  float dist = distance(pixelCoord, u_beamPosition);

  // Multi-layer phosphor glow
  float coreIntensity = exp(-dist * dist / (CORE_RADIUS * CORE_RADIUS));
  float mediumIntensity = exp(-dist * dist / (MEDIUM_RADIUS * MEDIUM_RADIUS)) * 0.6;
  float outerIntensity = exp(-dist * dist / (OUTER_RADIUS * OUTER_RADIUS)) * 0.3;

  // Combine glow layers
  float totalIntensity = coreIntensity + mediumIntensity + outerIntensity;

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
