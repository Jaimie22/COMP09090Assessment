


// ----- SETTING UP -----
const canvas = document.getElementById("renderCanvas");

// Create the Babylon engine. It draws our scene onto the canvas.
// "true" turns on antialiasing, which smooths jagged edges.
const engine = new BABYLON.Engine(canvas, true);


// ----- BUILDING THE SCENE -----
const createScene = function () {

    // The scene is the "world" that holds everything we create.
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 1.3, 16, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // How close and how far the camera can zoom
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 30;

    // How high and low the camera can go (stops it flipping upside down over the top or bottom)
    camera.lowerBetaLimit = 0.4;
    camera.upperBetaLimit = 2.6;

    // Stop the camera sliding sideways (right-click drag), and make zooming smooth
    camera.panningSensibility = 0;
    camera.wheelDeltaPercentage = 0.01;


    // Draws the space image using code. It is "equirectangular", the same
    // stretched-out shape as a world map, which wraps perfectly into a full 360 view.
    function drawStarfield() {
        const W = 4096; // image width
        const H = 2048; // image height
        const starCanvas = document.createElement("canvas");
        starCanvas.width = W;
        starCanvas.height = H;
        const paint = starCanvas.getContext("2d");


        function drawPlanet(x, y, radius, lightColour, darkColour, hasRing) {
            // The back half of the ring (drawn first, so the planet covers it)
            if (hasRing) {
                paint.strokeStyle = "rgba(220, 200, 170, 0.6)";
                paint.lineWidth = radius * 0.12;
                paint.beginPath();
                paint.ellipse(x, y, radius * 2.1, radius * 0.5, -0.3, Math.PI, Math.PI * 2);
                paint.stroke();
            }

            // The planet: bright where the light hits it, fading to dark on the far side
            const shading = paint.createRadialGradient(x - radius * 0.4, y - radius * 0.4, radius * 0.1, x, y, radius);
            shading.addColorStop(0, lightColour);
            shading.addColorStop(1, darkColour);
            paint.fillStyle = shading;
            paint.beginPath();
            paint.arc(x, y, radius, 0, Math.PI * 2);
            paint.fill();

            // The front half of the ring (drawn last, so it passes in front of the planet)
            if (hasRing) {
                paint.beginPath();
                paint.ellipse(x, y, radius * 2.1, radius * 0.5, -0.3, 0, Math.PI);
                paint.stroke();
            }
        }

        function drawGalaxy(x, y, size, angle) {
            paint.save();                // remember the normal drawing settings
            paint.translate(x, y);       // move to where the galaxy goes
            paint.rotate(angle);         // tilt it
            paint.scale(1, 0.35);        // squash it into an oval
            const glow = paint.createRadialGradient(0, 0, 0, 0, 0, size);
            glow.addColorStop(0, "rgba(255, 240, 220, 0.9)");  
            glow.addColorStop(0.2, "rgba(200, 180, 255, 0.35)"); 
            glow.addColorStop(1, "rgba(0, 0, 0, 0)");         
            paint.fillStyle = glow;
            paint.beginPath();
            paint.arc(0, 0, size, 0, Math.PI * 2);
            paint.fill();
            paint.restore();         
        }

        // --- Helper: a bright star with a soft coloured glow ---
        function drawBrightStar(x, y, radius, glowColour) {
            const glow = paint.createRadialGradient(x, y, 0, x, y, radius);
            glow.addColorStop(0, "rgba(255, 255, 255, 1)");
            glow.addColorStop(0.15, glowColour);
            glow.addColorStop(1, "rgba(0, 0, 0, 0)");
            paint.fillStyle = glow;
            paint.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        // 1) Deep black background
        paint.fillStyle = "#000003";
        paint.fillRect(0, 0, W, H);

        // 2) Nebula clouds: big, soft, coloured patches
        const nebulaColours = ["rgba(90, 40, 140, 0.25)", "rgba(30, 60, 140, 0.2)", "rgba(160, 70, 40, 0.15)"];
        for (let i = 0; i < 14; i++) {
            const x = Math.random() * W;
            const y = H * 0.2 + Math.random() * H * 0.6;
            const radius = 200 + Math.random() * 500;

            // Each cloud is drawn three times (left, middle, right) so clouds that
            // cross the edge of the image join up seamlessly when it wraps around
            [-W, 0, W].forEach(offset => {
                const cloud = paint.createRadialGradient(x + offset, y, 0, x + offset, y, radius);
                cloud.addColorStop(0, nebulaColours[i % 3]);
                cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
                paint.fillStyle = cloud;
                paint.fillRect(x + offset - radius, y - radius, radius * 2, radius * 2);
            });
        }

        // 3) Thousands of tiny stars of different brightness
        for (let i = 0; i < 6000; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const size = Math.random() < 0.95 ? 1 : 2; // most are tiny, a few are bigger
            const brightness = 0.3 + Math.random() * 0.7;
            paint.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            paint.fillRect(x, y, size, size);
        }

        // 4) A handful of bright stars with coloured glows
        const glowColours = ["rgba(150, 180, 255, 0.5)", "rgba(255, 200, 150, 0.5)", "rgba(255, 255, 255, 0.4)"];
        for (let i = 0; i < 25; i++) {
            drawBrightStar(Math.random() * W, H * 0.15 + Math.random() * H * 0.7, 15 + Math.random() * 25, glowColours[i % 3]);
        }

        // 5) Distant galaxies
        drawGalaxy(W * 0.15, H * 0.35, 180, 0.6);
        drawGalaxy(W * 0.62, H * 0.64, 120, -0.4);
        drawGalaxy(W * 0.86, H * 0.3, 90, 1.1);

        // 6) A distant star system: a big glowing star with tiny planets around it
        drawBrightStar(W * 0.44, H * 0.4, 70, "rgba(255, 220, 160, 0.6)");
        drawPlanet(W * 0.44 + 60, H * 0.4 + 10, 5, "#aaaaaa", "#111111", false);
        drawPlanet(W * 0.44 - 90, H * 0.4 - 15, 7, "#c9a27a", "#140a02", false);
        drawPlanet(W * 0.44 + 130, H * 0.4 - 25, 4, "#88aacc", "#050a14", false);

        // 7) Planets
        drawPlanet(W * 0.3, H * 0.55, 140, "#c98a5b", "#2a1408", true);               // ringed gas giant
        drawPlanet(W * 0.3 + 260, H * 0.55 - 120, 28, "#d9d9d9", "#222222", false);   // its moon
        drawPlanet(W * 0.72, H * 0.42, 80, "#6fa8dc", "#06142a", false);               // icy blue planet
        drawPlanet(W * 0.93, H * 0.6, 50, "#a3c47a", "#0d1a05", false);                // small green world

        // Turn the drawing into an image address that Babylon can load
        return starCanvas.toDataURL();
    }

    // The sky box: a giant box we see from the inside.
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
    const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false; // show the inside of the box

    // Wrap the 360 image around the inside of the box.
    skyMat.reflectionTexture = new BABYLON.EquiRectangularCubeTexture(drawStarfield(), scene, 1024);
    skyMat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;

    // Black diffuse and specular, so lights don't change the colour of the sky
    skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyMat;

    // The sky moves with the camera, so the stars always feel infinitely far away
    skybox.infiniteDistance = true;


    // a) A very faint, cold blue light everywhere, so shadows are never fully black
    const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.15;
    ambient.diffuse = new BABYLON.Color3(0.5, 0.6, 1);
    ambient.groundColor = new BABYLON.Color3(0.05, 0.05, 0.1);
    ambient.specular = new BABYLON.Color3(0, 0, 0); // no shiny highlights from this light

    // b) The main light: warm orange, shining from TON 618's direction towards us
    const diskLight = new BABYLON.DirectionalLight("diskLight", new BABYLON.Vector3(0, -0.25, -1), scene);
    diskLight.diffuse = new BABYLON.Color3(1, 0.55, 0.2);
    diskLight.intensity = 1.4;

    // c) A weaker, cold blue "starlight" from the other side, so the front isn't too dark
    const starLight = new BABYLON.DirectionalLight("starLight", new BABYLON.Vector3(0.6, -0.6, 1), scene);
    starLight.diffuse = new BABYLON.Color3(0.4, 0.5, 0.9);
    starLight.intensity = 0.5;

    // (d) The shoulder torch is created further down, once the astronaut exists.
    // (e) The glow effect is created in the TON 618 section.


    // White spacesuit fabric
    const suitMat = new BABYLON.StandardMaterial("suitMat", scene);
    suitMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.92);
    suitMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Gold, shiny helmet visor
    const visorMat = new BABYLON.StandardMaterial("visorMat", scene);
    visorMat.diffuseColor = new BABYLON.Color3(0.75, 0.55, 0.15);
    visorMat.specularColor = new BABYLON.Color3(1, 0.9, 0.6);
    visorMat.specularPower = 64; // a small, sharp highlight, like polished metal

    // Grey metal for the backpack, torch and shuttle engines
    const metalMat = new BABYLON.StandardMaterial("metalMat", scene);
    metalMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);

    // Off-white shuttle panels
    const shuttleMat = new BABYLON.StandardMaterial("shuttleMat", scene);
    shuttleMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85);
    shuttleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    // Pale grey moon rock, a little lighter so the moon stands out against space
    const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
    moonMat.diffuseColor = new BABYLON.Color3(0.5, 0.48, 0.46);
    moonMat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);

    const astronaut = new BABYLON.TransformNode("astronaut", scene);

    const body = BABYLON.MeshBuilder.CreateCapsule("body", { height: 2, radius: 0.5 }, scene);
    body.material = suitMat;
    body.parent = astronaut;

    const helmet = BABYLON.MeshBuilder.CreateSphere("helmet", { diameter: 1.1 }, scene);
    helmet.position.y = 1.3;
    helmet.material = suitMat;
    helmet.parent = astronaut;

    // Visor: a squashed sphere on the front of the helmet
    const visor = BABYLON.MeshBuilder.CreateSphere("visor", { diameter: 0.85 }, scene);
    visor.scaling = new BABYLON.Vector3(1, 0.8, 0.6);
    visor.position = new BABYLON.Vector3(0, 1.32, -0.33);
    visor.material = visorMat;
    visor.parent = astronaut;

    const backpack = BABYLON.MeshBuilder.CreateBox("backpack", { width: 0.8, height: 1, depth: 0.4 }, scene);
    backpack.position = new BABYLON.Vector3(0, 0.2, 0.45);
    backpack.material = metalMat;
    backpack.parent = astronaut;

    // Arms and legs (-1 = left side, 1 = right side)
    [-1, 1].forEach(side => {
        const arm = BABYLON.MeshBuilder.CreateCapsule("arm" + side, { height: 1.4, radius: 0.18 }, scene);
        arm.position = new BABYLON.Vector3(0.75 * side, 0.05, 0);
        arm.rotation.z = 0.35 * side;
        arm.material = suitMat;
        arm.parent = astronaut;

        const leg = BABYLON.MeshBuilder.CreateCapsule("leg" + side, { height: 1.5, radius: 0.22 }, scene);
        leg.position = new BABYLON.Vector3(0.28 * side, -1.45, 0);
        leg.rotation.z = 0.12 * side;
        leg.material = suitMat;
        leg.parent = astronaut;
    });

    //This creates the shoulder torch.
    const torchMount = new BABYLON.TransformNode("torchMount", scene);
    torchMount.parent = astronaut;
    torchMount.position = new BABYLON.Vector3(0.5, 0.85, -0.15); // on top of the shoulder
    torchMount.rotation.x = -0.1; // tipped very slightly downwards

    // The torch body: a short metal tube, lying along the direction it points
    const torchBody = BABYLON.MeshBuilder.CreateCylinder("torchBody", { height: 0.5, diameter: 0.2 }, scene);
    torchBody.rotation.x = Math.PI / 2; // lay the tube down so it points forwards
    torchBody.material = metalMat;
    torchBody.parent = torchMount;

    // The lens: a thin disc on the front of the torch that glows when it's on
    const lensMat = new BABYLON.StandardMaterial("lensMat", scene);
    lensMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    const lensOnColour = new BABYLON.Color3(0.9, 0.95, 1);      // bright blue-white
    const lensOffColour = new BABYLON.Color3(0.05, 0.05, 0.05); // nearly black
    lensMat.emissiveColor = lensOnColour;

    const lens = BABYLON.MeshBuilder.CreateCylinder("lens", { height: 0.04, diameter: 0.2 }, scene);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.26; // at the very front of the torch
    lens.material = lensMat;
    lens.parent = torchMount;

    // The light itself: a spotlight shining straight out of the front of the torch.
    // The numbers are: where it starts, which way it points, how wide the beam is,
    // and how quickly it fades towards the edges.
    const torchLight = new BABYLON.SpotLight("torchLight", new BABYLON.Vector3(0, 0, -0.3), new BABYLON.Vector3(0, 0, -1), Math.PI / 4, 2, scene);
    torchLight.parent = torchMount;
    torchLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1); // slightly blue-white, like an LED
    torchLight.intensity = 3;
    torchLight.range = 40; // how far the beam reaches

    // A faint, see-through cone of light in the air, so you can see the beam itself.
    // It's a cone (a cylinder with a tiny top) that's narrow at the torch and wide at the far end.
    const beamMat = new BABYLON.StandardMaterial("beamMat", scene);
    beamMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    beamMat.emissiveColor = new BABYLON.Color3(0.9, 0.95, 1);
    beamMat.alpha = 0.07;            // very see-through
    beamMat.disableLighting = true;  // lights don't change it
    beamMat.backFaceCulling = false; // visible from inside and outside

    const beamLength = 10;
    const beam = BABYLON.MeshBuilder.CreateCylinder("beam", { height: beamLength, diameterTop: 0.15, diameterBottom: 6, tessellation: 32 }, scene);
    beam.rotation.x = Math.PI / 2;             
    beam.position.z = -(beamLength / 2 + 0.3); 
    beam.material = beamMat;
    beam.isPickable = false;                  
    beam.parent = torchMount;


    // Creating the Shuttle.
    const shuttle = new BABYLON.TransformNode("shuttle", scene);

    const fuselage = BABYLON.MeshBuilder.CreateCylinder("fuselage", { height: 10, diameter: 2 }, scene);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.parent = shuttle;

    const nose = BABYLON.MeshBuilder.CreateCylinder("nose", { height: 2, diameterTop: 0, diameterBottom: 2 }, scene);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 6;
    nose.parent = shuttle;

    const wings = BABYLON.MeshBuilder.CreateBox("wings", { width: 4, height: 0.2, depth: 9 }, scene);
    wings.position = new BABYLON.Vector3(-1.5, -0.6, 0);
    wings.parent = shuttle;

    const tailFin = BABYLON.MeshBuilder.CreateBox("tailFin", { width: 2.5, height: 2.5, depth: 0.2 }, scene);
    tailFin.position = new BABYLON.Vector3(-4, 1.8, 0);
    tailFin.rotation.z = 0.3;
    tailFin.parent = shuttle;

    const cargoBay = BABYLON.MeshBuilder.CreateBox("cargoBay", { width: 6, height: 0.3, depth: 1.4 }, scene);
    cargoBay.position = new BABYLON.Vector3(0.5, 1, 0);
    cargoBay.parent = shuttle;

    // Paint the shuttle's panels off-white
    shuttle.getChildMeshes().forEach(part => part.material = shuttleMat);

    // Engines in dark metal
    [new BABYLON.Vector3(-5.5, 0.4, 0.5), new BABYLON.Vector3(-5.5, 0.4, -0.5), new BABYLON.Vector3(-5.5, -0.3, 0)].forEach((position, index) => {
        const engineNozzle = BABYLON.MeshBuilder.CreateCylinder("engine" + index, { height: 1, diameter: 0.7 }, scene);
        engineNozzle.rotation.z = Math.PI / 2;
        engineNozzle.position = position;
        engineNozzle.material = metalMat;
        engineNozzle.parent = shuttle;
    });

    // Place the shuttle directly behind the astronaut, side-on to the camera
    shuttle.position = new BABYLON.Vector3(0, -1, 14);
    shuttle.rotation = new BABYLON.Vector3(0, 0.2, 0.15);
    shuttle.scaling = new BABYLON.Vector3(1.6, 1.6, 1.6);


    //this creates the moon's height map, which is a black-and-white image that tells Babylon how to reshape the moon's surface.
    function drawHeightMap() {
        const W = 512;
        const H = 256;
        const mapCanvas = document.createElement("canvas");
        mapCanvas.width = W;
        mapCanvas.height = H;
        const paint = mapCanvas.getContext("2d");

        // Start with mid-grey: the moon's normal surface height
        paint.fillStyle = "rgb(110, 110, 110)";
        paint.fillRect(0, 0, W, H);

        // Hills: soft white patches raise the surface.
        // Drawn three times (left, middle, right) so they join up where the map wraps around.
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const radius = 15 + Math.random() * 40;
            [-W, 0, W].forEach(offset => {
                const hill = paint.createRadialGradient(x + offset, y, 0, x + offset, y, radius);
                hill.addColorStop(0, "rgba(255, 255, 255, 0.2)");
                hill.addColorStop(1, "rgba(255, 255, 255, 0)");
                paint.fillStyle = hill;
                paint.fillRect(x + offset - radius, y - radius, radius * 2, radius * 2);
            });
        }

        // Craters: a dark centre that dips down, with a soft bright ring around it that rises up
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * W;
            const y = H * 0.15 + Math.random() * H * 0.7; // keep craters away from the poles
            const radius = 6 + Math.random() * 22;
            [-W, 0, W].forEach(offset => {
                const cx = x + offset;

                // The dip
                const pit = paint.createRadialGradient(cx, y, 0, cx, y, radius);
                pit.addColorStop(0, "rgba(0, 0, 0, 0.6)");
                pit.addColorStop(1, "rgba(0, 0, 0, 0)");
                paint.fillStyle = pit;
                paint.fillRect(cx - radius, y - radius, radius * 2, radius * 2);

                // The raised rim
                const rim = paint.createRadialGradient(cx, y, radius * 0.7, cx, y, radius * 1.3);
                rim.addColorStop(0, "rgba(255, 255, 255, 0)");
                rim.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
                rim.addColorStop(1, "rgba(255, 255, 255, 0)");
                paint.fillStyle = rim;
                paint.fillRect(cx - radius * 1.3, y - radius * 1.3, radius * 2.6, radius * 2.6);
            });
        }

        return mapCanvas.toDataURL();
    }

    // The moon starts as a smooth, detailed sphere. "updatable" lets the height map reshape it.
    const moonSize = 36;
    const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: moonSize, segments: 96, updatable: true }, scene);
    moon.position = new BABYLON.Vector3(28, -16, 35); // off to the right, below and beyond the astronaut
    moon.material = moonMat;

    // Apply the height map: each point on the moon is pushed outwards
    // by 0 (black on the map) up to 2.5 units (white on the map).
    // LATER: replace drawHeightMap() with a file path, e.g. "assets/textures/heightmap.png"
    moon.applyDisplacementMap(drawHeightMap(), 0, 2.5);

    //This is creating TON 618, the supermassive black hole at the centre of a distant galaxy. It has a glowing disk of gas and dust around it, and a bright ring of light caused by gravitational lensing.
    // Its look is inspired by Gargantua, the black hole in the film Interstellar.
    const tonSize = 80;
    const tonPosition = new BABYLON.Vector3(0, 0, 400);
    const horizon = tonSize / 2; // the black hole's edge (its radius)

    // An empty, slightly tilted "holder" for everything that orbits TON 618.
    // The disk and the falling matter sit inside it, so they spin flat in their own tilted plane instead of wobbling.
    const tonTilt = new BABYLON.TransformNode("tonTilt", scene);
    tonTilt.position = tonPosition.clone();
    tonTilt.rotation.x = 0.08; // tipped very slightly towards the camera, so we see the disk almost edge-on

    // The black hole: almost black, with a faint deep-blue tint, like light bent around from behind it
    const blackHoleMat = new BABYLON.StandardMaterial("blackHoleMat", scene);
    blackHoleMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    blackHoleMat.specularColor = new BABYLON.Color3(0, 0, 0);
    blackHoleMat.emissiveColor = new BABYLON.Color3(0.012, 0.018, 0.045);

    const blackHole = BABYLON.MeshBuilder.CreateSphere("blackHole", { diameter: tonSize, segments: 48 }, scene);
    blackHole.position = tonPosition.clone();
    blackHole.material = blackHoleMat;

    // Makes a material that shows a painted, see-through, glowing picture.
    // The picture is used twice: once for its colour (emissive) and once for how see-through it is (opacity).
    function glowingMaterial(name, texture) {
        const material = new BABYLON.StandardMaterial(name, scene);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.emissiveTexture = texture; // the colours glow by themselves
        material.opacityTexture = texture;  // see-through wherever the picture is see-through
        material.disableLighting = true;    // lights don't change it
        material.backFaceCulling = false;   // visible from above and below
        return material;
    }

    // Paints the disk using code: white-hot near the black hole, cooling to gold, then orange,
    // then fading away at the edge. Thin arcs and grain are added so the spin is easy to see.
    const diskWorldSize = tonSize * 4; // how wide the disk is in the scene
    function drawDiskTexture() {
        const S = 1024;          // picture size in pixels
        const centre = S / 2;
        const pixelsPerUnit = S / diskWorldSize;
        const inner = horizon * pixelsPerUnit; // the black hole's edge, in pixels
        const outer = centre;                  // the edge of the picture

        const texture = new BABYLON.DynamicTexture("diskTexture", { width: S, height: S }, scene, true);
        const paint = texture.getContext();
        paint.clearRect(0, 0, S, S); // start fully see-through

        // The main glow: a circular gradient from the black hole's edge outwards
        const glow = paint.createRadialGradient(centre, centre, inner, centre, centre, outer);
        glow.addColorStop(0, "rgba(255, 255, 255, 0)");      // invisible inside the black hole
        glow.addColorStop(0.02, "rgba(255, 255, 255, 1)");   // white-hot right at the edge
        glow.addColorStop(0.15, "rgba(255, 246, 225, 1)");   // warm white
        glow.addColorStop(0.35, "rgba(255, 205, 120, 0.9)"); // gold
        glow.addColorStop(0.6, "rgba(235, 140, 60, 0.55)");  // orange
        glow.addColorStop(0.85, "rgba(170, 85, 35, 0.2)");   // dim, cooler orange
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");            // fades to nothing
        paint.fillStyle = glow;
        paint.fillRect(0, 0, S, S);

        // Streaks: short curved arcs around the centre, brighter near the middle
        for (let i = 0; i < 350; i++) {
            const radius = inner + 6 + Math.random() * (outer - inner - 20);
            const start = Math.random() * Math.PI * 2;
            const fade = 1 - (radius - inner) / (outer - inner);
            paint.strokeStyle = `rgba(255, 240, 215, ${(0.15 + Math.random() * 0.5) * fade})`;
            paint.lineWidth = 1 + Math.random() * 2;
            paint.beginPath();
            paint.arc(centre, centre, radius, start, start + 0.2 + Math.random() * 0.8);
            paint.stroke();
        }

        // Grain: thousands of tiny gold and orange specks, like dust in the disk
        for (let i = 0; i < 9000; i++) {
            const radius = inner + Math.random() * (outer - inner);
            const angle = Math.random() * Math.PI * 2;
            const fade = 1 - (radius - inner) / (outer - inner);
            paint.fillStyle = Math.random() < 0.5
                ? `rgba(255, 230, 180, ${0.6 * fade + 0.1})`
                : `rgba(255, 170, 90, ${0.5 * fade + 0.1})`;
            paint.fillRect(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius, 1.5, 1.5);
        }

        texture.hasAlpha = true; // tells Babylon the picture has see-through parts
        texture.update();
        return texture;
    }

    // The disk is a flat, square sheet made of a grid of points. The painted picture
    // makes it look round. The grid of points is what lets us bend it below.
    // "updatable" means we're allowed to reshape it.
    const disk = BABYLON.MeshBuilder.CreateGround("disk", { width: diskWorldSize, height: diskWorldSize, subdivisions: 96, updatable: true }, scene);
    disk.parent = tonTilt;
    disk.material = glowingMaterial("diskMat", drawDiskTexture());
    disk.alphaIndex = 2; // drawn after the ring, so the front of the disk passes in front of it



    //through mesh manipulation, the disk is warped into a gentle wave, as if TON 618's gravity were bending it.
    // Get the position of every corner point as one long list: x, y, z, x, y, z...
    const diskPoints = disk.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    // How high the wave rises and falls at the very edge
    const warpHeight = tonSize * 0.06;

    // Go through the points three numbers (x, y, z) at a time
    for (let i = 0; i < diskPoints.length; i += 3) {
        const x = diskPoints[i];
        const z = diskPoints[i + 2];

        // Which way round the disk this point is, as an angle (like a clock hand)
        const angle = Math.atan2(z, x);

        // How far out this point is: 0 at the centre, 1 at the edge
        const distanceOut = Math.sqrt(x * x + z * z) / (diskWorldSize / 2);

        // Lift or lower it depending on its angle (two "hills" and two "valleys" around the disk),
        // bending more the further out it is, so the middle stays flat
        diskPoints[i + 1] = Math.sin(angle * 2) * warpHeight * distanceOut;
    }

    // Save the new shape back onto the disk
    disk.updateVerticesData(BABYLON.VertexBuffer.PositionKind, diskPoints);


    // Paints the ring using code: a thick, soft, white-hot band hugging the black hole,
    // with faint arcs so its spin shows too.
    const ringWorldSize = tonSize * 1.8; // how wide the ring's picture is in the scene
    function drawRingTexture() {
        const S = 1024;
        const centre = S / 2;
        const pixelsPerUnit = S / ringWorldSize;
        const inner = horizon * pixelsPerUnit * 0.97; // just inside the black hole's edge
        const outer = centre * 0.98;

        const texture = new BABYLON.DynamicTexture("ringTexture", { width: S, height: S }, scene, true);
        const paint = texture.getContext();
        paint.clearRect(0, 0, S, S);

        const glow = paint.createRadialGradient(centre, centre, inner, centre, centre, outer);
        glow.addColorStop(0, "rgba(255, 255, 255, 0)");
        glow.addColorStop(0.04, "rgba(255, 255, 255, 1)");    // white-hot inner edge
        glow.addColorStop(0.3, "rgba(255, 250, 240, 0.95)");
        glow.addColorStop(0.55, "rgba(255, 238, 215, 0.55)");
        glow.addColorStop(0.8, "rgba(210, 205, 240, 0.15)");  // a faint cool haze at the outside
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        paint.fillStyle = glow;
        paint.fillRect(0, 0, S, S);

        for (let i = 0; i < 200; i++) {
            const radius = inner + 8 + Math.random() * (outer - inner) * 0.5;
            const start = Math.random() * Math.PI * 2;
            paint.strokeStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.4})`;
            paint.lineWidth = 1 + Math.random() * 2.5;
            paint.beginPath();
            paint.arc(centre, centre, radius, start, start + 0.3 + Math.random());
            paint.stroke();
        }

        texture.hasAlpha = true;
        texture.update();
        return texture;
    }

    // The lensing ring: the back of the disk, bent around the black hole. Always faces the camera.
    const lensingHolder = new BABYLON.TransformNode("lensingHolder", scene);
    lensingHolder.position = tonPosition.clone();
    lensingHolder.billboardMode = BABYLON.TransformNode.BILLBOARDMODE_ALL;

    // A "spinner" inside the holder turns the ring round and round, like a wheel facing us
    const lensingSpinner = new BABYLON.TransformNode("lensingSpinner", scene);
    lensingSpinner.parent = lensingHolder;

    // The ring is a flat square showing the painted band, facing the camera
    const lensingRing = BABYLON.MeshBuilder.CreatePlane("lensingRing", { size: ringWorldSize }, scene);
    lensingRing.parent = lensingSpinner;
    lensingRing.material = glowingMaterial("lensingMat", drawRingTexture());
    lensingRing.alphaIndex = 1;


    //This creates the gravitational pull: glowing specks of matter orbiting TON 618 and spiralling in.
    // Like real orbits, they speed up the closer they get, then vanish as they cross the event horizon.

    // Reusable helpers, so we're not creating new objects 60 times a second
    const tempMatrix = new BABYLON.Matrix();
    const tempScale = new BABYLON.Vector3();
    const tempPosition = new BABYLON.Vector3();
    const noRotation = BABYLON.Quaternion.Identity();

    // Builds one swirl of infalling matter. Written once as a function, then used twice:
    // for the flat disk, and for the upright event horizon ring.
    //   name        - a name for it
    //   parent      - what it's attached to (so it sits in that object's plane)
    //   count       - how many specks
    //   outerRadius - how far out the specks start
    //   upright     - false = lying flat like the disk, true = standing up like the ring
    //   direction   - which way it swirls: 1 or -1 (chosen to match its ring's spin)
    //   colour      - the colour the specks glow
    //   size        - how big each speck is
    function createInfallingMatter(name, parent, count, outerRadius, upright, direction, colour, size) {

        // A glowing material in this swirl's colour
        const material = new BABYLON.StandardMaterial(name + "Mat", scene);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.emissiveColor = colour;
        material.disableLighting = true;

        // ONE tiny sphere, drawn many times using "thin instances". Much faster than lots of separate spheres.
        const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter: size, segments: 3 }, scene);
        mesh.material = material;
        mesh.parent = parent;
        mesh.alwaysSelectAsActiveMesh = true; // always draw it, even though its copies are spread far apart

        // Each speck remembers its distance from the centre, its angle round,
        // how far it sits off the plane, and how long it has existed
        const radius = [];
        const angle = [];
        const offset = [];
        const age = [];

        // Places a speck. "anywhere" scatters it across the whole swirl (used at the start);
        // otherwise it starts again at the outer edge, as fresh matter falling in.
        function spawn(i, anywhere) {
            radius[i] = anywhere ? horizon + 2 + Math.random() * (outerRadius - horizon) : outerRadius + Math.random() * 20;
            angle[i] = Math.random() * Math.PI * 2;
            offset[i] = (Math.random() - 0.5) * 3;
            age[i] = anywhere ? 1 : 0;
        }
        for (let i = 0; i < count; i++) {
            spawn(i, true);
        }

        // Each copy needs a "matrix": 16 numbers that hold its position and size.
        // They all live in one long list, which we refill every frame.
        const matrices = new Float32Array(count * 16);
        mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);

        // Hand back an "update" function, which the motion section calls every frame
        return {
            update(delta) {
                for (let i = 0; i < count; i++) {
                    const r = radius[i];

                    // Orbit: the closer to the centre, the faster it goes round
                    angle[i] += direction * (180 / Math.pow(r, 1.5)) * delta;

                    // Fall: drift inwards, a little faster the closer it gets
                    radius[i] -= (0.6 + 30 / r) * delta;
                    age[i] += delta;

                    // Crossed the event horizon? It's gone. Start a new speck at the outer edge.
                    if (radius[i] < horizon + 0.5) {
                        spawn(i, false);
                    }

                    // Size: grows in over its first second, and shrinks away just before the horizon
                    const fadeIn = Math.min(1, age[i]);
                    const fadeOut = Math.min(1, Math.max(0, (radius[i] - horizon) / 8));
                    const scale = fadeIn * fadeOut;
                    tempScale.set(scale, scale, scale);

                    // Work out where the speck is: flat (like the disk) or upright (like the ring)
                    const across = Math.cos(angle[i]) * radius[i];
                    const round = Math.sin(angle[i]) * radius[i];
                    if (upright) {
                        tempPosition.set(across, round, offset[i]);
                    } else {
                        tempPosition.set(across, offset[i], round);
                    }

                    // Save its position and size into the list
                    BABYLON.Matrix.ComposeToRef(tempScale, noRotation, tempPosition, tempMatrix);
                    tempMatrix.copyToArray(matrices, i * 16);
                }

                // Tell Babylon the list has changed, so it redraws the specks in their new places
                mesh.thinInstanceBufferUpdated("matrix");
            }
        };
    }

    // Warm gold matter spiralling in across the wide, flat disk...
    const diskMatter = createInfallingMatter("diskMatter", tonTilt, 1500, tonSize * 2, false, -1, new BABYLON.Color3(1, 0.82, 0.55), 0.9);

    // ...and white-hot matter around the upright ring, always facing the camera like the ring itself
    const ringMatter = createInfallingMatter("ringMatter", lensingHolder, 400, tonSize * 0.75, true, 1, new BABYLON.Color3(1, 0.97, 0.9), 0.9);

    // (e) GLOW EFFECT: makes anything that glows by itself (the disk, ring, specks and torch lens)
    // bleed soft light around its edges. A bigger "blur" spreads the glow into a wide, soft halo.
    const glowLayer = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 64 });
    glowLayer.intensity = 1.0;
    glowLayer.addExcludedMesh(skybox);    // don't let the sky glow
    glowLayer.addExcludedMesh(beam);      // the beam is already soft, so no extra glow
    glowLayer.addExcludedMesh(blackHole); // keep the black hole's edge crisp



    let time = 0;

    scene.onBeforeRenderObservable.add(() => {
        // Seconds since the last frame, so speed is the same on every computer
        const delta = engine.getDeltaTime() / 1000;
        time += delta;

        // The astronaut slowly turns side to side and bobs,
        // which makes the torch beam sweep through the dark
        astronaut.rotation.y = Math.sin(time * 0.3) * 0.6;
        astronaut.rotation.x = Math.sin(time * 0.2) * 0.15;
        astronaut.position.y = Math.sin(time * 0.5) * 0.3;

        // The shuttle sways gently, drifting but staying behind the astronaut
        shuttle.rotation.y = 0.2 + Math.sin(time * 0.1) * 0.1;

        // The moon turns very slowly
        moon.rotation.y += 0.01 * delta;

        // TON 618's disk and ring turn slowly and majestically
        disk.rotation.y += 0.05 * delta;
        lensingSpinner.rotation.z += 0.05 * delta;

        // The gravitational pull: matter spirals in across the disk and around the ring
        diskMatter.update(delta);
        ringMatter.update(delta);
    });


    let torchOn = true;

    scene.onKeyboardObservable.add((keyInfo) => {
        if (keyInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN) return;

        if (keyInfo.event.key.toLowerCase() === "l") {
            torchOn = !torchOn;

            // Switch the light, the visible beam, and the glowing lens together
            torchLight.setEnabled(torchOn);
            beam.setEnabled(torchOn);
            lensMat.emissiveColor = torchOn ? lensOnColour : lensOffColour;
        }
    });


    // Hand the finished scene back so it can be drawn
    return scene;
};


// Build the scene
const scene = createScene();

// Draw the scene over and over, around 60 times a second, so it moves
engine.runRenderLoop(() => {
    scene.render();
});

// If the browser window changes size, resize the scene to fit
window.addEventListener("resize", () => {
    engine.resize();
});