export type ProgramInfo = {
  //program: WebGLProgram | null;
  attribLocations: {
    vertexPosition: GLint;
    vertexColor: GLint;
  };
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    uTime: WebGLUniformLocation;
  };
};

export type Buffs = {
  position: WebGLBuffer;
  color: WebGLBuffer;
};
