"use strict";



/**
 * Global (html5 canvas and gl context)
 * **/
var canvasGL;

/**
 * @type  {WebGLRenderingContext}
 */
var gl;

/**
 * Global (geometry VAO id, shader id, texture id)
 * **/
var sphereVAO;
var triangleVAO;

var shader360;
var texture360;
var modelview;
var projection;
var angleViewX, angleViewY;
var oldMouseX, oldMouseY;

var mouseDown = false;

var nbCount = 0;

let isVideoPlaying = false;

let video;

/**
 * main, mainLoop
 * **/
window.addEventListener("load", main);

function main() {
  // Ajouter les listeners pour indiquer que la vidéo play
  video = document.getElementById("video360");
  video.addEventListener("playing", () => isVideoPlaying = true, true);
  video.addEventListener("ended", () => isVideoPlaying = false, true);
  video.addEventListener("pause", () => isVideoPlaying = false, true);

  canvasGL = document.getElementById("canvasGL");
  gl = canvasGL.getContext("webgl2");
  if (!gl) {
    alert("cant support webGL2 context");
  } else {
    console.log(
      gl.getParameter(gl.VERSION) + " | " +
      gl.getParameter(gl.VENDOR) + " | " +
      gl.getParameter(gl.RENDERER) + " | " +
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    );
    init();
    mainLoop();
    // callback from mouse down
    canvasGL.addEventListener('mousedown', handleMouseDown, false);
    canvasGL.addEventListener('mousemove', handleMouseMove, false);
    canvasGL.addEventListener('mouseup', handleMouseUp, false);

  }
}

/**
 * mainLoop : update, draw, etc
 * **/
function mainLoop() {
  update();
  draw();
  window.requestAnimationFrame(mainLoop);
}

/**
 * init : webGL and data  initializations
 * **/

function init() {
  gl.clearColor(1, 1, 1, 1);
  gl.enable(gl.DEPTH_TEST);

  gl.viewport(0, 0, canvasGL.width, canvasGL.height);

  // initialisation de la texture
  texture360 = initTexture("earth");

  // initialisation des shaders pour le traçage de triangles
  shader360 = initProgram("shader360");

  // Création du triangle vao
  triangleVAO = initTriangleVAO();

  // Création du sphere vao
  sphereVAO = initSphereVAO();

  // Création des projections et modelView
  angleViewX = 0;
  angleViewY = 0;
  projection = new Mat4();
  modelview = new Mat4();
  projection.setFrustum(-0.1, 0.1, -0.1, 0.1, 0.1, 1000);
}

/**
 * @description Initialise un VAO pour tracer des triangles (donc utilise les shaders correspondants etc)
 */
function initTriangleVAO() {
  // position des sommets
  const position = [
    -0.5, 0.5, 0.0,
    0.5, -0.5, 0.0,
    -0.7, -0.9, 0.0
  ];

  // tableau des index pour créer le triangle avec les sommets
  const element = [
    0, 1, 2
  ];

  // tableau des coordonnées de textures pour chaque sommet
  const texCoords = [
    0.5, 0,
    0.5, 1,
    1.0, 0
  ];

  // VBO pour les positions des sommets
  const triangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

  // VBO pour les coordonnées de textures
  const triangleTex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleTex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

  //VBO pour les indices des éléments
  const triangleElementBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleElementBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(element), gl.STATIC_DRAW);

  // init vao
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleElementBuffer);
  gl.enableVertexAttribArray(0); // enable attribut position (location = 0)
  gl.enableVertexAttribArray(1); // enable attribut texCoord (location = 1)

  // Lier les positions de triangle en location 0 (pour le shader)
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE, 0, 0);

  // Lier les coordonnées de texture pour le shader
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleTex);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, gl.FALSE, 0, 0);

  gl.bindVertexArray(null);

  return vao;
}

/**
 * @description Initialise la sphère
 */
