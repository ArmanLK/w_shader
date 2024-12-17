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
};

export type Buffs = {
  position: WebGLBuffer;
  color: WebGlBuffers;
};
