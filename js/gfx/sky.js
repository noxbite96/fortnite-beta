// ============================================================
//  Ciel animé, cycle jour/nuit, lumières, nuages, eau
// ============================================================
(function () {
  const U = G.U;
  const S = {
    time: 9.0,          // heure de la journée
    speed: 1 / 50,      // heures par seconde réelle (1h de jeu = 50 s)
    sunDir: new THREE.Vector3(0.3, 0.8, 0.2).normalize(),
    dayF: 1,
    stormTint: 0,
  };
  G.Sky = S;

  const KEYS = [ // [élévation du soleil, zénith, horizon, lumière soleil, intensité soleil, hémi ciel, hémi sol, intensité hémi]
    [-0.35, 0x050a1c, 0x101a38, 0x8fa8ff, 0.35, 0x2a3a6a, 0x151520, 0.55],
    [-0.08, 0x141c46, 0x3a3060, 0x9aa8ff, 0.25, 0x3a4070, 0x201a24, 0.6],
    [0.02, 0x3a5a9a, 0xff9a5a, 0xffa060, 1.0, 0x8a90c0, 0x5a4030, 0.8],
    [0.15, 0x4a86d8, 0xf6c89a, 0xffd2a0, 2.1, 0xa8c8f0, 0x6a5a40, 1.0],
    [0.4, 0x3d8ae6, 0xb8dcff, 0xfff2de, 2.9, 0xbfdcff, 0x6e6450, 1.15],
    [1.0, 0x3585e8, 0xaad6ff, 0xfff8ec, 3.1, 0xc4e0ff, 0x70684f, 1.2],
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function lerpKey(e) {
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = U.clamp((e - a[0]) / (b[0] - a[0]), 0, 1);
    const out = {};
    const col = (ia) => { cA.setHex(a[ia]); cB.setHex(b[ia]); return cA.clone().lerp(cB, t); };
    out.zenith = col(1); out.horizon = col(2); out.sun = col(3); out.sunI = U.lerp(a[4], b[4], t);
    out.hemiSky = col(5); out.hemiGround = col(6); out.hemiI = U.lerp(a[7], b[7], t);
    return out;
  }

  S.init = function (scene, quality) {
    S.scene = scene;
    // --- dôme du ciel ---
    const skyGeo = new THREE.SphereGeometry(4000, 32, 16);
    S.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
        sunDir: { value: S.sunDir }, sunCol: { value: new THREE.Color() }, time: { value: 0 }, night: { value: 0 },
        storm: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float time; uniform float night; uniform float storm;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, zenith, pow(clamp(h,0.0,1.0), 0.55));
          if (h < 0.0) col = mix(horizon, horizon*0.7, clamp(-h*4.0,0.0,1.0));
          float sd = dot(d, normalize(sunDir));
          col += sunCol * (pow(max(sd,0.0), 900.0) * 6.0 + pow(max(sd,0.0), 12.0) * 0.28 + pow(max(sd,0.0),3.0)*0.08) * (1.0 - night*0.9);
          // lune
          float md = dot(d, -normalize(sunDir));
          col += vec3(0.85,0.9,1.0) * smoothstep(0.9993, 0.9996, md) * night;
          col += vec3(0.3,0.35,0.5) * pow(max(md,0.0), 30.0) * night * 0.4;
          // étoiles
          if (night > 0.01 && h > 0.0) {
            vec2 sp = d.xz / (d.y + 0.3) * 180.0;
            float st = hash(floor(sp));
            float tw = 0.6 + 0.4*sin(time*3.0 + st*50.0);
            col += vec3(1.0) * step(0.9975, st) * night * tw * smoothstep(0.0, 0.2, h) * 0.9;
          }
          // nuages
          if (h > 0.0) {
            vec2 cp = d.xz / (d.y + 0.12) * 1.3 + vec2(time*0.004, time*0.0015);
            float c = fbm(cp * 2.0);
            float dens = smoothstep(0.5, 0.78, c) * smoothstep(0.0, 0.25, h);
            vec3 cc = mix(vec3(1.0), horizon*1.1, 0.25) * (0.65 + 0.35*(1.0-night));
            cc = mix(cc, sunCol, 0.15*(1.0-night));
            cc *= mix(1.0, 0.35, night);
            col = mix(col, cc, dens * 0.85);
          }
          col = mix(col, vec3(0.45,0.2,0.7), storm*0.35);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    S.sky = new THREE.Mesh(skyGeo, S.skyMat);
    S.sky.renderOrder = -10;
    S.sky.frustumCulled = false;
    scene.add(S.sky);

    // --- lumières ---
    S.sun = new THREE.DirectionalLight(0xffffff, 3);
    S.sun.castShadow = true;
    S.setShadowQuality(quality);
    scene.add(S.sun); scene.add(S.sun.target);
    S.hemi = new THREE.HemisphereLight(0xbfdcff, 0x6e6450, 1.1);
    scene.add(S.hemi);
    S.amb = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(S.amb);

    scene.fog = new THREE.Fog(0xaad6ff, 250, 900);

    S.buildClouds(scene);
    S.buildWater(scene);
    S.update(0, new THREE.Vector3(), new THREE.Vector3());
  };

  S.setShadowQuality = function (q) {
    const sun = S.sun;
    const size = q >= 3 ? 4096 : q >= 2 ? 2048 : q >= 1 ? 2048 : 1024;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.mapSize.set(size, size);
    const ext = q >= 3 ? 85 : q >= 2 ? 72 : 60;
    const cam = sun.shadow.camera;
    cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext; cam.near = 1; cam.far = 900;
    cam.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = q >= 2 ? 0.04 : 0.08;
    sun.castShadow = q > 0;
    S.shadowExt = ext;
  };

  S.setViewDistance = function (far) {
    S.viewFar = far;
  };

  // --- nuages 3D stylisés ---
  S.buildClouds = function (scene) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x9aa8c0, emissiveIntensity: 0.35, fog: false });
    const rng = U.RNG(77);
    const blobs = [];
    S.cloudList = [];
    for (let c = 0; c < 34; c++) {
      const cx = rng.range(-1100, 1100), cz = rng.range(-1100, 1100), cy = rng.range(230, 330);
      const n = rng.int(5, 9), size = rng.range(14, 30);
      const cl = { x: cx, y: cy, z: cz, parts: [] };
      for (let i = 0; i < n; i++) {
        const s = size * rng.range(0.55, 1.1);
        cl.parts.push({ ox: rng.range(-size * 1.6, size * 1.6), oy: rng.range(-size * 0.2, size * 0.35), oz: rng.range(-size * 0.8, size * 0.8), s, sy: s * rng.range(0.55, 0.8) });
      }
      S.cloudList.push(cl);
      blobs.push(...cl.parts);
    }
    S.clouds = new THREE.InstancedMesh(geo, mat, blobs.length);
    S.clouds.frustumCulled = false;
    scene.add(S.clouds);
    S.updateClouds(0);
  };
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  S.updateClouds = function (dt) {
    let k = 0;
    for (const cl of S.cloudList) {
      cl.x += dt * 3.5;
      if (cl.x > 1300) cl.x -= 2600;
      for (const p of cl.parts) {
        p4.set(cl.x + p.ox, cl.y + p.oy, cl.z + p.oz); s4.set(p.s, p.sy, p.s);
        m4.compose(p4, q4, s4);
        S.clouds.setMatrixAt(k++, m4);
      }
    }
    S.clouds.instanceMatrix.needsUpdate = true;
  };

  // --- eau animée ---
  S.buildWater = function (scene) {
    const T = G.Terrain, N = T.N, H = T.H;
    // texture de profondeur (0..21 m -> 0..255)
    const data = new Uint8Array((N + 1) * (N + 1) * 4);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const h = H[j * (N + 1) + i];
      const dpt = U.clamp(-h * 12, 0, 255);
      const k = (j * (N + 1) + i) * 4;
      data[k] = dpt; data[k + 1] = dpt; data[k + 2] = dpt; data[k + 3] = 255;
    }
    const depthTex = new THREE.DataTexture(data, N + 1, N + 1, THREE.RGBAFormat);
    depthTex.magFilter = THREE.LinearFilter; depthTex.minFilter = THREE.LinearFilter;
    depthTex.needsUpdate = true;
    S.waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 }, depthTex: { value: depthTex }, W: { value: T.W },
        sunDir: { value: S.sunDir }, sunCol: { value: new THREE.Color(1, 1, 1) }, skyCol: { value: new THREE.Color(0.6, 0.8, 1) },
        fogColor: { value: new THREE.Color() }, fogNear: { value: 200 }, fogFar: { value: 900 }, night: { value: 0 }, light: { value: 1 },
      },
      vertexShader: `
        uniform float time; varying vec3 vW; varying float vFog;
        void main(){
          vec4 w = modelMatrix * vec4(position,1.0);
          w.y += sin(w.x*0.05 + time*1.1)*0.12 + cos(w.z*0.06 + time*0.9)*0.12;
          vW = w.xyz;
          vec4 mv = viewMatrix * w;
          vFog = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float time; uniform sampler2D depthTex; uniform float W; uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 skyCol;
        uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; uniform float night; uniform float light;
        varying vec3 vW; varying float vFog;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 uv = (vW.xz + W) / (2.0*W);
          float depth = texture2D(depthTex, uv).r * 255.0 / 12.0;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) depth = 21.0;
          // normale animée
          vec2 p = vW.xz;
          float e = 0.6;
          float h0 = n2(p*0.18 + vec2(time*0.35, time*0.2)) + 0.5*n2(p*0.45 - vec2(time*0.5, -time*0.3));
          float hx = n2((p+vec2(e,0.0))*0.18 + vec2(time*0.35, time*0.2)) + 0.5*n2((p+vec2(e,0.0))*0.45 - vec2(time*0.5, -time*0.3));
          float hz = n2((p+vec2(0.0,e))*0.18 + vec2(time*0.35, time*0.2)) + 0.5*n2((p+vec2(0.0,e))*0.45 - vec2(time*0.5, -time*0.3));
          vec3 n = normalize(vec3((h0-hx)*1.2, 1.0, (h0-hz)*1.2));
          vec3 v = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          vec3 shallow = vec3(0.30, 0.86, 0.82);
          vec3 deep = vec3(0.05, 0.36, 0.62);
          vec3 col = mix(shallow, deep, smoothstep(0.0, 7.0, depth));
          col = mix(col, skyCol, fres * 0.55);
          vec3 hv = normalize(normalize(sunDir) + v);
          float spec = pow(max(dot(n, hv), 0.0), 180.0);
          col *= light;
          col += sunCol * spec * 1.6 * (1.0 - night*0.8);
          // écume sur les rives
          float foamN = n2(p*0.9 + vec2(time*0.6, 0.0));
          float foamBand = smoothstep(0.9, 0.0, depth) * (0.6 + 0.4*sin(depth*12.0 - time*2.5 + foamN*3.0));
          col = mix(col, vec3(1.0), clamp(foamBand * 0.85, 0.0, 1.0) * light);
          float alpha = mix(0.55, 0.93, smoothstep(0.0, 3.0, depth));
          float f = smoothstep(fogNear, fogFar, vFog);
          col = mix(col, fogColor, f);
          gl_FragColor = vec4(col, alpha);
          #include <colorspace_fragment>
        }`,
    });
    const geo = new THREE.PlaneGeometry(5000, 5000, 200, 200);
    geo.rotateX(-Math.PI / 2);
    S.water = new THREE.Mesh(geo, S.waterMat);
    S.water.position.y = 0;
    S.water.renderOrder = 1;
    scene.add(S.water);
  };

  S.update = function (dt, camPos, focus) {
    S.time = (S.time + dt * S.speed) % 24;
    const t = S.time;
    const el = Math.sin((t - 6) / 12 * Math.PI);           // -1..1
    const az = (t - 6) / 12 * Math.PI;                       // du levant au couchant
    let sx = Math.cos(az), sy = el, sz = 0.35;
    // de nuit, la lumière vient de la lune (opposée)
    S.sunDir.set(sx, Math.max(sy, -1), sz).normalize();
    const k = lerpKey(el);
    S.dayF = U.smoothstep(-0.1, 0.2, el);
    const night = 1 - U.smoothstep(-0.25, 0.05, el);
    S.night = night;
    const storm = S.stormTint;
    const rain = G.Weather ? G.Weather.rain : 0;
    const sk = S.skyMat.uniforms;
    sk.zenith.value.copy(k.zenith); sk.horizon.value.copy(k.horizon); sk.sunCol.value.copy(k.sun);
    if (rain > 0) {
      const grey = S._grey || (S._grey = new THREE.Color());
      grey.setRGB(0.36, 0.4, 0.46).multiplyScalar(0.35 + 0.65 * S.dayF);
      sk.zenith.value.lerp(grey, rain * 0.75); sk.horizon.value.lerp(grey, rain * 0.6);
      if (G.Weather.flash > 0) { sk.zenith.value.lerp(S._white || (S._white = new THREE.Color(0xdfe8ff)), G.Weather.flash * 0.6); sk.horizon.value.lerp(S._white, G.Weather.flash * 0.5); }
    }
    sk.time.value += dt; sk.night.value = night; sk.storm.value = storm;
    S.sky.position.copy(camPos);
    // soleil (ou lune)
    const lightDir = el > -0.05 ? S.sunDir : S.tmpMoon || (S.tmpMoon = new THREE.Vector3());
    if (el <= -0.05) S.tmpMoon.copy(S.sunDir).multiplyScalar(-1).setY(Math.abs(S.sunDir.y) * 0.9 + 0.3).normalize();
    S.sun.color.copy(k.sun);
    S.sun.intensity = k.sunI * (1 - 0.75 * rain) + ((G.Weather && G.Weather.flash) || 0) * 1.5;
    S.sun.position.copy(focus).addScaledVector(lightDir, 400);
    S.sun.target.position.copy(focus);
    // stabilisation de l'ombre (évite le scintillement)
    const texel = (S.shadowExt * 2) / S.sun.shadow.mapSize.x;
    S.sun.target.position.x = Math.round(focus.x / texel) * texel; S.sun.target.position.z = Math.round(focus.z / texel) * texel;
    S.sun.position.x = S.sun.target.position.x + lightDir.x * 400; S.sun.position.z = S.sun.target.position.z + lightDir.z * 400;
    S.sun.target.updateMatrixWorld();
    S.hemi.color.copy(k.hemiSky); S.hemi.groundColor.copy(k.hemiGround); S.hemi.intensity = k.hemiI * (1 - 0.4 * rain);
    S.amb.intensity = (0.12 + 0.3 * S.dayF) * (1 - 0.3 * rain); // intérieurs plus lisibles
    if (S.scene.fog) {
      const fogC = S.scene.fog.color;
      fogC.copy(k.horizon).lerp(k.zenith, 0.15);
      if (rain > 0) fogC.lerp(S._grey, rain * 0.7);
      if (storm > 0) fogC.lerp(new THREE.Color(0x6a3a9a), storm * 0.5);
      S.scene.fog.far = (S.viewFar || 900) * (1 - storm * 0.55) * (1 - rain * 0.45);
      S.scene.fog.near = Math.min(S.scene.fog.far * 0.3, 220);
      if (G.renderer && S.scene === G.scene) G.renderer.setClearColor(fogC);
    }
    // eau
    const wu = S.waterMat.uniforms;
    wu.time.value += dt; wu.sunCol.value.copy(k.sun); wu.skyCol.value.copy(k.horizon).lerp(k.zenith, 0.4);
    wu.fogColor.value.copy(S.scene.fog.color); wu.fogNear.value = S.scene.fog.near; wu.fogFar.value = S.scene.fog.far;
    wu.night.value = night; wu.light.value = U.lerp(0.25, 1.0, S.dayF);
    S.water.position.x = Math.round(camPos.x / 25) * 25; S.water.position.z = Math.round(camPos.z / 25) * 25;
    // nuages
    S.updateClouds(dt);
    S.clouds.material.emissiveIntensity = U.lerp(0.05, 0.35, S.dayF);
    S.clouds.material.color.setScalar(U.lerp(0.25, 1, S.dayF) * (1 - 0.5 * rain));
  };

  S.hourString = function () {
    const h = Math.floor(S.time), m = Math.floor((S.time - h) * 60);
    return U.fmt2(h) + ':' + U.fmt2(m);
  };
})();