function initSphereVAO() {
  // position des sommets pour la sphère
  const p = [];
  const tTemp = []; // utilisé pour initialiser les coordonnées de textures (quick fix dég)
  const nbStack = 20;
  const nbSlice = 20;
  let teta = 0;
  let fi = 0;
  for (let i = 0; i < nbStack; i++) {
    for (let j = 0; j < nbSlice; j++) {
      let x = Math.cos(teta) * Math.sin(fi);
      let y = Math.cos(fi);
      let z = Math.sin(teta) * Math.sin(fi);

      // coordonnées du point P
      p.push(x);
      p.push(y);
      p.push(z);

      // définition de t et s pour les coordonnées de texture (à l'envers parce qu'on va tout remettre à l'endroit après)
      // On doit tout faire à l'envers car j'ai commencé avec nbStack
      let sCoord = teta / (2.0 * Math.PI);
      let tCoord = fi / (Math.PI);
      tTemp.push(tCoord);
      tTemp.push(sCoord);

      teta += (2.0 * Math.PI) / (nbSlice - 1);
    }
    teta = 0;
    fi += Math.PI / (nbStack - 1);
  }



  // tableau des index pour créer le triangle avec les sommets
  const index = [];
  for (let i = 0; i < nbStack - 1; i++) {
    for (let j = 0; j < nbSlice - 1; j++) {
      let bottomLeft = (i * nbSlice) + j;
      let topLeft = bottomLeft + nbSlice;
      let bottomRight = bottomLeft + 1;
      let topRight = topLeft + 1;

      index.push(topLeft);
      index.push(bottomLeft);
      index.push(bottomRight);
      index.push(bottomRight);
      index.push(topRight);
      index.push(topLeft);
    }
  }

  // pour dire à OpenGL le nombre d'index à dessiner dans draw()
  nbCount = index.length;

  // tableau des coordonnées de textures pour chaque sommet
  const t = [];
  // renverser tTemp pour avoir les coordonnées de textures
  // C'est obligé parce qu'on est bête et qu'on a attaqué le problème par stack puis slice au lieu de slice puis stack
  for (let i = tTemp.length - 1; i >= 0; i--) {
    t.push(tTemp[i]);
  }

  // VBO pour les positions des sommets
  const sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.STATIC_DRAW);

  // VBO pour les coordonnées de textures
  const sphereTex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereTex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t), gl.STATIC_DRAW);

  //VBO pour les indices des éléments
  const sphereElementBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereElementBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

  // init vao
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereElementBuffer);
  gl.enableVertexAttribArray(0); // enable attribut position (location = 0)
  gl.enableVertexAttribArray(1); // enable attribut texCoord (location = 1)

  // Lier les positions de triangle en location 0 (pour le shader)
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, gl.FALSE, 0, 0);

  // Lier les coordonnées de texture pour le shader
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereTex);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, gl.FALSE, 0, 0);

  gl.bindVertexArray(null);

  return vao;
}


/**
 * update : 
 * **/

function update() {
  // angleViewY += 0.01
  modelview.setIdentity();

  // Voir la sphère
  //modelview.translate(0, 0, -2);

  // Rentrer dans la sphère
  modelview.translate(0, 0, 0);

  modelview.rotateX(Math.PI); // pour que la vidéo soit à l'endroit
  modelview.rotateX(angleViewX);
  modelview.rotateY(angleViewY);
  // modelview.rotateY(angleViewY);

  // Lire la video et update la texture avec

  if (isVideoPlaying) {
    let imageData = document.getElementById("video360");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture360);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageData);
  } else {
    let imageData = document.getElementById("earth");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture360);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageData);
  }
}



/**
 * draw
  angleViewX += 0.01;
 * **/
angleViewX += 0.01;

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(shader360); // shader

  // Mise en place de la texture en uniform pour le fragment shader
  const textureLocation = gl.getUniformLocation(shader360, 'image');
  gl.uniform1i(textureLocation, 0);

  // Mise en place des uniforms pour les transformations
  const modelviewLocation = gl.getUniformLocation(shader360, 'modelview');
  gl.uniformMatrix4fv(modelviewLocation, gl.FALSE, modelview.fv);
  const projectionLocation = gl.getUniformLocation(shader360, 'projection');
  gl.uniformMatrix4fv(projectionLocation, gl.FALSE, projection.fv);

  // Tracer le triangle
  // gl.bindVertexArray(triangleVAO);
  // gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0); // tracer le triangle avec les index du element

  // Tracer la sphere
  gl.bindVertexArray(sphereVAO);
  gl.drawElements(gl.TRIANGLES, nbCount, gl.UNSIGNED_SHORT, 0); // tracer le triangle avec les index du element


  gl.useProgram(null);
  gl.bindVertexArray(null);

}



