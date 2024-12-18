export type ProgramInfo = {
  program: WebGLProgram | null;
  attribLocations: {
    vertexPosition: GLint;
    vertexColor: GLint;
  };
  uniformLocations: {
    projectionMatrix: GLint;
    modelViewMatrix: GLint;
  };
  uTime: Number;
};

export type Buffs = {
  position: WebGLBuffer;
  color: WebGLBuffer;
};
