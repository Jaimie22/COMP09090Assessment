
// Setting up: find the canvas (the drawing area) on the web page
const canvas = document.getElementById("renderCanvas");

// Create the Babylon engine. It draws our scene onto the canvas.
// "true" turns on antialiasing, which smooths jagged edges.
const engine = new BABYLON.Engine(canvas, true);


// Creating  scene 3
// Controls (all relative to the screen):
//   W / S = thrust up / down
//   A / D = thrust left / right
//   Space / Shift = thrust forwards / backwards
//   E = grab or let go (debris, or the shuttle)
//   F = throw the debris you're holding (and get pushed the other way!)
//   Drag = look around, Scroll = zoom
const createScene = async function () {

    // The scene is the "world" that holds everything we create.
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);


    // Using Havok physics for this scene. It's a fast, accurate physics engine that works well with BabylonJS.
    const havok = await HavokPhysics();
    const physicsPlugin = new BABYLON.HavokPlugin(true, havok);

    // Switch physics on, with gravity set to zero in every direction: we're in space.
    scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), physicsPlugin);


    // The numbers that control how the scene feels. Change these to tune it.
    const startPosition = new BABYLON.Vector3(0, 5, 0); // where the astronaut starts
    const thrustPower = 4;        // how strong the jetpack is
    const pullConstant = 48000;   // how strong TON 618's gravity is
    const maxPull = 20;           // the strongest the pull can ever get
    const throwStrength = 8;      // how hard debris is thrown (and how hard you're pushed back)
    const cameraLag = 0.1;        // how slowly the camera catches up (closer to 0 = snappier, closer to 1 = lazier)
    const shuttleMass = 40;       // how heavy the shuttle is, compared with the astronaut (who weighs 1)

    const tonSize = 80;
    const tonPosition = new BABYLON.Vector3(0, 0, 400);
    const horizon = tonSize / 2;          // the black hole's edge (its radius)
    const resetDistance = tonSize * 0.65; // this close to the centre, and you've crossed the edge


    // Draws a space image using code, then wraps it around the scene (the same idea as Scene 2).
    function drawStarfield() {
        const W = 4096;
        const H = 2048;
        const starCanvas = document.createElement("canvas");
        starCanvas.width = W;
        starCanvas.height = H;
        const paint = starCanvas.getContext("2d");

        // Deep black background
        paint.fillStyle = "#000003";
        paint.fillRect(0, 0, W, H);

        // Nebula clouds, drawn three times so they join up where the image wraps around
        const nebulaColours = ["rgba(90, 40, 140, 0.25)", "rgba(30, 60, 140, 0.2)", "rgba(160, 70, 40, 0.15)"];
        for (let i = 0; i < 14; i++) {
            const x = Math.random() * W;
            const y = H * 0.2 + Math.random() * H * 0.6;
            const radius = 200 + Math.random() * 500;
            [-W, 0, W].forEach(offset => {
                const cloud = paint.createRadialGradient(x + offset, y, 0, x + offset, y, radius);
                cloud.addColorStop(0, nebulaColours[i % 3]);
                cloud.addColorStop(1, "rgba(0, 0, 0, 0)");
                paint.fillStyle = cloud;
                paint.fillRect(x + offset - radius, y - radius, radius * 2, radius * 2);
            });
        }

        // Thousands of tiny stars of different brightness
        for (let i = 0; i < 6000; i++) {
            const size = Math.random() < 0.95 ? 1 : 2;
            paint.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
            paint.fillRect(Math.random() * W, Math.random() * H, size, size);
        }

        // A handful of bright stars with soft glows
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * W;
            const y = H * 0.15 + Math.random() * H * 0.7;
            const radius = 15 + Math.random() * 25;
            const glow = paint.createRadialGradient(x, y, 0, x, y, radius);
            glow.addColorStop(0, "rgba(255, 255, 255, 1)");
            glow.addColorStop(0.15, "rgba(150, 180, 255, 0.5)");
            glow.addColorStop(1, "rgba(0, 0, 0, 0)");
            paint.fillStyle = glow;
            paint.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }

        return starCanvas.toDataURL();
    }

    // The sky box: a giant box we see from the inside, big enough to hold TON 618
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 2000 }, scene);
    const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.reflectionTexture = new BABYLON.EquiRectangularCubeTexture(drawStarfield(), scene, 1024);
    skyMat.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;


    // LIGHTS (the same three as Scene 2)
    const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.15;
    ambient.diffuse = new BABYLON.Color3(0.5, 0.6, 1);
    ambient.groundColor = new BABYLON.Color3(0.05, 0.05, 0.1);
    ambient.specular = new BABYLON.Color3(0, 0, 0);

    const diskLight = new BABYLON.DirectionalLight("diskLight", new BABYLON.Vector3(0, -0.25, -1), scene);
    diskLight.diffuse = new BABYLON.Color3(1, 0.55, 0.2);
    diskLight.intensity = 1.4;

    const starLight = new BABYLON.DirectionalLight("starLight", new BABYLON.Vector3(0.6, -0.6, 1), scene);
    starLight.diffuse = new BABYLON.Color3(0.4, 0.5, 0.9);
    starLight.intensity = 0.5;


    // ----- MATERIALS -----
    const suitMat = new BABYLON.StandardMaterial("suitMat", scene);
    suitMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.92);
    suitMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    const visorMat = new BABYLON.StandardMaterial("visorMat", scene);
    visorMat.diffuseColor = new BABYLON.Color3(0.75, 0.55, 0.15);
    visorMat.specularColor = new BABYLON.Color3(1, 0.9, 0.6);
    visorMat.specularPower = 64;

    const metalMat = new BABYLON.StandardMaterial("metalMat", scene);
    metalMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);

    const shuttleMat = new BABYLON.StandardMaterial("shuttleMat", scene);
    shuttleMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85);
    shuttleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    // Glowing blue-white jetpack flames
    const flameMat = new BABYLON.StandardMaterial("flameMat", scene);
    flameMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    flameMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 1);
    flameMat.disableLighting = true;


    // The physics for the astronaut: a capsule shape that can move and collide with things.
    const player = BABYLON.MeshBuilder.CreateCapsule("player", { height: 4.2, radius: 0.75 }, scene);
    player.position = startPosition.clone();
    player.isVisible = false;

    // The visible astronaut, attached to the capsule
    const astronaut = new BABYLON.TransformNode("astronaut", scene);
    astronaut.parent = player;
    astronaut.position.y = 0.27; // centres the body inside the capsule

    const body = BABYLON.MeshBuilder.CreateCapsule("body", { height: 2, radius: 0.5 }, scene);
    body.material = suitMat;
    body.parent = astronaut;

    const helmet = BABYLON.MeshBuilder.CreateSphere("helmet", { diameter: 1.1 }, scene);
    helmet.position.y = 1.3;
    helmet.material = suitMat;
    helmet.parent = astronaut;

    const visor = BABYLON.MeshBuilder.CreateSphere("visor", { diameter: 0.85 }, scene);
    visor.scaling = new BABYLON.Vector3(1, 0.8, 0.6);
    visor.position = new BABYLON.Vector3(0, 1.32, -0.33);
    visor.material = visorMat;
    visor.parent = astronaut;

    const backpack = BABYLON.MeshBuilder.CreateBox("backpack", { width: 0.8, height: 1, depth: 0.4 }, scene);
    backpack.position = new BABYLON.Vector3(0, 0.2, 0.45);
    backpack.material = metalMat;
    backpack.parent = astronaut;

    // Arms and legs. We keep hold of them in lists so we can animate them later.
    // (-1 = left side, 1 = right side) This means we can use the same code for both sides, just multiply by -1 or 1.
    // The arms are rotated outwards a little, and the legs are rotated forwards a little, so the astronaut looks like they're floating in space.
    const arms = [];
    const legs = [];
    [-1, 1].forEach(side => {
        const arm = BABYLON.MeshBuilder.CreateCapsule("arm" + side, { height: 1.4, radius: 0.18 }, scene);
        arm.position = new BABYLON.Vector3(0.75 * side, 0.05, 0);
        arm.rotation.z = 0.35 * side;
        arm.material = suitMat;
        arm.parent = astronaut;
        arms.push(arm);

        const leg = BABYLON.MeshBuilder.CreateCapsule("leg" + side, { height: 1.5, radius: 0.22 }, scene);
        leg.position = new BABYLON.Vector3(0.28 * side, -1.45, 0);
        leg.rotation.z = 0.12 * side;
        leg.material = suitMat;
        leg.parent = astronaut;
        legs.push(leg);
    });
    const leftArm = arms[0];
    const rightArm = arms[1];

    // Thrusters all around the jetpack, like the manoeuvring jets on a real spacecraft.
    // Each one points one way and pushes the astronaut the OPPOSITE way when it fires.
    const thrusters = [];

    //   name              - a name for it
    //   position          - where it sits on the astronaut
    //   exhaustDirection  - which way its flame shoots out
    function addThruster(name, position, exhaustDirection) {
        // A holder, turned so that its "down" points along the exhaust direction
        const mount = new BABYLON.TransformNode(name, scene);
        mount.parent = astronaut;
        mount.position = position;
        mount.rotationQuaternion = new BABYLON.Quaternion();
        BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Down(), exhaustDirection, mount.rotationQuaternion);

        // The nozzle: a short metal cone
        const nozzle = BABYLON.MeshBuilder.CreateCylinder(name + "Nozzle", { height: 0.12, diameterTop: 0.08, diameterBottom: 0.14 }, scene);
        nozzle.position.y = -0.06;
        nozzle.material = metalMat;
        nozzle.parent = mount;

        // The flame grows out of the nozzle's tip. It sits on a "pivot" at the tip,
        // so when we stretch the pivot, the flame grows outwards from the nozzle.
        const flamePivot = new BABYLON.TransformNode(name + "FlamePivot", scene);
        flamePivot.position.y = -0.12;
        flamePivot.parent = mount;

        const flame = BABYLON.MeshBuilder.CreateCylinder(name + "Flame", { height: 0.5, diameterTop: 0.12, diameterBottom: 0 }, scene);
        flame.position.y = -0.25; // hangs down from the pivot
        flame.material = flameMat;
        flame.parent = flamePivot;
        flame.isVisible = false;

        thrusters.push({ flame, flamePivot, exhaust: exhaustDirection, size: 0 });
    }

    // The backpack's centre is at (0, 0.2, 0.45). The thrusters sit on its faces:
    addThruster("thrusterBottomLeft", new BABYLON.Vector3(-0.25, -0.3, 0.45), new BABYLON.Vector3(0, -1, 0));  // fire down to push UP
    addThruster("thrusterBottomRight", new BABYLON.Vector3(0.25, -0.3, 0.45), new BABYLON.Vector3(0, -1, 0));
    addThruster("thrusterTop", new BABYLON.Vector3(0, 0.7, 0.45), new BABYLON.Vector3(0, 1, 0));               // fire up to push DOWN
    addThruster("thrusterLeft", new BABYLON.Vector3(-0.4, 0.2, 0.45), new BABYLON.Vector3(-1, 0, 0));          // fire left to push RIGHT
    addThruster("thrusterRight", new BABYLON.Vector3(0.4, 0.2, 0.45), new BABYLON.Vector3(1, 0, 0));           // fire right to push LEFT
    addThruster("thrusterRear", new BABYLON.Vector3(0, 0.2, 0.65), new BABYLON.Vector3(0, 0, 1));              // fire backwards to push FORWARDS
    addThruster("thrusterFrontLeft", new BABYLON.Vector3(-0.4, 0.6, 0.25), new BABYLON.Vector3(0, 0, -1));     // fire forwards (over the shoulders) to push BACKWARDS
    addThruster("thrusterFrontRight", new BABYLON.Vector3(0.4, 0.6, 0.25), new BABYLON.Vector3(0, 0, -1));

    // An invisible "reach" bubble in front of the astronaut.
    // Anything it touches is close enough to grab.
    const reach = BABYLON.MeshBuilder.CreateSphere("reach", { diameter: 3 }, scene);
    reach.position = new BABYLON.Vector3(0.6, 0.3, -1.2);
    reach.parent = astronaut;
    reach.isVisible = false;
    reach.isPickable = false;

    // Give the capsule a physical body: a mass of 1, and a little bounce.
    const playerPhysics = new BABYLON.PhysicsAggregate(player, BABYLON.PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.3 }, scene);

    // Stop the capsule spinning when it bumps into things (we turn the astronaut ourselves).
    // Setting mass properties REPLACES all of them, so the mass of 1 must be stated again here.
    // Without it, Havok works out a new mass from the capsule's size, and the astronaut becomes far too heavy to move.
    playerPhysics.body.setMassProperties({ mass: 1, inertia: new BABYLON.Vector3(0, 0, 0) });

    // A tiny bit of drag, so the controls stay manageable
    playerPhysics.body.setLinearDamping(0.05);


    // Creating the same ArcRotateCamera as Scene 2. It isn't locked onto the astronaut:
    // instead it smoothly catches up with them every frame (see the frame-by-frame section),
    // so you can actually see the astronaut move across the screen before the camera follows.
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 1.3, 16, startPosition.clone(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 6;
    camera.upperRadiusLimit = 30;
    camera.lowerBetaLimit = 0.4;
    camera.upperBetaLimit = 2.6;
    camera.panningSensibility = 0;
    camera.wheelDeltaPercentage = 0.01;


    // The shuttle: a simple model with a fuselage, nose, wings, tail fin and cargo bay.
    // It's built in two layers:
    //   shuttleRoot  - the part the physics engine moves (it can't be scaled, as physics doesn't like scaling)
    //   shuttleModel - the visible model inside it, scaled up 1.6 times
    const shuttleStartPosition = new BABYLON.Vector3(0, -1, 14);
    const shuttleStartRotation = BABYLON.Quaternion.FromEulerAngles(0, 0.2, 0.15);

    const shuttleRoot = new BABYLON.TransformNode("shuttleRoot", scene);
    shuttleRoot.position = shuttleStartPosition.clone();
    shuttleRoot.rotationQuaternion = shuttleStartRotation.clone(); // physics uses this kind of rotation

    const shuttle = new BABYLON.TransformNode("shuttle", scene);
    shuttle.parent = shuttleRoot;
    shuttle.scaling = new BABYLON.Vector3(1.6, 1.6, 1.6); // a bit bigger, so the astronaut looks small next to it

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

    shuttle.getChildMeshes().forEach(part => part.material = shuttleMat);

    [new BABYLON.Vector3(-5.5, 0.4, 0.5), new BABYLON.Vector3(-5.5, 0.4, -0.5), new BABYLON.Vector3(-5.5, -0.3, 0)].forEach((position, index) => {
        const engineNozzle = BABYLON.MeshBuilder.CreateCylinder("engine" + index, { height: 1, diameter: 0.7 }, scene);
        engineNozzle.rotation.z = Math.PI / 2;
        engineNozzle.position = position;
        engineNozzle.material = metalMat;
        engineNozzle.parent = shuttle;
    });

    // The shuttle's physical shape: two simple boxes (the body and the wings) joined together in a "container".
    // Physics shapes are kept simple on purpose: boxes are much faster to calculate than the real model.
    // Their sizes are the model's sizes multiplied by 1.6, to match its scaling.
    const shuttleShape = new BABYLON.PhysicsShapeContainer(scene);
    shuttleShape.addChild(new BABYLON.PhysicsShapeBox(
        new BABYLON.Vector3(1 * 1.6, 0, 0),              // centre of the body box
        BABYLON.Quaternion.Identity(),                    // not turned
        new BABYLON.Vector3(12 * 1.6, 2 * 1.6, 2 * 1.6),  // its size
        scene));
    shuttleShape.addChild(new BABYLON.PhysicsShapeBox(
        new BABYLON.Vector3(-1.5 * 1.6, -0.6 * 1.6, 0),   // centre of the wings box
        BABYLON.Quaternion.Identity(),
        new BABYLON.Vector3(4 * 1.6, 0.5, 9 * 1.6),
        scene));

    // A "dynamic" body: it moves, gets pulled by TON 618, and can be bumped into
    const shuttleBody = new BABYLON.PhysicsBody(shuttleRoot, BABYLON.PhysicsMotionType.DYNAMIC, false, scene);
    shuttleBody.shape = shuttleShape;
    shuttleBody.setMassProperties({ mass: shuttleMass });
    shuttleBody.setLinearDamping(0.05);
    shuttleBody.setAngularDamping(0.5); // stops it spinning forever if bumped

    // Invisible "hitboxes" matching the physical shape, so the reach bubble can tell when the shuttle is in reach.
    // They ride along inside shuttleRoot, so they move with the shuttle.
    const grabbables = []; // everything that can be grabbed with E

    function addShuttleHitbox(name, size, centre) {
        const hitbox = BABYLON.MeshBuilder.CreateBox(name, size, scene);
        hitbox.position = centre;
        hitbox.parent = shuttleRoot;
        hitbox.isVisible = false;
        grabbables.push({ mesh: hitbox, body: shuttleBody, isDebris: false });
    }
    addShuttleHitbox("shuttleBodyHitbox", { width: 12 * 1.6, height: 2 * 1.6, depth: 2 * 1.6 }, new BABYLON.Vector3(1 * 1.6, 0, 0));
    addShuttleHitbox("shuttleWingHitbox", { width: 4 * 1.6, height: 0.5, depth: 9 * 1.6 }, new BABYLON.Vector3(-1.5 * 1.6, -0.6 * 1.6, 0));


    // Picks a random spot near the start, for placing (and replacing) debris
    function randomSpotNearStart() {
        return new BABYLON.Vector3(-10 + Math.random() * 20, startPosition.y - 4 + Math.random() * 8, -6 + Math.random() * 16);
    }

    for (let i = 0; i < 6; i++) {
        const piece = BABYLON.MeshBuilder.CreateBox("debris" + i, { width: 0.6 + Math.random() * 0.6, height: 0.3, depth: 0.6 + Math.random() * 0.6 }, scene);
        piece.position = randomSpotNearStart();
        piece.material = metalMat;

        // A physical body with a mass of 2 (twice as heavy as the astronaut)
        const physics = new BABYLON.PhysicsAggregate(piece, BABYLON.PhysicsShapeType.BOX, { mass: 2, restitution: 0.4 }, scene);

        // Give each piece a slow, random tumble
        physics.body.setAngularVelocity(new BABYLON.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));

        grabbables.push({ mesh: piece, body: physics.body, isDebris: true });
    }


    // Space dust: hundreds of faint specks that stay STILL in space.
    // Because they don't move, you see them stream past whenever you move, which shows your speed and direction.
    // They live in an invisible box around the astronaut. When a speck falls out of one side of the box,
    // it reappears on the other side, so there's always dust around you wherever you fly.
    const dustCount = 500;
    const dustBoxSize = 60; // how big the box of dust around the astronaut is

    const dustMat = new BABYLON.StandardMaterial("spaceDustMat", scene);
    dustMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    dustMat.specularColor = new BABYLON.Color3(0, 0, 0);
    dustMat.emissiveColor = new BABYLON.Color3(0.45, 0.5, 0.6); // faint grey-blue
    dustMat.disableLighting = true;

    // ONE tiny speck, drawn 500 times with "thin instances"
    const spaceDust = BABYLON.MeshBuilder.CreateSphere("spaceDust", { diameter: 0.08, segments: 2 }, scene);
    spaceDust.material = dustMat;
    spaceDust.alwaysSelectAsActiveMesh = true;

    // Scatter the specks at fixed spots in space, around the start
    const dustSpots = [];
    for (let i = 0; i < dustCount; i++) {
        dustSpots.push(new BABYLON.Vector3(
            startPosition.x + (Math.random() - 0.5) * dustBoxSize,
            startPosition.y + (Math.random() - 0.5) * dustBoxSize,
            startPosition.z + (Math.random() - 0.5) * dustBoxSize
        ));
    }
    const dustMatrices = new Float32Array(dustCount * 16);
    spaceDust.thinInstanceSetBuffer("matrix", dustMatrices, 16, false);


    // A tilted holder for everything that orbits TON 618
    const tonTilt = new BABYLON.TransformNode("tonTilt", scene);
    tonTilt.position = tonPosition.clone();
    tonTilt.rotation.x = 0.08;

    // The black hole: almost black, with a faint deep-blue tint
    const blackHoleMat = new BABYLON.StandardMaterial("blackHoleMat", scene);
    blackHoleMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    blackHoleMat.specularColor = new BABYLON.Color3(0, 0, 0);
    blackHoleMat.emissiveColor = new BABYLON.Color3(0.012, 0.018, 0.045);

    const blackHole = BABYLON.MeshBuilder.CreateSphere("blackHole", { diameter: tonSize, segments: 48 }, scene);
    blackHole.position = tonPosition.clone();
    blackHole.material = blackHoleMat;

    // A material that shows a painted, see-through, glowing picture
    function glowingMaterial(name, texture) {
        const material = new BABYLON.StandardMaterial(name, scene);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.emissiveTexture = texture;
        material.opacityTexture = texture;
        material.disableLighting = true;
        material.backFaceCulling = false;
        return material;
    }

    // Paints the disk: white-hot near the black hole, cooling to gold then orange, with streaks and grain
    const diskWorldSize = tonSize * 4;
    function drawDiskTexture() {
        const S = 1024;
        const centre = S / 2;
        const inner = horizon * (S / diskWorldSize);
        const outer = centre;
        const texture = new BABYLON.DynamicTexture("diskTexture", { width: S, height: S }, scene, true);
        const paint = texture.getContext();
        paint.clearRect(0, 0, S, S);

        const glow = paint.createRadialGradient(centre, centre, inner, centre, centre, outer);
        glow.addColorStop(0, "rgba(255, 255, 255, 0)");
        glow.addColorStop(0.02, "rgba(255, 255, 255, 1)");
        glow.addColorStop(0.15, "rgba(255, 246, 225, 1)");
        glow.addColorStop(0.35, "rgba(255, 205, 120, 0.9)");
        glow.addColorStop(0.6, "rgba(235, 140, 60, 0.55)");
        glow.addColorStop(0.85, "rgba(170, 85, 35, 0.2)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        paint.fillStyle = glow;
        paint.fillRect(0, 0, S, S);

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

        for (let i = 0; i < 9000; i++) {
            const radius = inner + Math.random() * (outer - inner);
            const angle = Math.random() * Math.PI * 2;
            const fade = 1 - (radius - inner) / (outer - inner);
            paint.fillStyle = Math.random() < 0.5
                ? `rgba(255, 230, 180, ${0.6 * fade + 0.1})`
                : `rgba(255, 170, 90, ${0.5 * fade + 0.1})`;
            paint.fillRect(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius, 1.5, 1.5);
        }

        texture.hasAlpha = true;
        texture.update();
        return texture;
    }

    // The disk is a flat plane, with the painted texture wrapped around it. It's tilted so we see it from the side.
    const disk = BABYLON.MeshBuilder.CreateGround("disk", { width: diskWorldSize, height: diskWorldSize }, scene);
    disk.parent = tonTilt;
    disk.material = glowingMaterial("diskMat", drawDiskTexture());
    disk.alphaIndex = 2;

    // Paints the ring: a thick, soft, white-hot band hugging the black hole
    const ringWorldSize = tonSize * 1.8;
    function drawRingTexture() {
        const S = 1024;
        const centre = S / 2;
        const inner = horizon * (S / ringWorldSize) * 0.97;
        const outer = centre * 0.98;
        const texture = new BABYLON.DynamicTexture("ringTexture", { width: S, height: S }, scene, true);
        const paint = texture.getContext();
        paint.clearRect(0, 0, S, S);

        const glow = paint.createRadialGradient(centre, centre, inner, centre, centre, outer);
        glow.addColorStop(0, "rgba(255, 255, 255, 0)");
        glow.addColorStop(0.04, "rgba(255, 255, 255, 1)");
        glow.addColorStop(0.3, "rgba(255, 250, 240, 0.95)");
        glow.addColorStop(0.55, "rgba(255, 238, 215, 0.55)");
        glow.addColorStop(0.8, "rgba(210, 205, 240, 0.15)");
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

    // The ring always faces the camera, and a spinner inside turns it like a wheel
    const lensingHolder = new BABYLON.TransformNode("lensingHolder", scene);
    lensingHolder.position = tonPosition.clone();
    lensingHolder.billboardMode = BABYLON.TransformNode.BILLBOARDMODE_ALL;

    const lensingSpinner = new BABYLON.TransformNode("lensingSpinner", scene);
    lensingSpinner.parent = lensingHolder;

    const lensingRing = BABYLON.MeshBuilder.CreatePlane("lensingRing", { size: ringWorldSize }, scene);
    lensingRing.parent = lensingSpinner;
    lensingRing.material = glowingMaterial("lensingMat", drawRingTexture());
    lensingRing.alphaIndex = 1;

    // Matter spiralling into TON 618 (the same function as Scene 2)
    const tempMatrix = new BABYLON.Matrix();
    const tempScale = new BABYLON.Vector3();
    const tempPosition = new BABYLON.Vector3();
    const noRotation = BABYLON.Quaternion.Identity();

    function createInfallingMatter(name, parent, count, outerRadius, upright, direction, colour, size) {
        const material = new BABYLON.StandardMaterial(name + "Mat", scene);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.emissiveColor = colour;
        material.disableLighting = true;

        const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter: size, segments: 3 }, scene);
        mesh.material = material;
        mesh.parent = parent;
        mesh.alwaysSelectAsActiveMesh = true;

        const radius = [];
        const angle = [];
        const offset = [];
        const age = [];

        function spawn(i, anywhere) {
            radius[i] = anywhere ? horizon + 2 + Math.random() * (outerRadius - horizon) : outerRadius + Math.random() * 20;
            angle[i] = Math.random() * Math.PI * 2;
            offset[i] = (Math.random() - 0.5) * 3;
            age[i] = anywhere ? 1 : 0;
        }
        for (let i = 0; i < count; i++) {
            spawn(i, true);
        }

        const matrices = new Float32Array(count * 16);
        mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);

        return {
            update(delta) {
                for (let i = 0; i < count; i++) {
                    const r = radius[i];
                    angle[i] += direction * (180 / Math.pow(r, 1.5)) * delta;
                    radius[i] -= (0.6 + 30 / r) * delta;
                    age[i] += delta;
                    if (radius[i] < horizon + 0.5) {
                        spawn(i, false);
                    }
                    const scale = Math.min(1, age[i]) * Math.min(1, Math.max(0, (radius[i] - horizon) / 8));
                    tempScale.set(scale, scale, scale);
                    const across = Math.cos(angle[i]) * radius[i];
                    const round = Math.sin(angle[i]) * radius[i];
                    if (upright) {
                        tempPosition.set(across, round, offset[i]);
                    } else {
                        tempPosition.set(across, offset[i], round);
                    }
                    BABYLON.Matrix.ComposeToRef(tempScale, noRotation, tempPosition, tempMatrix);
                    tempMatrix.copyToArray(matrices, i * 16);
                }
                mesh.thinInstanceBufferUpdated("matrix");
            }
        };
    }

    const diskMatter = createInfallingMatter("diskMatter", tonTilt, 1500, tonSize * 2, false, -1, new BABYLON.Color3(1, 0.82, 0.55), 0.9);
    const ringMatter = createInfallingMatter("ringMatter", lensingHolder, 400, tonSize * 0.75, true, 1, new BABYLON.Color3(1, 0.97, 0.9), 0.9);

    // A wide, soft glow around everything that shines by itself (TON 618 and the jetpack flames)
    const glowLayer = new BABYLON.GlowLayer("glow", scene, { blurKernelSize: 64 });
    glowLayer.intensity = 1.0;
    glowLayer.addExcludedMesh(skybox);
    glowLayer.addExcludedMesh(blackHole);
    glowLayer.addExcludedMesh(spaceDust); // keep the dust faint and subtle


    // The fun bit! Some applied physics: TON 618's gravity pulls everything towards it, and the astronaut can thrust with the jetpack.
    // The pull is stronger the closer you are, and weaker the further away you are. This is a simplified version of real gravity, which is proportional to 1 / (distance squared).
    function pullTowardsTON(node, body, mass) {
        const position = node.getAbsolutePosition();

        // The direction and distance from this object to TON 618
        const towardsTON = tonPosition.subtract(position);
        const distance = towardsTON.length();

        // How strong the pull is at this distance (never more than maxPull)
        const pull = Math.min(maxPull, pullConstant / (distance * distance));

        // Push the object towards TON 618. Heavier objects need more force to move the same amount,
        // so multiplying by the mass means everything falls at the same rate, just like real gravity.
        body.applyForce(towardsTON.normalize().scale(pull * mass), position);
    }

    // Moves a physics object straight to a new spot (and, if given, a new rotation), and stops it dead.
    // (Physics objects normally ignore being moved by hand, so we briefly let the move through.)
    function teleport(node, body, newPosition, newRotation) {
        body.disablePreStep = false;
        node.position.copyFrom(newPosition);
        if (newRotation) {
            node.rotationQuaternion.copyFrom(newRotation);
        }
        body.setLinearVelocity(BABYLON.Vector3.Zero());
        body.setAngularVelocity(BABYLON.Vector3.Zero());
        scene.onAfterPhysicsObservable.addOnce(() => {
            body.disablePreStep = true;
        });
    }


    const keysDown = {};

    scene.onKeyboardObservable.add((keyInfo) => {
        const code = keyInfo.event.code;

        // Stop Space from scrolling the web page
        if (code === "Space") keyInfo.event.preventDefault();

        if (keyInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            // E and F only react on the first press, not while held down
            if (!keysDown[code]) {
                if (code === "KeyE") toggleGrab();
                if (code === "KeyF") throwHeld();
            }
            keysDown[code] = true;
        }

        if (keyInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
            keysDown[code] = false;
        }
    });


    let grabJoint = null; // the physics joint connecting the astronaut's hand to something
    let held = null;      // what we're currently holding

    // Plays the right arm reaching out (or back), using Babylon's animation system.
    // It moves the arm's angle from where it is now to "targetAngle" over a quarter of a second.
    function animateRightArm(targetAngle) {
        BABYLON.Animation.CreateAndStartAnimation("reach", rightArm, "rotation.x", 60, 15, rightArm.rotation.x, targetAngle, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    }

    // E: grab whatever is within reach, or let go if already holding something
    function toggleGrab() {
        if (grabJoint) {
            releaseGrab();
            return;
        }

        // Find the first grabbable thing touching the reach bubble
        const target = grabbables.find(item => reach.intersectsMesh(item.mesh, true));
        if (!target) return;

        // Join the hand to the object at the spot where they meet.
        // A "ball and socket" joint holds them together but lets them swivel, like a shoulder.
        // (For the shuttle, the joint attaches to the shuttle's physics root, which is what the body belongs to.)
        const targetNode = target.isDebris ? target.mesh : shuttleRoot;
        const handPosition = reach.getAbsolutePosition();
        const pivotOnPlayer = BABYLON.Vector3.TransformCoordinates(handPosition, BABYLON.Matrix.Invert(player.getWorldMatrix()));
        const pivotOnTarget = BABYLON.Vector3.TransformCoordinates(handPosition, BABYLON.Matrix.Invert(targetNode.getWorldMatrix()));

        grabJoint = new BABYLON.BallAndSocketConstraint(pivotOnPlayer, pivotOnTarget, new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 1, 0), scene);
        playerPhysics.body.addConstraint(target.body, grabJoint);
        held = target;

        animateRightArm(-1.3); // reach out
    }

    // Let go of whatever we're holding
    function releaseGrab() {
        if (!grabJoint) return;
        grabJoint.dispose();
        grabJoint = null;
        held = null;
        animateRightArm(0); // arm back to rest
    }

    // F: throw the debris we're holding, in the direction the camera faces.
    // Newton's third law: pushing the debris away pushes the astronaut the opposite way.
    function throwHeld() {
        if (!held || !held.isDebris) return;
        const thrown = held;
        releaseGrab();

        const direction = camera.getDirection(BABYLON.Axis.Z);
        thrown.body.applyImpulse(direction.scale(throwStrength), thrown.mesh.getAbsolutePosition());
        playerPhysics.body.applyImpulse(direction.scale(-throwStrength), player.getAbsolutePosition());
    }


    // Thrusting: the jetpack pushes the astronaut in the direction of the keys, relative to the screen,
    // and TON 618's gravity pulls everything in.
    let isThrusting = false;
    const thrustDirection = new BABYLON.Vector3(0, 1, 0); // which way we're thrusting (used to choose which thrusters fire)

    scene.onBeforePhysicsObservable.add(() => {

        // --- The jetpack ---
        // Directions relative to the camera, so "up" is always up on the screen
        const up = camera.getDirection(BABYLON.Axis.Y);
        const right = camera.getDirection(BABYLON.Axis.X);
        const forward = camera.getDirection(BABYLON.Axis.Z);
        const thrust = BABYLON.Vector3.Zero();

        if (keysDown["KeyW"]) thrust.addInPlace(up);            // W = up
        if (keysDown["KeyS"]) thrust.subtractInPlace(up);       // S = down
        if (keysDown["KeyD"]) thrust.addInPlace(right);         // D = right
        if (keysDown["KeyA"]) thrust.subtractInPlace(right);    // A = left
        if (keysDown["Space"]) thrust.addInPlace(forward);      // Space = forwards
        if (keysDown["ShiftLeft"] || keysDown["ShiftRight"]) thrust.subtractInPlace(forward); // Shift = backwards

        isThrusting = thrust.lengthSquared() > 0;
        if (isThrusting) {
            thrust.normalize();
            thrustDirection.copyFrom(thrust); // remember it, so the right thrusters can fire
            playerPhysics.body.applyForce(thrust.scale(thrustPower), player.getAbsolutePosition());
        }

        // TON 618's gravity pulls on EVERYTHING: the astronaut, the shuttle, and every piece of debris
        pullTowardsTON(player, playerPhysics.body, 1);
        pullTowardsTON(shuttleRoot, shuttleBody, shuttleMass);
        grabbables.filter(item => item.isDebris).forEach(item => pullTowardsTON(item.mesh, item.body, 2));
    });


    // Body physics: "springs" that make the astronaut's body react to how they're moving.
    // A spring pulls a value towards a target, but overshoots a little and wobbles before settling,
    // just like a real body that's been pushed.
    //   stiffness - how strongly it pulls towards the target (higher = snappier)
    //   damping   - how quickly the wobble dies away (higher = less wobble)
    function createSpring(stiffness, damping) {
        return {
            value: 0,
            speed: 0,
            update(target, delta) {
                const force = (target - this.value) * stiffness - this.speed * damping;
                this.speed += force * delta;
                this.value += this.speed * delta;
                return this.value;
            }
        };
    }

    const bodyPitch = createSpring(25, 5); // leaning forwards and backwards
    const bodyRoll = createSpring(25, 5);  // leaning left and right
    const armSwing = createSpring(20, 4);  // arms pushed down or lifted up
    const legSwing = createSpring(20, 4);  // legs trailing behind or swinging ahead

    // We measure the astronaut's acceleration (how quickly their speed is changing) from the physics engine.
    // That way the body reacts to EVERYTHING: the jetpack, TON 618's pull, and bumping into things.
    const previousVelocity = new BABYLON.Vector3();
    const acceleration = new BABYLON.Vector3();
    const cameraTarget = startPosition.clone(); // the point the camera is gliding towards


    // Frame-by-frame updates: animations, and resetting things that get too close to TON 618.
    let time = 0;

    scene.onBeforeRenderObservable.add(() => {
        // Seconds since the last frame (capped, so a slow frame can't make the springs go wild)
        const delta = Math.min(engine.getDeltaTime() / 1000, 0.05);
        time += delta;

        // --- The camera smoothly catches up with the astronaut ---
        // Each frame it closes part of the gap. "cameraLag" sets how lazy it is, and the maths keeps
        // the speed the same on fast and slow computers.
        const catchUp = 1 - Math.pow(cameraLag, delta);
        BABYLON.Vector3.LerpToRef(cameraTarget, player.getAbsolutePosition(), catchUp, cameraTarget);
        // Move the camera's focus point, keeping its angle and distance the same
        camera.setTarget(cameraTarget, false, false, true);

        // --- Space dust: keep the specks in a box around the astronaut ---
        const playerPosition = player.getAbsolutePosition();
        const halfBox = dustBoxSize / 2;
        for (let i = 0; i < dustCount; i++) {
            const spot = dustSpots[i];
            // If a speck has fallen too far behind on any side, move it to the far side of the box.
            // It stays perfectly still otherwise, which is what makes movement visible.
            ["x", "y", "z"].forEach(axis => {
                if (spot[axis] - playerPosition[axis] > halfBox) spot[axis] -= dustBoxSize;
                if (spot[axis] - playerPosition[axis] < -halfBox) spot[axis] += dustBoxSize;
            });
            BABYLON.Matrix.TranslationToRef(spot.x, spot.y, spot.z, tempMatrix);
            tempMatrix.copyToArray(dustMatrices, i * 16);
        }
        spaceDust.thinInstanceBufferUpdated("matrix");

        // TON 618 turns, and matter spirals in
        disk.rotation.y += 0.05 * delta;
        lensingSpinner.rotation.z += 0.05 * delta;
        diskMatter.update(delta);
        ringMatter.update(delta);

        // --- The thrusters ---
        // Turn the thrust direction into the astronaut's own point of view (so we know which side of the jetpack to fire)
        const localThrust = BABYLON.Vector3.TransformNormal(thrustDirection, BABYLON.Matrix.Invert(astronaut.getWorldMatrix())).normalize();

        thrusters.forEach(thruster => {
            // A thruster fires when its flame points AGAINST the direction we want to go.
            // "Dot" measures how closely two directions line up: 1 = exactly opposite (after the minus), 0 = sideways.
            const strength = isThrusting ? Math.max(0, -BABYLON.Vector3.Dot(localThrust, thruster.exhaust)) : 0;

            // Grow and shrink the flame smoothly, with a random flicker like real exhaust
            thruster.size = BABYLON.Scalar.Lerp(thruster.size, strength, 0.2);
            thruster.flame.isVisible = thruster.size > 0.05;
            thruster.flamePivot.scaling.y = thruster.size * (0.8 + Math.random() * 0.4);
        });

        // Animation: turn to face the direction we're drifting
        const velocity = playerPhysics.body.getLinearVelocity();
        const sidewaysSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        if (sidewaysSpeed > 0.5) {
            const targetAngle = Math.atan2(velocity.x, velocity.z) + Math.PI;
            astronaut.rotation.y = BABYLON.Scalar.LerpAngle(astronaut.rotation.y, targetAngle, 0.05);
        }

        // --- Body physics ---
        // Measure the acceleration: the change in speed since last frame, smoothed out so it isn't jittery
        if (delta > 0) {
            const rawAcceleration = velocity.subtract(previousVelocity).scale(1 / delta);
            BABYLON.Vector3.LerpToRef(acceleration, rawAcceleration, 0.15, acceleration);
        }
        previousVelocity.copyFrom(velocity);

        // Turn the acceleration into the astronaut's own point of view (forwards, right, up),
        // by undoing the way they're facing
        const local = BABYLON.Vector3.TransformNormal(acceleration, BABYLON.Matrix.RotationY(-astronaut.rotation.y));
        const forwardAcceleration = -local.z; // the astronaut faces -z, so forwards is negative z
        const rightAcceleration = local.x;
        const upAcceleration = local.y;

        // Work out how the body should react (each kept within sensible limits)
        const pitchTarget = BABYLON.Scalar.Clamp(-forwardAcceleration * 0.08, -0.5, 0.5); // lean into forwards/backwards thrust
        const rollTarget = BABYLON.Scalar.Clamp(-rightAcceleration * 0.08, -0.5, 0.5);    // lean into left/right thrust
        const armTarget = BABYLON.Scalar.Clamp(upAcceleration * 0.06, -0.4, 0.4);          // going up pushes arms down, going down lifts them
        const legTarget = BABYLON.Scalar.Clamp(-forwardAcceleration * 0.1, -0.6, 0.6);     // legs trail behind when speeding up

        // Feed the targets into the springs, which move there with a natural overshoot and wobble
        astronaut.rotation.x = bodyPitch.update(pitchTarget, delta);
        astronaut.rotation.z = bodyRoll.update(rollTarget, delta);
        const armAmount = armSwing.update(armTarget, delta);
        const legAmount = legSwing.update(legTarget, delta);

        // Arms: their outward angle, minus the spring's push (left side = -1, right side = 1)
        leftArm.rotation.z = -(0.35 - armAmount);
        rightArm.rotation.z = 0.35 - armAmount;

        // The left arm also floats loosely (the right arm's forwards swing is used for grabbing)
        leftArm.rotation.x = Math.sin(time * 0.8) * 0.2;

        // Legs: a gentle float, plus the spring's trailing swing
        legs[0].rotation.x = Math.sin(time * 0.6) * 0.15 + legAmount;
        legs[1].rotation.x = Math.sin(time * 0.6 + 1.5) * 0.15 + legAmount;

        // Reset the astronaut if they get too close to TON 618
        if (BABYLON.Vector3.Distance(player.getAbsolutePosition(), tonPosition) < resetDistance) {
            releaseGrab();
            teleport(player, playerPhysics.body, startPosition);
        }

        // The shuttle falls in too: it reappears where it started
        if (BABYLON.Vector3.Distance(shuttleRoot.getAbsolutePosition(), tonPosition) < resetDistance) {
            if (held && !held.isDebris) releaseGrab();
            teleport(shuttleRoot, shuttleBody, shuttleStartPosition, shuttleStartRotation);
        }

        // Debris that falls in reappears near the start
        grabbables.filter(item => item.isDebris).forEach(item => {
            if (BABYLON.Vector3.Distance(item.mesh.getAbsolutePosition(), tonPosition) < resetDistance) {
                if (held === item) releaseGrab();
                teleport(item.mesh, item.body, randomSpotNearStart());
            }
        });
    });


    // Hand the finished scene back so it can be drawn
    return scene;
};


// Starting the scene. Because createScene has to wait for the physics engine to load,
// it hands back a "promise": a note saying "the scene will be ready soon". ".then" runs once it actually is ready.
createScene().then(scene => {

    // Draw the scene over and over, around 60 times a second, so it moves
    engine.runRenderLoop(() => {
        scene.render();
    });
});

// If the browser window changes size, resize the scene to fit
window.addEventListener("resize", () => {
    engine.resize();
});