/** ****************************************
 *  reads shader (sources in html : tag <script ...type="x-shader"> ) and compile
 * **/
function compileShader(id) {
  var shaderScript = document.getElementById(id);
  var k = shaderScript.firstChild;
  var str = k.textContent;
  console.log(str);
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  }
  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(id + "\n" + gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

/** ******************************************* */
/** create the program shader (vertex+fragment) : 
 *   - sources are in html script tags : id+"-vs" for the vertex shader, id+"-fs" for the fragment shader
 * 
 */
function initProgram(id) {
  var programShader = gl.createProgram();
  var vert = compileShader(id + "-vs");
  var frag = compileShader(id + "-fs");
  gl.attachShader(programShader, vert);
  gl.attachShader(programShader, frag);
  gl.linkProgram(programShader);
  if (!gl.getProgramParameter(programShader, gl.LINK_STATUS)) {
    alert(gl.getProgramInfoLog(programShader));
    return null;
  }
  return programShader;
}

/** *****************************************************
 * Init texture from html id
 * **/

function initTexture(id) {
  var imageData = document.getElementById(id);
  console.log(imageData.nodeType);

  var textureId = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureId);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageData);

  return textureId;

}


/** ******************************************* */
/** call the picking when mouse down (automatically called : see initGL() for the callback set)
 * 
 */
function handleMouseDown(event) {
  // get the mouse relative to canvas
  oldMouseX = event.layerX;
  oldMouseY = event.layerY;
  mouseDown = true;
}

function handleMouseMove(event) {
  // get the mouse relative to canvas
  if (mouseDown) {
    var mouseX = event.layerX;
    var mouseY = event.layerY;

    // Détermination d'angle en X
    const diffMouseX = mouseX - oldMouseX; // distance en X entre la vieille et la nouvelle position de souris

    // SI [je bouge ma souris vers la droite]
    if (diffMouseX >= 0) {
      // ALORS [je tourne vers la droite]
      angleViewY += mapNum(Math.abs(diffMouseX), 0, canvasGL.width, 0, Math.PI); // de 0 à PI = 0 à 180° mais en radians
    }
    // SINON (càd que ma souris se bouge vers la gauche)
    else {
      // ALORS [je tourne vers la gauche]
      angleViewY += -mapNum(Math.abs(diffMouseX), 0, canvasGL.width, 0, Math.PI);
    }

    // Détermination d'angle en Y
    const diffMouseY = mouseY - oldMouseY; // distance en Y entre la vieille et la nouvelle position de souris
    // SI [je bouge ma souris vers le haut]
    if (diffMouseY >= 0) {
      // ALORS [je tourne vers le haut]
      angleViewX += mapNum(Math.abs(diffMouseY), 0, canvasGL.height, 0, Math.PI); // de 0 à PI = 0 à 180° mais en radians
    }
    // SINON (càd que ma souris se bouge vers le bas)
    else {
      // ALORS [je tourne vers le bas]
      angleViewX += -mapNum(Math.abs(diffMouseY), 0, canvasGL.height, 0, Math.PI);
    }

    // mettre à jour pour la prochaine fois
    oldMouseX = mouseX;
    oldMouseY = mouseY;
  }
}

function handleMouseUp(event) {
  mouseDown = false;
}

/**
 * Interpole la valeur de X (qui se trouve dans l'intervalle [A,B] vers une nouvelle valeur qui se trouve dans l'intervalle [C,D]
 * @param {number} X 
 * @param {number} A 
 * @param {number} B 
 * @param {number} C 
 * @param {number} D 
 * @returns {number}
 */
function mapNum(X, A, B, C, D) {
  return (C - D) * ((X - A) / (B - A)) + C;
}