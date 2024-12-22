import { mat4 } from "gl-matrix";

window.addEventListener("beforeunload", saveFocusState);
window.addEventListener("load", restoreFocusState);

const fsTextArea = document.getElementById(
  "frag-shader-source",
) as HTMLTextAreaElement;

const vertices = new Float32Array([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0])

const vsCode = `precision mediump float;

attribute vec2 aVertexPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uTime;

varying lowp vec4 vColor;

void main() {
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
  vColor = vec4(1,1,1,1);
}
`;

fsTextArea.addEventListener("keydown", handleTabKey);

document.querySelectorAll(".tab-link").forEach((button) => {
  button.addEventListener("click", (event) => {
    document
      .querySelectorAll(".tab-link")
      .forEach((btn) => btn.classList.remove("active"));

    const t = event.target as HTMLTextAreaElement;
    t.classList.add("active");

    let target = t.getAttribute("data-target");
    if (!target) {
      return;
    }

    document
      .querySelectorAll(".tab-content")
      .forEach((elem) => elem.classList.remove("active"));

    const elem = document.getElementById(target);
    if (!elem) {
      return;
    }
    elem.classList.add("active");
  });
});

main();

function handleTabKey(e: KeyboardEvent) {
  if (e.key === "Tab") {
    e.preventDefault();
  }
}

function main() {
  const canvas = document.querySelector("#gl-canvas") as HTMLCanvasElement;

  if (!canvas) {
    alert("what happend?");
    return;
  }

  const gl = canvas.getContext("webgl");

  if (!gl) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it.",
    );
    return;
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let shaderProgram = gl.createProgram();
  if (!shaderProgram) {
    console.error("Create Program failed");
    return;
  }
  programChangeShader(gl, shaderProgram);
  run(gl, shaderProgram);

  const btn = document.getElementById("compile-shaders-button");
  if (!btn) {
    throw new Error("button element id is wrong!");
  }

  btn.addEventListener("click", () => {
    programChangeShader(gl, shaderProgram);
    run(gl, shaderProgram);
  });
}

function cleanup(gl: WebGLRenderingContext, program: WebGLProgram) {
  const shaders = gl.getAttachedShaders(program);
  for (const shader of shaders || []) {
    if (shader) {
      gl.detachShader(program, shader);
      gl.deleteShader(shader);
    }
  }
}

function run(gl: WebGLRenderingContext, program: WebGLProgram) {
  gl.useProgram(program);

  const vertexBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const aVertexPosition = gl.getAttribLocation(program, "aVertexPosition")
  gl.enableVertexAttribArray(aVertexPosition)
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0)

  const uTime = gl.getUniformLocation(program, "uTime");

  if (!uTime) {
    console.error("uTime is null");
    //return;
  }

  let last = 0;
  function render() {
    const now = (performance.now() + performance.timeOrigin);
    const dt = now - last;

    if (dt >= (1000 / 60)) {
      drawScene(gl, uTime, now);
      last = now;
    }
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function manageShaderCode(tArea: HTMLTextAreaElement, defaultVal: string) {
  const storedVal = localStorage.getItem(tArea.id);

  if (storedVal) {
    tArea.value = storedVal;
  } else {
    tArea.value = defaultVal;
    localStorage.setItem(tArea.id, defaultVal);
  }

  tArea.addEventListener("input", function () {
    localStorage.setItem(tArea.id, this.value);
  });
}

function saveFocusState() {
  const focusedElem = document.activeElement;
  if (focusedElem) {
    localStorage.setItem("focusedElementId", focusedElem.id);
  }
}

function restoreFocusState() {
  const focusedElemId = localStorage.getItem("focusedElementId");
  if (focusedElemId) {
    const elem = document.getElementById(focusedElemId);
    if (elem) {
      elem.focus();
    }
    localStorage.removeItem("focusedElementId");
  }
}

function programChangeShader(gl: WebGLRenderingContext, program: WebGLProgram) {
  cleanup(gl, program);

  const defaultFsCode = `precision mediump float;

uniform float uTime;
varying lowp vec4 vColor;

void main() {
  gl_FragColor = vColor;
}`;

  manageShaderCode(fsTextArea, defaultFsCode);

  const fsCode = fsTextArea.value;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsCode);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsCode);

  if (vertexShader && fragmentShader) {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    console.error(gl.getError())
  } else {
    console.error("compilation failed!");
  }

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        program,
      )}`,
    );
  }
}

function compileShader(
  gl: WebGLRenderingContext,
  type: GLenum,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    const tMsg = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    const logMsg = gl.getShaderInfoLog(shader);
    logShaderError(`Error in ${tMsg} shader: ${logMsg}`);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function logShaderError(msg: string) {
  const shaderConsole = document.getElementById("glsl-consule");
  if (!shaderConsole) {
    throw new Error("shader console id not found!");
  }

  shaderConsole.innerHTML += msg + "<br>";
  shaderConsole.scrollTop = shaderConsole.scrollHeight;
}

function drawScene(
  gl: WebGLRenderingContext,
  uTime: WebGLUniformLocation,
  time: GLfloat,
) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fow = (45 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.width / gl.canvas.height;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fow, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

  gl.uniform1f(uTime, time);

  {
    const offset = 0;
    const vertexCount = vertices.length / 2;

    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}
