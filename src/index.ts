import { mat4 } from "gl-matrix";
import type { Buffs, ProgramInfo } from "./types";

window.addEventListener("beforeunload", saveFocusState);
window.addEventListener("load", restoreFocusState);

const vsTextArea = document.getElementById(
  "vert-shader-source",
) as HTMLTextAreaElement;
const fsTextArea = document.getElementById(
  "frag-shader-source",
) as HTMLTextAreaElement;

vsTextArea.addEventListener("keydown", handleTabKey);
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
  gl.useProgram(null);
  gl.useProgram(program);

  const pMLoc = gl.getUniformLocation(program, "uProjectionMatrix");
  const mVMLoc = gl.getUniformLocation(program, "uModelViewMatrix");
  const uTime = gl.getUniformLocation(program, "uTime");

  if (!pMLoc) {
    console.error("projectionMatrix is null!");
    return;
  }
  if (!mVMLoc) {
    console.error("modelViewMatrix is null");
    return;
  }
  if (!uTime) {
    console.error("uTime is null");
    return;
  }

  const programInfo: ProgramInfo = {
    attribLocations: {
      vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(program, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: pMLoc,
      modelViewMatrix: mVMLoc,
      uTime: uTime,
    },
  };

  let last = 0;
  function render() {
    const now = 0.001 * performance.now();
    const dt = now - last;
    last = now;

    if (!buffers) {
      requestAnimationFrame(render);
      return;
    }

    if (dt >= 1 / 60) {
      drawScene(gl, buffers, programInfo, now);
    }
    requestAnimationFrame(render);
  }

  const buffers = initBuffers(gl);

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

  manageShaderCode(vsTextArea, defaultVsCode);
  manageShaderCode(fsTextArea, defaultFsCode);

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

function initBuffers(gl: WebGLRenderingContext) {
  const posBuff = initPosBuff(gl);
  const colorBuff = initColorBuff(gl);

  if (posBuff && colorBuff) {
    return { position: posBuff, color: colorBuff };
  } else {
    return null;
  }
}

function initPosBuff(gl: WebGLRenderingContext) {
  const posBuff = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);

  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return posBuff;
}

function initColorBuff(gl: WebGLRenderingContext) {
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

function drawScene(
  gl: WebGLRenderingContext,
  buffers: Buffs,
  programInfo: ProgramInfo,
  time: number,
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
  gl.uniform1f(programInfo.uniformLocations.uTime, time);

  {
    const offset = 0;
    const vertexCount = 4;

    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

function setPositionAttribute(
  gl: WebGLRenderingContext,
  buffers: Buffs,
  programInfo: ProgramInfo,
) {
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

function setColorAttribute(
  gl: WebGLRenderingContext,
  buffers: Buffs,
  programInfo: ProgramInfo,
) {
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
