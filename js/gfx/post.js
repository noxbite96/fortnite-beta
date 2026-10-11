// ============================================================
//  Post-traitement léger : halo lumineux (bloom) + légère vignette
// ============================================================
(function () {
  const PP = { enabled: false, strength: 0.55, threshold: 0.82 };
  G.Post = PP;

  let rtMain, rtA, rtB, quad, qScene, qCam, brightMat, blurMat, compMat, w = 0, h = 0;

  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  PP.init = function (renderer) {
    qScene = new THREE.Scene();
    qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    qScene.add(quad);
    brightMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, threshold: { value: PP.threshold } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tex; uniform float threshold; varying vec2 vUv;
        vec3 safe(vec3 c) { if (!(c.r >= 0.0 && c.r < 1e4)) c.r = 0.0; if (!(c.g >= 0.0 && c.g < 1e4)) c.g = 0.0; if (!(c.b >= 0.0 && c.b < 1e4)) c.b = 0.0; return c; }
        void main(){ vec3 c = safe(texture2D(tex, vUv).rgb); float l = max(c.r, max(c.g, c.b));
          float k = smoothstep(threshold, threshold + 0.6, l); gl_FragColor = vec4(c * k, 1.0); }`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    blurMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
        void main(){
          vec3 s = texture2D(tex, vUv).rgb * 0.227;
          s += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316;
          s += (texture2D(tex, vUv + dir * 3.231).rgb + texture2D(tex, vUv - dir * 3.231).rgb) * 0.070;
          gl_FragColor = vec4(s, 1.0); }`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    compMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, bloom: { value: null }, strength: { value: PP.strength }, vig: { value: 0.18 } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tex; uniform sampler2D bloom; uniform float strength; uniform float vig; varying vec2 vUv;
        vec3 safe(vec3 c) { if (!(c.r >= 0.0 && c.r < 1e4)) c.r = 0.0; if (!(c.g >= 0.0 && c.g < 1e4)) c.g = 0.0; if (!(c.b >= 0.0 && c.b < 1e4)) c.b = 0.0; return c; }
        void main(){
          vec3 c = safe(texture2D(tex, vUv).rgb) + safe(texture2D(bloom, vUv).rgb) * strength;
          vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * vig * 2.0;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false, toneMapped: true,
    });
    PP.renderer = renderer;
  };

  function ensure() {
    const r = PP.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    if (size.x === w && size.y === h && rtMain) return;
    w = size.x; h = size.y;
    if (rtMain) { rtMain.dispose(); rtA.dispose(); rtB.dispose(); }
    const q = G.Store.data.settings.quality;
    // format HDR si la carte graphique sait l'afficher, sinon 8 bits
    const ext = r.extensions;
    const hdr = PP.forceLDR ? false : (r.capabilities.isWebGL2 && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')));
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    rtMain = new THREE.WebGLRenderTarget(w, h, { type, samples: q >= 2 && !PP.noMSAA ? 4 : 0 });
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    rtA = new THREE.WebGLRenderTarget(bw, bh, { type });
    rtB = new THREE.WebGLRenderTarget(bw, bh, { type });
    PP.checked = false;
  }
  // Vérifie une fois que les cibles de rendu sont utilisables ; sinon repli progressif
  function check() {
    if (PP.checked) return true;
    PP.checked = true;
    const r = PP.renderer, gl = r.getContext();
    for (const rt of [rtMain, rtA]) {
      r.setRenderTarget(rt);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        r.setRenderTarget(null);
        if (!PP.noMSAA) { PP.noMSAA = true; }
        else if (!PP.forceLDR) { PP.forceLDR = true; }
        else { PP.enabled = false; console.warn('Bloom désactivé : cible de rendu non prise en charge'); return false; }
        w = 0; ensure(); return check();
      }
    }
    r.setRenderTarget(null);
    return true;
  }
  PP.invalidate = function () { w = 0; };

  PP.frameN = 0;
  PP.render = function (scene, camera) {
    const r = PP.renderer;
    // carte des ombres recalculée une image sur deux (sauf qualité épique) : ~250 appels de rendu en moins
    PP.frameN++;
    if (r.shadowMap.autoUpdate) r.shadowMap.autoUpdate = false;
    const q = G.Store && G.Store.data ? G.Store.data.settings.quality : 2;
    r.shadowMap.needsUpdate = q >= 3 || (PP.frameN & 1) === 0 || PP.frameN < 3;
    if (!PP.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    ensure();
    if (!check()) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(rtMain);
    r.render(scene, camera);
    // extraction des zones lumineuses (1/4 de résolution)
    brightMat.uniforms.tex.value = rtMain.texture;
    quad.material = brightMat;
    r.setRenderTarget(rtA); r.render(qScene, qCam);
    // flou séparable x2
    quad.material = blurMat;
    for (let i = 0; i < 2; i++) {
      blurMat.uniforms.tex.value = rtA.texture; blurMat.uniforms.dir.value.set(1 / rtA.width, 0);
      r.setRenderTarget(rtB); r.render(qScene, qCam);
      blurMat.uniforms.tex.value = rtB.texture; blurMat.uniforms.dir.value.set(0, 1 / rtA.height);
      r.setRenderTarget(rtA); r.render(qScene, qCam);
    }
    // composition finale à l'écran
    compMat.uniforms.tex.value = rtMain.texture; compMat.uniforms.bloom.value = rtA.texture;
    compMat.uniforms.strength.value = PP.strength;
    quad.material = compMat;
    r.setRenderTarget(null);
    r.render(qScene, qCam);
  };
})();
