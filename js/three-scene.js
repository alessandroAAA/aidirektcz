/* ============================================
   AI-Direkt — Three.js Hero Scene
   Interactive molecular/neural network animation
   ============================================ */

(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // --- Colors ---
    const COLOR_PRIMARY = new THREE.Color(0x6366f1);
    const COLOR_SECONDARY = new THREE.Color(0x06b6d4);
    const COLOR_TERTIARY = new THREE.Color(0x10b981);

    // --- Mouse tracking ---
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    document.addEventListener('mousemove', (e) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // --- Create particle network (molecular/neural) ---
    const NODE_COUNT = 120;
    const SPREAD = 40;

    // Node positions
    const nodes = [];
    const velocities = [];

    for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
            x: (Math.random() - 0.5) * SPREAD,
            y: (Math.random() - 0.5) * SPREAD,
            z: (Math.random() - 0.5) * 20,
            baseX: 0,
            baseY: 0,
            baseZ: 0,
        });
        nodes[i].baseX = nodes[i].x;
        nodes[i].baseY = nodes[i].y;
        nodes[i].baseZ = nodes[i].z;

        velocities.push({
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.005,
        });
    }

    // --- Particle system (nodes) ---
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NODE_COUNT * 3);
    const colors = new Float32Array(NODE_COUNT * 3);
    const sizes = new Float32Array(NODE_COUNT);

    for (let i = 0; i < NODE_COUNT; i++) {
        positions[i * 3] = nodes[i].x;
        positions[i * 3 + 1] = nodes[i].y;
        positions[i * 3 + 2] = nodes[i].z;

        // Gradient color assignment
        const t = Math.random();
        const color = t < 0.33
            ? COLOR_PRIMARY.clone().lerp(COLOR_SECONDARY, t * 3)
            : t < 0.66
                ? COLOR_SECONDARY.clone().lerp(COLOR_TERTIARY, (t - 0.33) * 3)
                : COLOR_TERTIARY.clone().lerp(COLOR_PRIMARY, (t - 0.66) * 3);

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 2 + 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float dist = length(mvPosition.xyz);
                vAlpha = smoothstep(40.0, 5.0, dist) * 0.8;
                gl_PointSize = size * uPixelRatio * (15.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- Connection lines ---
    const MAX_CONNECTIONS = 300;
    const CONNECTION_DIST = 8;

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(MAX_CONNECTIONS * 6);
    const lineColors = new Float32Array(MAX_CONNECTIONS * 6);

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // --- Central glow (DNA helix core) ---
    const helixGroup = new THREE.Group();
    scene.add(helixGroup);

    const HELIX_POINTS = 80;
    const helixPositionsA = [];
    const helixPositionsB = [];

    for (let i = 0; i < HELIX_POINTS; i++) {
        const t = (i / HELIX_POINTS) * Math.PI * 4;
        const y = (i / HELIX_POINTS - 0.5) * 20;
        helixPositionsA.push(new THREE.Vector3(Math.cos(t) * 3, y, Math.sin(t) * 3));
        helixPositionsB.push(new THREE.Vector3(Math.cos(t + Math.PI) * 3, y, Math.sin(t + Math.PI) * 3));
    }

    const helixCurveA = new THREE.CatmullRomCurve3(helixPositionsA);
    const helixCurveB = new THREE.CatmullRomCurve3(helixPositionsB);

    const helixGeomA = new THREE.TubeGeometry(helixCurveA, 200, 0.08, 8, false);
    const helixGeomB = new THREE.TubeGeometry(helixCurveB, 200, 0.08, 8, false);

    const helixMat = new THREE.MeshBasicMaterial({
        color: COLOR_PRIMARY,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
    });

    helixGroup.add(new THREE.Mesh(helixGeomA, helixMat));
    helixGroup.add(new THREE.Mesh(helixGeomB, helixMat.clone()));
    helixGroup.children[1].material.color = COLOR_SECONDARY;

    // Helix rungs
    for (let i = 0; i < HELIX_POINTS; i += 4) {
        const rungGeom = new THREE.BufferGeometry().setFromPoints([
            helixPositionsA[i],
            helixPositionsB[i],
        ]);
        const rungMat = new THREE.LineBasicMaterial({
            color: COLOR_TERTIARY,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
        });
        helixGroup.add(new THREE.Line(rungGeom, rungMat));
    }

    helixGroup.position.x = 12;
    helixGroup.rotation.z = 0.3;

    // --- Floating ring ---
    const ringGeom = new THREE.TorusGeometry(6, 0.05, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
        color: COLOR_SECONDARY,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(-10, -2, -5);
    ring.rotation.x = Math.PI * 0.4;
    scene.add(ring);

    const ring2 = ring.clone();
    ring2.material = ringMat.clone();
    ring2.material.color = COLOR_PRIMARY;
    ring2.scale.set(1.3, 1.3, 1.3);
    ring2.rotation.x = Math.PI * 0.6;
    ring2.position.set(-10, -2, -5);
    scene.add(ring2);

    // --- Animation loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();
        const delta = clock.getDelta();

        // Smooth mouse
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        // Update nodes
        const posAttr = particleGeometry.attributes.position;
        for (let i = 0; i < NODE_COUNT; i++) {
            const node = nodes[i];
            node.x = node.baseX + Math.sin(elapsed * 0.3 + i * 0.1) * 0.5 + mouse.x * 2;
            node.y = node.baseY + Math.cos(elapsed * 0.2 + i * 0.15) * 0.5 + mouse.y * 2;
            node.z = node.baseZ + Math.sin(elapsed * 0.1 + i * 0.05) * 0.3;

            posAttr.array[i * 3] = node.x;
            posAttr.array[i * 3 + 1] = node.y;
            posAttr.array[i * 3 + 2] = node.z;
        }
        posAttr.needsUpdate = true;

        // Update connections
        let lineIdx = 0;
        const lp = lineGeometry.attributes.position;
        const lc = lineGeometry.attributes.color;

        for (let i = 0; i < NODE_COUNT && lineIdx < MAX_CONNECTIONS; i++) {
            for (let j = i + 1; j < NODE_COUNT && lineIdx < MAX_CONNECTIONS; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dz = nodes[i].z - nodes[j].z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < CONNECTION_DIST) {
                    const k = lineIdx * 6;
                    lp.array[k] = nodes[i].x;
                    lp.array[k + 1] = nodes[i].y;
                    lp.array[k + 2] = nodes[i].z;
                    lp.array[k + 3] = nodes[j].x;
                    lp.array[k + 4] = nodes[j].y;
                    lp.array[k + 5] = nodes[j].z;

                    const fade = 1 - dist / CONNECTION_DIST;
                    lc.array[k] = COLOR_PRIMARY.r * fade;
                    lc.array[k + 1] = COLOR_PRIMARY.g * fade;
                    lc.array[k + 2] = COLOR_PRIMARY.b * fade;
                    lc.array[k + 3] = COLOR_SECONDARY.r * fade;
                    lc.array[k + 4] = COLOR_SECONDARY.g * fade;
                    lc.array[k + 5] = COLOR_SECONDARY.b * fade;

                    lineIdx++;
                }
            }
        }
        lineGeometry.setDrawRange(0, lineIdx * 2);
        lp.needsUpdate = true;
        lc.needsUpdate = true;

        // Animate helix
        helixGroup.rotation.y = elapsed * 0.15;
        helixGroup.position.y = Math.sin(elapsed * 0.3) * 0.5;

        // Animate rings
        ring.rotation.z = elapsed * 0.2;
        ring.rotation.y = elapsed * 0.1;
        ring2.rotation.z = -elapsed * 0.15;
        ring2.rotation.y = -elapsed * 0.08;

        // Camera subtle movement
        camera.position.x = mouse.x * 2;
        camera.position.y = mouse.y * 1.5;
        camera.lookAt(0, 0, 0);

        // Update uniforms
        particleMaterial.uniforms.uTime.value = elapsed;

        renderer.render(scene, camera);
    }

    animate();

    // --- Resize ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    });
})();
