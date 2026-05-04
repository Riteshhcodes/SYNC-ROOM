const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

let animationProgress = 0;
let uniforms;
let textTexture;
let glInstance = null;
let rafId = null;
let startTimestamp = null;

let textCanvas = null;
let textCtx = null;

function createTextTexture(gl) {
  if (!textCanvas) {
    textCanvas = document.createElement("canvas");
    textCtx = textCanvas.getContext("2d");
  }
  
  textCanvas.width = 2048;
  textCanvas.height = 1024;
  textCtx.fillStyle = "white";
  textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  textCtx.fillStyle = "black";
  textCtx.font = "bold 180px Arial";
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";
  textCtx.fillText("SYNC_ROOM", textCanvas.width / 2, textCanvas.height / 2);
  textTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function initShader(canvasEl) {
  const vsSource = document.getElementById("vertShader").innerHTML;
  const fsSource = document.getElementById("fragShader").innerHTML;
  const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");
  if (!gl) { console.error("WebGL not supported"); return null; }

  function createShader(gl, sourceCode, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
  const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader link error: " + gl.getProgramInfoLog(program));
    return null;
  }

  const uniformsObj = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const uniformName = gl.getActiveUniform(program, i).name;
    uniformsObj[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  uniforms = uniformsObj;

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.useProgram(program);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  createTextTexture(gl);
  return gl;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function resizeCanvas(canvasEl, gl) {
  canvasEl.width = window.innerWidth * devicePixelRatio;
  canvasEl.height = window.innerHeight * devicePixelRatio;
  gl.viewport(0, 0, canvasEl.width, canvasEl.height);
  gl.uniform2f(uniforms.u_resolution, canvasEl.width, canvasEl.height);
}

export function triggerBurnReveal(onComplete) {
  const canvasEl = document.getElementById("fire-overlay");
  if (!canvasEl) { console.error("No #fire-overlay canvas found"); return; }

  const gl = initShader(canvasEl);
  if (!gl) return;
  glInstance = gl;

  resizeCanvas(canvasEl, gl);
  window.addEventListener("resize", () => resizeCanvas(canvasEl, gl));

  canvasEl.style.opacity = "1";
  startTimestamp = null;
  const DURATION = 2500;

  function render(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const elapsed = timestamp - startTimestamp;
    const t = Math.min(elapsed / DURATION, 1);
    animationProgress = easeInOut(t);

    gl.uniform1f(uniforms.u_time, timestamp);
    gl.uniform1f(uniforms.u_progress, animationProgress);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    gl.uniform1i(uniforms.u_text, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (t < 1) {
      rafId = requestAnimationFrame(render);
    } else {
      canvasEl.style.transition = "opacity 0.5s ease";
      canvasEl.style.opacity = "0";
      setTimeout(() => {
        canvasEl.style.display = "none";
        if (onComplete) onComplete();
      }, 500);
    }
  }

  rafId = requestAnimationFrame(render);
}
