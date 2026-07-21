// Rendu WebGL1 de la couche "orbes" du fond animé — remplace les dégradés
// radiaux Canvas2D (coûteux en CPU, cf. WEBGL-BACKGROUND-PLAN.md).
//
// Choix portabilité :
// - WebGL1 explicitement (aucune feature WebGL2 requise, meilleur support
//   Safari/Android anciens).
// - `precision mediump float` partout (highp non garanti sur GPU mobile
//   bas de gamme).
// - Toutes les grandeurs manipulées dans le shader restent en magnitude
//   0–~2 (coordonnées normalisées, temps modulo) pour rester robuste à la
//   précision réduite du mediump.
// - Détection du rendu logiciel (SwiftShader/llvmpipe) → traité comme
//   "WebGL indisponible" par l'appelant (fallback CSS statique).

const VERTEX_SRC = `
precision mediump float;
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const ORB_COUNT = 6

// Formes disponibles pour le falloff des orbes (panneau "Forme").
export const SHAPE_MODES = ['circle', 'ellipse', 'blob', 'polygon']

const FRAGMENT_SRC = `
precision mediump float;

const float PI = 3.14159265;

uniform vec2 uResolution;
uniform vec2 uAspect; // maxR/W, maxR/H — garde les distances en unités ~0..1.5
uniform float uTime;  // secondes, modulo côté JS
uniform float uAmplitude;
uniform float uRadiusScale;
uniform float uOrbAlpha;
uniform float uVeil;
uniform vec3 uBaseColor;
uniform int uShapeMode;      // 0 cercle, 1 ellipse, 2 blob organique, 3 polygone
uniform float uShapeIntensity; // 0..1

uniform vec2 uOrbPos[${ORB_COUNT}];
uniform vec2 uOrbAmp[${ORB_COUNT}];
uniform vec2 uOrbFreq[${ORB_COUNT}];
uniform float uOrbR[${ORB_COUNT}];
uniform float uOrbPhase[${ORB_COUNT}];
uniform vec3 uOrbColor[${ORB_COUNT}];

