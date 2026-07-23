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

const ORB_COUNT = 14

// t (en secondes) wrappe à cette cadence pour rester dans une plage sûre
// pour la précision mediump des sin/cos côté shader (cf.
// WEBGL-BACKGROUND-PLAN.md) — le recalage de phase à chaque wrap est géré
// dans render(), plus bas.
const TIME_WRAP_SECONDS = 60

// Formes disponibles pour le falloff des orbes (panneau "Forme").
export const SHAPE_MODES = ['circle', 'ellipse', 'blob', 'polygon']

const FRAGMENT_SRC = `
precision mediump float;

const float PI = 3.14159265;

uniform vec2 uResolution;
uniform vec2 uAspect; // W/maxR, H/maxR — garde les distances en unités ~0..1.5 sans déformer le ratio
uniform float uTime;  // secondes, modulo côté JS
uniform float uAmplitude;
uniform float uRadiusScale;
uniform float uOrbAlpha;
uniform float uVeil;
uniform vec3 uBaseColor;
uniform int uShapeMode;      // 0 cercle, 1 ellipse, 2 blob organique, 3 polygone
uniform float uShapeIntensity; // 0..1
uniform float uActiveOrbCount; // 1..6 — orbes au-delà de ce nombre masquées

// Grain procédural — remplace le pipeline Canvas2D getImageData/putImageData
// (cf. WEBGL-BACKGROUND-PLAN.md §1). Un bruit par bloc de pixels (taille
// uGrainScale), qui ne change que quand uGrainSeed change (piloté côté JS à
// la cadence uGrainFreq) — même effet de scintillement discret que l'ancien
// pipeline à frames pré-calculées, sans coût CPU.
uniform float uGrainOpacity;
uniform float uGrainScale;
uniform float uGrainSeed;
uniform vec3 uGrainTint;
uniform float uGrainTintMix;

uniform vec2 uOrbPos[${ORB_COUNT}];
uniform vec2 uOrbAmp[${ORB_COUNT}];
uniform vec2 uOrbFreq[${ORB_COUNT}];
uniform float uOrbR[${ORB_COUNT}];
// Phases x/y distinctes (et non un uOrbPhase unique *1.3 comme avant) car le
// wrap du temps (cf. TIME_WRAP_SECONDS côté JS) doit faire avancer chaque
// phase de sa propre quantité pour rester raccord — un facteur partagé ne
// permet pas de recaler x et y indépendamment sans provoquer un saut visible
// de position à chaque wrap (cf. bug orbes qui "sautent" au milieu de leur
// trajectoire, signalé le 22/07).
uniform float uOrbPhaseX[${ORB_COUNT}];
uniform float uOrbPhaseY[${ORB_COUNT}];
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

// Hash 2D → pseudo-aléatoire stable par pixel (pas de texture de bruit à
// charger, robuste en precision mediump car les valeurs restent bornées par
// le fract() final).
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
  vec2 p = uv * uAspect;

  vec3 color = uBaseColor;

  for (int i = 0; i < ${ORB_COUNT}; i++) {
    float cx = uOrbPos[i].x + sin(uTime * uOrbFreq[i].x + uOrbPhaseX[i]) * uOrbAmp[i].x * uAmplitude;
    float cy = uOrbPos[i].y + cos(uTime * uOrbFreq[i].y + uOrbPhaseY[i]) * uOrbAmp[i].y * uAmplitude;
    vec2 center = vec2(cx, cy) * uAspect;

    float radius = uOrbR[i] * uRadiusScale;
    float dist = shapeDist(p - center);
    float falloff = clamp(1.0 - dist / radius, 0.0, 1.0);
    // Masque sans branche (step) plutôt qu'un if/continue — évite la
    // divergence de flot de contrôle par pixel pour un coût quasi nul.
    float active = step(float(i) + 0.5, uActiveOrbCount);
    float alpha = uOrbAlpha * pow(falloff, 2.2) * active;

    // équivalent de ctx.globalCompositeOperation = 'multiply' avec alpha :
    // dest * mix(1, src, alpha)
    color = color * mix(vec3(1.0), uOrbColor[i], alpha);
  }

  // équivalent du fillRect voile en source-over
  color = mix(color, uBaseColor, uVeil);

  // Grain : bloc de pixels (taille uGrainScale) → même valeur de bruit pour
  // tout le bloc, façon pixelisation nearest-neighbor de l'ancien rendu
  // offscreen bas-res upscalé.
  vec2 grainCoord = floor(gl_FragCoord.xy / max(uGrainScale, 1.0));
  float n = hash(grainCoord + vec2(uGrainSeed * 17.0, uGrainSeed * 29.0));
  vec3 grainColor = mix(vec3(n), uGrainTint, uGrainTintMix);
  color = mix(color, grainColor, uGrainOpacity);

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
    orbPhaseX: gl.getUniformLocation(program, 'uOrbPhaseX[0]'),
    orbPhaseY: gl.getUniformLocation(program, 'uOrbPhaseY[0]'),
    amplitude: gl.getUniformLocation(program, 'uAmplitude'),
    radiusScale: gl.getUniformLocation(program, 'uRadiusScale'),
    orbAlpha: gl.getUniformLocation(program, 'uOrbAlpha'),
    veil: gl.getUniformLocation(program, 'uVeil'),
    baseColor: gl.getUniformLocation(program, 'uBaseColor'),
    orbColor: gl.getUniformLocation(program, 'uOrbColor[0]'),
    shapeMode: gl.getUniformLocation(program, 'uShapeMode'),
    shapeIntensity: gl.getUniformLocation(program, 'uShapeIntensity'),
    activeOrbCount: gl.getUniformLocation(program, 'uActiveOrbCount'),
    grainOpacity: gl.getUniformLocation(program, 'uGrainOpacity'),
    grainScale: gl.getUniformLocation(program, 'uGrainScale'),
    grainSeed: gl.getUniformLocation(program, 'uGrainSeed'),
    grainTint: gl.getUniformLocation(program, 'uGrainTint'),
    grainTintMix: gl.getUniformLocation(program, 'uGrainTintMix'),
  }

  // Uniformes statiques (géométrie des orbes) — posés une seule fois.
  const orbPos = new Float32Array(ORB_COUNT * 2)
  const orbAmp = new Float32Array(ORB_COUNT * 2)
  const orbFreq = new Float32Array(ORB_COUNT * 2)
  const orbR = new Float32Array(ORB_COUNT)

  // Fréquences angulaires en clair (rad/s), gardées côté JS pour le recalage
  // de phase au wrap (cf. plus bas) — même valeurs que celles envoyées dans
  // orbFreq, juste non typées Float32 pour ne pas perdre en précision durant
  // les additions successives.
  const freqX = orbBase.map(o => o.fx * 1000)
  const freqY = orbBase.map(o => o.fy * 1000)
  // Phase courante par orbe/axe — mutable : recalée à chaque wrap du temps
  // (cf. render()) pour que la position ne saute pas. Reprend les valeurs
  // d'origine (phaseY = p * 1.3) comme point de départ.
  const phaseX = orbBase.map(o => o.p)
  const phaseY = orbBase.map(o => o.p * 1.3)
  const phaseXBuf = new Float32Array(ORB_COUNT)
  const phaseYBuf = new Float32Array(ORB_COUNT)

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
  })

  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbPos[0]'), orbPos)
  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbAmp[0]'), orbAmp)
  gl.uniform2fv(gl.getUniformLocation(program, 'uOrbFreq[0]'), orbFreq)
  gl.uniform1fv(gl.getUniformLocation(program, 'uOrbR[0]'), orbR)

  const orbColorBuf = new Float32Array(ORB_COUNT * 3)

  // Le temps passé au shader doit rester borné (précision mediump des
  // sin/cos, cf. WEBGL-BACKGROUND-PLAN.md) — on le fait donc "wrapper"
  // toutes les TIME_WRAP_SECONDS. Mais comme chaque orbe a sa propre
  // fréquence, un simple modulo sur le temps brut fait retomber le calcul
  // sin(t*freq+phase) sur une valeur différente de celle d'avant le wrap :
  // toutes les orbes sautent d'un coup à ce moment-là (bug signalé le
  // 22/07 : orbes qui "sautent" en plein déplacement et disparaissent).
  // Pour rester raccord, on recale la phase de chaque orbe/axe exactement
  // de ce qu'elle aurait avancé pendant l'intervalle écoulé (mod 2π, qui ne
  // change pas la valeur de sin/cos) au moment du wrap, plutôt que de
  // remettre le temps à zéro sans compensation.
  const TWO_PI = Math.PI * 2
  let wrapBoundary = 0
  phaseXBuf.set(phaseX)
  phaseYBuf.set(phaseY)
  gl.uniform1fv(u.orbPhaseX, phaseXBuf)
  gl.uniform1fv(u.orbPhaseY, phaseYBuf)

  return {
    resize(width, height) {
      gl.viewport(0, 0, width, height)
      gl.uniform2f(u.resolution, width, height)
      const maxR = Math.max(width, height)
      // p = uv * uAspect doit reconstruire la position pixel réelle mise à
      // l'échelle de maxR (realX/maxR, realY/maxR), donc uAspect = (W/maxR,
      // H/maxR) — PAS l'inverse. Avec maxR/W,maxR/H (bug précédent), un
      // canvas très haut et étroit (mobile + parallaxe) écrasait les orbes
      // en bandes verticales au lieu de cercles.
      gl.uniform2f(u.aspect, width / maxR, height / maxR)
    },

    render(cfg, timeSeconds, grainSeed) {
      gl.useProgram(program)

      while (timeSeconds - wrapBoundary >= TIME_WRAP_SECONDS) {
        for (let i = 0; i < ORB_COUNT; i++) {
          phaseX[i] = (phaseX[i] + freqX[i] * TIME_WRAP_SECONDS) % TWO_PI
          phaseY[i] = (phaseY[i] + freqY[i] * TIME_WRAP_SECONDS) % TWO_PI
        }
        wrapBoundary += TIME_WRAP_SECONDS
        for (let i = 0; i < ORB_COUNT; i++) {
          phaseXBuf[i] = phaseX[i]
          phaseYBuf[i] = phaseY[i]
        }
        gl.uniform1fv(u.orbPhaseX, phaseXBuf)
        gl.uniform1fv(u.orbPhaseY, phaseYBuf)
      }

      gl.uniform1f(u.time, timeSeconds - wrapBoundary)
      gl.uniform1f(u.amplitude, cfg.amplitude)
      gl.uniform1f(u.radiusScale, cfg.radius)
      gl.uniform1f(u.orbAlpha, cfg.orbAlpha)
      gl.uniform1f(u.veil, cfg.veil)
      gl.uniform3f(u.baseColor, cfg.baseColor[0] / 255, cfg.baseColor[1] / 255, cfg.baseColor[2] / 255)
      gl.uniform1i(u.shapeMode, Math.max(0, SHAPE_MODES.indexOf(cfg.shape)))
      gl.uniform1f(u.shapeIntensity, cfg.shapeIntensity)
      gl.uniform1f(u.activeOrbCount, cfg.orbCount ?? ORB_COUNT)
      gl.uniform1f(u.grainOpacity, cfg.grainOpacity)
      gl.uniform1f(u.grainScale, cfg.grainScale)
      gl.uniform1f(u.grainSeed, grainSeed)
      gl.uniform3f(u.grainTint, cfg.grainTint[0] / 255, cfg.grainTint[1] / 255, cfg.grainTint[2] / 255)
      gl.uniform1f(u.grainTintMix, cfg.grainTintMix)

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
