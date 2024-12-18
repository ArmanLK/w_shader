import * as mat4 from "./gl-matrix/esm/mat4.js";

window.addEventListener("beforeunload", saveFocusState);
window.addEventListener("load", restoreFocusState);

/** @type {HTMLTextAreaElement} */
const vsTextArea = document.getElementById("vert-shader-source");
/** @type {HTMLTextAreaElement} */
const fsTextArea = document.getElementById("frag-shader-source");

vsTextArea.addEventListener("keydown", handleTabKey);
fsTextArea.addEventListener("keydown", handleTabKey);

document.querySelectorAll(".tab-link").forEach((button) => {
  button.addEventListener("click", (event) => {
    document
      .querySelectorAll(".tab-link")
      .forEach((btn) => btn.classList.remove("active"));

    event.target.classList.add("active");

    let target = event.target.getAttribute("data-target");

    document
      .querySelectorAll(".tab-content")
      .forEach((elem) => elem.classList.remove("active"));

    const elem = document.getElementById(target);
    elem.classList.add("active");
  });
});

main();

/**
 * @param {Event} e
 */
function handleTabKey(e) {
  if (e.key === "Tab") {
    e.preventDefault();
  }
}

function main() {
  /** @type {HTMLCanvasElement | null} */
  const canvas = document.querySelector("#gl-canvas");

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
  programChangeShader(gl, shaderProgram);
  run(gl, shaderProgram);

  document
    .getElementById("compile-shaders-button")
    .addEventListener("click", () => {
      programChangeShader(gl, shaderProgram);
      run(gl, shaderProgram);
    });
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 */
function cleanup(gl, program) {
  const shaders = gl.getAttachedShaders(program);
  for (const shader of shaders) {
    if (shader) {
      gl.detachShader(program, shader);
      gl.deleteShader(shader);
    }
  }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 */
function run(gl, program) {
  /** @type {import ('./types').ProgramInfo} */

  gl.useProgram(null);
  gl.useProgram(program);

  const programInfo = {
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(program, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(program, "uProjectionMatrix"),
      modelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
    },
  };

  let last = 0;
  const render = () => {
    const now = 0.001 * performance.now();
    const dt = now - last;
    last = now;

    if (dt >= 1 / 60) {
      drawScene(gl, buffers, programInfo);
    }
    requestAnimationFrame(render);
  };

  const buffers = initBuffers(gl);

  requestAnimationFrame(render);
}

/**
 * @param {string} id
 * @param {string} defaultVal
 */
function manageShaderCode(id, defaultVal) {
  /** @type {HTMLTextAreaElement} */
  const textArea = document.getElementById(id);
  const storedVal = localStorage.getItem(id);

  if (storedVal) {
    textArea.value = storedVal;
  } else {
    textArea.value = defaultVal;
    localStorage.setItem(id, defaultVal);
  }

  textArea.addEventListener("input", function () {
    localStorage.setItem(id, this.value);
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
    } else {
    }
    localStorage.removeItem("focusedElementId");
  }
}

/**
 * @param {WebGLRenderingContext} gl
 */
function programChangeShader(gl, program) {
  cleanup(gl, program);

  const defaultVsCode = `attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`;

  const defaultFsCode = `varying lowp vec4 vColor;

void main() {
  gl_FragColor = vColor;
}`;

  manageShaderCode("vert-shader-source", defaultVsCode);
  manageShaderCode("frag-shader-source", defaultFsCode);

  const vsCode = vsTextArea.value;
  const fsCode = fsTextArea.value;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsCode);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsCode);

  if (vertexShader && fragmentShader) {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
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

/**
 * @param {WebGLRenderingContext} gl
 * @param {GLenum} type
 * @param {string} source
 */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);

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

/**
 * @param {string} msg
 */
function logShaderError(msg) {
  const shaderConsole = document.getElementById("glsl-consule");
  shaderConsole.innerHTML += msg + "<br>";
  shaderConsole.scrollTop = shaderConsole.scrollHeight;
}

/**
 * @param {WebGLRenderingContext} gl
 * @returns {import('./types').Buffs}
 */
export function initBuffers(gl) {
  const posBuff = initPosBuff(gl);
  const colorBuff = initColorBuff(gl);

  return { position: posBuff, color: colorBuff };
}

/**
 * @param {WebGLRenderingContext} gl
 */
function initPosBuff(gl) {
  const posBuff = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);

  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return posBuff;
}

/**
 * @param {WebGLRenderingContext} gl
 */
function initColorBuff(gl) {
  const colors = [
    1.0,
    1.0,
    1.0,
    1.0, // white
    1.0,
    0.0,
    0.0,
    1.0, // red
    0.0,
    1.0,
    0.0,
    1.0, // green
    0.0,
    0.0,
    1.0,
    1.0, // blue
  ];

  const colorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return colorBuff;
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {import ('./types').Buffs} buffers
 * @param {import ('./types').ProgramInfo} programInfo
 */
export function drawScene(gl, buffers, programInfo) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fow = (45 * Math.PI) / 180; // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fow, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

  setPositionAttribute(gl, buffers, programInfo);
  setColorAttribute(gl, buffers, programInfo);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix,
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix,
  );

  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {import ("./types").Buffs} buffers
 * @param {import ("./types").ProgramInfo} programInfo
 */
function setPositionAttribute(gl, buffers, programInfo) {
  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {import ("./types").Buffs} buffers
 * @param {import ("./types").ProgramInfo} programInfo
 */
function setColorAttribute(gl, buffers, programInfo) {
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexColor,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}