// Distance "déformée" utilisée à la place de length(d) selon la forme
// choisie — d = vecteur du centre de l'orbe vers le pixel courant.
float shapeDist(vec2 d) {
  if (uShapeMode == 1) {
    // Ellipse : étire un axe, comprime l'autre (aire ~ constante).
    float stretch = 1.0 + uShapeIntensity * 2.0;
    vec2 dd = vec2(d.x / stretch, d.y * stretch);
    return length(dd);
  } else if (uShapeMode == 2) {
    // Blob organique : contour perturbé par une onde angulaire animée.
    float angle = atan(d.y, d.x);
    float wobble = sin(angle * 5.0 + uTime * 0.6) * 0.5 + sin(angle * 3.0 - uTime * 0.4) * 0.5;
    return length(d) / (1.0 + wobble * uShapeIntensity * 0.35);
  } else if (uShapeMode == 3) {
    // Polygone régulier à n côtés (n = 3..10 selon l'intensité).
    float sides = floor(3.0 + uShapeIntensity * 7.0);
    float seg = 2.0 * PI / sides;
    float angle = atan(d.y, d.x);
    float a = mod(angle, seg) - seg * 0.5;
    return length(d) * (cos(seg * 0.5) / cos(a));
  }
  return length(d);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
  vec2 p = uv * uAspect;

  vec3 color = uBaseColor;

  for (int i = 0; i < ${ORB_COUNT}; i++) {
    float cx = uOrbPos[i].x + sin(uTime * uOrbFreq[i].x + uOrbPhase[i]) * uOrbAmp[i].x * uAmplitude;
    float cy = uOrbPos[i].y + cos(uTime * uOrbFreq[i].y + uOrbPhase[i] * 1.3) * uOrbAmp[i].y * uAmplitude;
    vec2 center = vec2(cx, cy) * uAspect;

    float radius = uOrbR[i] * uRadiusScale;
    float dist = shapeDist(p - center);
    float falloff = clamp(1.0 - dist / radius, 0.0, 1.0);
    float alpha = uOrbAlpha * pow(falloff, 2.2);

    // équivalent de ctx.globalCompositeOperation = 'multiply' avec alpha :
    // dest * mix(1, src, alpha)
    color = color * mix(vec3(1.0), uOrbColor[i], alpha);
  }

  // équivalent du fillRect voile en source-over
  color = mix(color, uBaseColor, uVeil);

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${log}`)
  }
  return shader
}

function isSoftwareRenderer(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  if (!ext) return false
  const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
  return ['swiftshader', 'llvmpipe', 'software'].some(s => renderer.includes(s))
}

export function createOrbRenderer(canvas, orbBase) {
  const gl =
    canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' }) ||
    canvas.getContext('experimental-webgl', { alpha: false, antialias: false })

  if (!gl || isSoftwareRenderer(gl)) return null

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Program link error: ${log}`)
  }
  gl.useProgram(program)

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPosition = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(aPosition)
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

  const u = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    aspect: gl.getUniformLocation(program, 'uAspect'),
    time: gl.getUniformLocation(program, 'uTime'),
    amplitude: gl.getUniformLocation(program, 'uAmplitude'),
    radiusScale: gl.getUniformLocation(program, 'uRadiusScale'),
    orbAlpha: gl.getUniformLocation(program, 'uOrbAlpha'),
    veil: gl.getUniformLocation(program, 'uVeil'),
    baseColor: gl.getUniformLocation(program, 'uBaseColor'),
    orbColor: gl.getUniformLocation(program, 'uOrbColor[0]'),
    shapeMode: gl.getUniformLocation(program, 'uShapeMode'),
    shapeIntensity: gl.getUniformLocation(program, 'uShapeIntensity'),
  }

  // Uniformes statiques (géométrie des orbes) — posés une seule fois.
  const orbPos = new Float32Array(ORB_COUNT * 2)
  const orbAmp = new Float32Array(ORB_COUNT * 2)
  const orbFreq = new Float32Array(ORB_COUNT * 2)
  const orbR = new Float32Array(ORB_COUNT)
  const orbPhase = new Float32Array(ORB_COUNT)

  orbBase.forEach((o, i) => {
    orbPos[i * 2] = o.px
    orbPos[i * 2 + 1] = o.py
    orbAmp[i * 2] = o.ax
    orbAmp[i * 2 + 1] = o.ay
    // fx/fy sont calibrées pour un t en millisecondes ; uTime est en
    // secondes côté shader → on rescale ici pour garder la même vitesse
    // perçue qu'avant, sans repasser par de grandes magnitudes en JS.
    orbFreq[i * 2] = o.fx * 1000
    orbFreq[i * 2 + 1] = o.fy * 1000
    orbR[i] = o.r
    orbPhase[i] = o.p
  })

  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbPos[0]'), orbPos)
  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbAmp[0]'), orbAmp)
  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbFreq[0]'), orbFreq)
  gl.uniform1fv(gl.getUniformLocation(program, 'uOrbR[0]'), orbR)
  gl.uniform1fv(gl.getUniformLocation(program, 'uOrbPhase[0]'), orbPhase)

  const orbColorBuf = new Float32Array(ORB_COUNT * 3)

  return {
    resize(width, height) {
      gl.viewport(0, 0, width, height)
      gl.uniform2f(u.resolution, width, height)
      const maxR = Math.max(width, height)
      gl.uniform2f(u.aspect, maxR / width, maxR / height)
    },

    render(cfg, timeSeconds) {
      gl.useProgram(program)
      gl.uniform1f(u.time, timeSeconds)
      gl.uniform1f(u.amplitude, cfg.amplitude)
      gl.uniform1f(u.radiusScale, cfg.radius)
      gl.uniform1f(u.orbAlpha, cfg.orbAlpha)
      gl.uniform1f(u.veil, cfg.veil)
      gl.uniform3f(u.baseColor, cfg.baseColor[0] / 255, cfg.baseColor[1] / 255, cfg.baseColor[2] / 255)
      gl.uniform1i(u.shapeMode, Math.max(0, SHAPE_MODES.indexOf(cfg.shape)))
      gl.uniform1f(u.shapeIntensity, cfg.shapeIntensity)

      cfg.colors.forEach((c, i) => {
        orbColorBuf[i * 3] = c[0] / 255
        orbColorBuf[i * 3 + 1] = c[1] / 255
        orbColorBuf[i * 3 + 2] = c[2] / 255
      })
      gl.uniform3fv(u.orbColor, orbColorBuf)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },

    destroy() {
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(positionBuffer)
    },
  }
}
