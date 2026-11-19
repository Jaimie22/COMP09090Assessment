


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
    const tonSize = 80;
    const tonPosition = new BABYLON.Vector3(0, 0, 400);

    // An empty, slightly tilted "holder" for everything that orbits TON 618.
    // The disk and the falling matter sit inside it, so they spin flat in their own tilted plane instead of wobbling.
    const tonTilt = new BABYLON.TransformNode("tonTilt", scene);
    tonTilt.position = tonPosition.clone();
    tonTilt.rotation.x = 0.15; // tipped slightly towards the camera

    // The black hole: pure black, with no shine
    const blackHoleMat = new BABYLON.StandardMaterial("blackHoleMat", scene);
    blackHoleMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    blackHoleMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const blackHole = BABYLON.MeshBuilder.CreateSphere("blackHole", { diameter: tonSize, segments: 48 }, scene);
    blackHole.position = tonPosition.clone();
    blackHole.material = blackHoleMat;

    // Draws streaks of glowing gas using code: lots of thin bright lines on black.
    // Wrapped around the disk and ring, they make the spinning easy to see.
    function drawStreaks() {
        const W = 1024;
        const H = 128;
        const streakTexture = new BABYLON.DynamicTexture("streaks", { width: W, height: H }, scene);
        const paint = streakTexture.getContext();

        // Start with black: black adds no extra glow
        paint.fillStyle = "#000000";
        paint.fillRect(0, 0, W, H);

        // Hundreds of thin streaks of different lengths and brightness
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const length = 40 + Math.random() * 220;
            const thickness = 1 + Math.random() * 3;
            const brightness = 0.2 + Math.random() * 0.8;
            paint.fillStyle = `rgba(255, 255, 255, ${brightness})`;

            // Drawn twice, so streaks running off the right-hand edge carry on from the left, with no visible seam
            [-W, 0].forEach(offset => paint.fillRect(x + offset, y, length, thickness));
        }

        // Send the finished drawing to the graphics card
        streakTexture.update();
        return streakTexture;
    }

    // Glowing blue material for the disk. "Emissive" means it gives off its own light,
    // so it stays bright whatever the lights around it are doing.
    // The streaks are added on top of the blue, making brighter bands of gas.
    const diskMat = new BABYLON.StandardMaterial("diskMat", scene);
    diskMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    diskMat.specularColor = new BABYLON.Color3(1, 1, 1);
    diskMat.emissiveColor = new BABYLON.Color3(0.19, 0.37, 0.99);
    diskMat.emissiveTexture = drawStreaks();
    diskMat.emissiveTexture.level = 0.8; // how strongly the streaks show

    // The disk starts as a fat ring (a torus), inside the tilted holder. "updatable" means we're allowed to reshape it.
    const disk = BABYLON.MeshBuilder.CreateTorus("disk", { diameter: tonSize * 1.9, thickness: tonSize * 0.35, tessellation: 96, updatable: true }, scene);
    disk.parent = tonTilt;
    disk.material = diskMat;



    //through mesh manipulation, the disk is warped into a wavy shape, so it looks like a spinning ring of gas and dust around the black hole.
    // Get the position of every corner point as one long list: x, y, z, x, y, z...
    const diskPoints = disk.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    // How high the wave rises and falls
    const warpHeight = tonSize * 0.08;

    // Go through the points three numbers (x, y, z) at a time
    for (let i = 0; i < diskPoints.length; i += 3) {
        const x = diskPoints[i];
        const z = diskPoints[i + 2];

        // Which way round the disk this point is, as an angle (like a clock hand)
        const angle = Math.atan2(z, x);

        // Squash the height down to 8% so the ring becomes a flat band,
        // then lift or lower it depending on its angle: two "hills" and two "valleys" around the disk
        diskPoints[i + 1] = diskPoints[i + 1] * 0.08 + Math.sin(angle * 2) * warpHeight;
    }

    // Save the new shape back onto the disk
    disk.updateVerticesData(BABYLON.VertexBuffer.PositionKind, diskPoints);


    // Bright cyan material for the lensing ring, with its own streaks so its spin shows too
    const lensingMat = new BABYLON.StandardMaterial("lensingMat", scene);
    lensingMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    lensingMat.specularColor = new BABYLON.Color3(1, 1, 1);
    lensingMat.emissiveColor = new BABYLON.Color3(0.03, 0.89, 1);
    lensingMat.emissiveTexture = drawStreaks();
    lensingMat.emissiveTexture.level = 0.6;

    // The lensing ring: the back of the disk, bent around the black hole. Always faces the camera.
    const lensingHolder = new BABYLON.TransformNode("lensingHolder", scene);
    lensingHolder.position = tonPosition.clone();
    lensingHolder.billboardMode = BABYLON.TransformNode.BILLBOARDMODE_ALL;

    // A "spinner" inside the holder turns the ring round and round, like a wheel facing us
    const lensingSpinner = new BABYLON.TransformNode("lensingSpinner", scene);
    lensingSpinner.parent = lensingHolder;

    const lensingRing = BABYLON.MeshBuilder.CreateTorus("lensingRing", { diameter: tonSize * 1.2, thickness: tonSize * 0.12, tessellation: 96 }, scene);
    lensingRing.rotation.x = Math.PI / 2;
    lensingRing.parent = lensingSpinner;
    lensingRing.material = lensingMat;


    //This creates the gravitational pull: glowing specks of matter orbiting TON 618 and spiralling in.
    // Like real orbits, they speed up the closer they get, then vanish as they cross the event horizon.
    const dustCount = 900;            // how many specks
    const horizon = tonSize / 2;      // the black hole's edge (its radius)

    // A glowing blue-white material for the specks
    const dustMat = new BABYLON.StandardMaterial("dustMat", scene);
    dustMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    dustMat.specularColor = new BABYLON.Color3(0, 0, 0);
    dustMat.emissiveColor = new BABYLON.Color3(0.7, 0.9, 1);
    dustMat.disableLighting = true;

    // ONE tiny sphere, drawn 900 times using "thin instances". Much faster than 900 separate spheres.
    const dust = BABYLON.MeshBuilder.CreateSphere("dust", { diameter: 1.4, segments: 3 }, scene);
    dust.material = dustMat;
    dust.parent = tonTilt;                // orbit in the same tilted plane as the disk
    dust.alwaysSelectAsActiveMesh = true; // always draw it, even though its copies are spread far apart

    // Each speck remembers its distance from the centre, its angle round the disk,
    // its height above or below the disk, and how long it has existed
    const dustRadius = [];
    const dustAngle = [];
    const dustHeight = [];
    const dustAge = [];

    // Places a speck. "anywhere" scatters it across the whole disk (used at the start);
    // otherwise it starts again at the outer edge, as fresh matter falling in.
    function spawnDust(i, anywhere) {
        dustRadius[i] = anywhere ? horizon + 2 + Math.random() * 55 : tonSize + Math.random() * 25;
        dustAngle[i] = Math.random() * Math.PI * 2;
        dustHeight[i] = (Math.random() - 0.5) * 3;
        dustAge[i] = anywhere ? 1 : 0;
    }
    for (let i = 0; i < dustCount; i++) {
        spawnDust(i, true);
    }

    // Each copy needs a "matrix": 16 numbers that hold its position and size.
    // They all live in one long list, which we refill every frame.
    const dustMatrices = new Float32Array(dustCount * 16);
    dust.thinInstanceSetBuffer("matrix", dustMatrices, 16, false);

    // Reusable helpers, so we're not creating new objects 60 times a second
    const tempMatrix = new BABYLON.Matrix();
    const tempScale = new BABYLON.Vector3();
    const tempPosition = new BABYLON.Vector3();
    const noRotation = BABYLON.Quaternion.Identity();

    // (e) GLOW EFFECT: makes anything "emissive" (the disk, ring, specks and torch lens)
    const glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.9;
    glowLayer.addExcludedMesh(skybox); // don't let the sky glow
    glowLayer.addExcludedMesh(beam);   // the beam is already soft, so no extra glow



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

        // TON 618's disk and event horizon ring spin, in the same direction
        disk.rotation.y += 0.12 * delta;
        lensingSpinner.rotation.z += 0.12 * delta;

        // The gravitational pull: move every speck
        for (let i = 0; i < dustCount; i++) {
            const r = dustRadius[i];

            // Orbit: the closer to the centre, the faster it goes round (same direction as the disk)
            dustAngle[i] -= (180 / Math.pow(r, 1.5)) * delta;

            // Fall: drift inwards, a little faster the closer it gets
            dustRadius[i] -= (0.6 + 30 / r) * delta;
            dustAge[i] += delta;

            // Crossed the event horizon? It's gone. Start a new speck at the outer edge.
            if (dustRadius[i] < horizon + 0.5) {
                spawnDust(i, false);
            }

            // Size: grows in over its first second, and shrinks away just before the horizon
            const fadeIn = Math.min(1, dustAge[i]);
            const fadeOut = Math.min(1, Math.max(0, (dustRadius[i] - horizon) / 8));
            const size = fadeIn * fadeOut;

            // Work out where the speck is, and save its position and size into the list
            tempScale.set(size, size, size);
            tempPosition.set(Math.cos(dustAngle[i]) * dustRadius[i], dustHeight[i], Math.sin(dustAngle[i]) * dustRadius[i]);
            BABYLON.Matrix.ComposeToRef(tempScale, noRotation, tempPosition, tempMatrix);
            tempMatrix.copyToArray(dustMatrices, i * 16);
        }

        // Tell Babylon the list has changed, so it redraws the specks in their new places
        dust.thinInstanceBufferUpdated("matrix");
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