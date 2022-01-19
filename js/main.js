import * as THREE from '../build/three.module.js';
import { GUI } from './jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from './jsm/libs/PointerLockControls.js';
import * as Shaders from "../shaders/Shaders";


//Enable camera rotation with R button
//Move camera right-left, forward-backward with arrow or WASD keys
//Move camera up-down with page 1-2 keys
//Camera z rotation with Q E
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

var camera, scene, renderer, controls;
var raycaster, clickMouse, mouseMove, draggable, selectedObject;
var ambientLight, spotLight, directionalLight;

// Loading manager
var loadingManager = null;
var RESOURCES_LOADED = false;

// loaded models
var cactusModel, poplarTreeModel, pineTreeModel, appleTreeModel, fenceModel, shedModel, wheelbarrowModel, pondModel, millModel, sheepModel,deerModel, foxModel;

// wheelbarrow object
var wheelbarrow = null;
var sheep1 = null; 
var sheep2 = null;
var deer1 = null;
var deer2 = null;
var fox1 = null;

// start or stop the movement of wheelbarrow
var moveWheelbarrow = false;

// Add every object to this array
var sceneObjects = [];

// predicted tree model
var predictedTreeModel = null;

// name of the predicted tree
var predictedTreeName;

// to allow user to change spotlight rotation
var changeSpotlightTarget = false;

// index of the path
var pathIndex = 0;

// command to put down tree after bringing it with wheelbarrow
var putDownTree = false;

// did wheelbarrow finished the path
var wheelbarrowFinished = true;

// previous predicted tree
var previousTree = null;

function main(){
     
    // SCENES
    scene = new THREE.Scene();

    //LIGHTS
    initLights();
    
    //CAMERA
    camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(0,5,10);
    sceneObjects.push(camera);
    
    // Loading Manager
    loadingManager = new THREE.LoadingManager();
    // LOAD MODELS 
    loadModels();
    
    loadingManager.onLoad = function(){
            console.log("loaded all resources");
            RESOURCES_LOADED = true;
            // add models to the scene
            onResourcesLoaded();
    };
    
    //RAYCAST
    raycaster = new THREE.Raycaster();
    clickMouse = new THREE.Vector2();
    mouseMove = new THREE.Vector2();
    window.addEventListener('click', event => {
        if(draggable){
            console.log("dropping draggable "+ draggable.userData.name);
            draggable = null;
            return;
        } 
        
        clickMouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	clickMouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        
        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera( clickMouse, camera );
        
        // calculate objects intersecting the picking ray
	const found = intersect(clickMouse);
        if(found.length > 0 && found[0].object.parent.userData.draggable){
            draggable = found[0].object.parent;
            selectedObject = found[0].object.parent;
        }
    });
    window.addEventListener('mousemove', event => {
        mouseMove.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouseMove.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    });
    
    // To resize the window
    window.addEventListener( 'resize', onWindowResize, false );
    
    //RENDERER
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xA6CBD8);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; //Shadow
    renderer.shadowMapSoft = true; // Shadow
    renderer.shadowMap.type = THREE.PCFShadowMap; //Shadow
    document.body.appendChild(renderer.domElement);
    
    // KEY EVENT
    keyEvents();
    
    // Input Panel
    createPanel();
    
    controls = new PointerLockControls( camera, renderer.domElement );

    // PLANE
    createPlanes();

    var animate = function () {
        setSpotlightTarget();
        cameraControls();

        if(twist) {
            twistScene();
        }

        dayAndNightCycle();
        spanPredictedTree(predictedTreeModel);
        
        // Animal movements
        animalMovement(sheep1,[new THREE.Vector3(0, 0, -5),new THREE.Vector3(0, 0, -15), new THREE.Vector3(-15, 0, -15), new THREE.Vector3(-15, 0, -5)], 
                [new THREE.Vector3(0, 0, -1),new THREE.Vector3(0, 0, -1),new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1)]); 
        animalMovement(sheep2,[new THREE.Vector3(-35, 0, -10),new THREE.Vector3(-35, 0, -15),
            new THREE.Vector3(-25, 0, -15),new THREE.Vector3(-25, 0, -25),new THREE.Vector3(-15, 0, -25),
            new THREE.Vector3(-15, 0, -35),new THREE.Vector3(-5, 0, -35),new THREE.Vector3(-5, 0, -30)], 
                [new THREE.Vector3(0, 0, -1),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, 1)]);
        animalMovement(deer1,[new THREE.Vector3(5, 0, -25),new THREE.Vector3(5, 0, -35),
            new THREE.Vector3(15, 0, -35),new THREE.Vector3(15, 0, -25),new THREE.Vector3(25, 0, -25),
            new THREE.Vector3(25, 0, -35)],[new THREE.Vector3(0, 0, -1),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, 1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, -1)]);
        animalMovement(deer2,[new THREE.Vector3(5, 0, -5),new THREE.Vector3(5, 0, -10),
            new THREE.Vector3(15, 0, -10),new THREE.Vector3(15, 0, -15),new THREE.Vector3(25, 0, -15),new THREE.Vector3(25, 0, -5)],
            [new THREE.Vector3(0, 0, -1),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, -1),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, 1)]);
        animalMovement(fox1,[new THREE.Vector3(4, 0, 0),new THREE.Vector3(20, 0, 0), new THREE.Vector3(20, 0, 15),new THREE.Vector3(5, 0, 15)], 
                [new THREE.Vector3(1, 0, 0),new THREE.Vector3(1, 0, 0),new THREE.Vector3(0, 0, 1),new THREE.Vector3(-1, 0, 0)]);
                       

        requestAnimationFrame( animate );
        render();
    };

    function render() {
        renderer.render( scene, camera );
    }

    animate();
}

/*
day cycle: ~45 seconds in real life
night cycle: ~45 seconds in real life
total cycle: ~90 seconds in real life
 */
function dayAndNightCycle() {
    var timePassed = performance.now() / 15000;
    directionalLight.position.y = Math.sin(timePassed) * 50;
    directionalLight.position.x = Math.cos(timePassed) * 50 - directionalLight.position.y;
    directionalLight.position.z = Math.cos(timePassed) * 50;
    directionalLight.intensity = Math.max(Math.sin(timePassed), 0);
    if(directionalLight.position.y <= 0) directionalLight.intensity = 0;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function keyEvents(){
        window.addEventListener("keydown", function(event){ 
            switch ( event.code ) {
                case 'ArrowUp':
		case 'KeyW':
                    moveForward = true;
                    break;
		case 'ArrowLeft':
		case 'KeyA':                    
                    moveLeft = true;
		    break;
		case 'ArrowDown':
		case 'KeyS':
                    moveBackward = true;
                    break;
		case 'ArrowRight':
		case 'KeyD':
                    moveRight = true;
                    break;
                case 'Digit1':
                    moveUp = true;
                    camera.position.y += 0.5;
                    break;
                case 'Digit2':
                    moveDown = true;
                    camera.position.y -= 0.5;
                    break;
                case 'KeyQ':
                    camera.rotation.z += 0.1;
                    break;
                case 'KeyE':
                    camera.rotation.z -= 0.1;
                    break;
                case 'KeyR':
                    if(!controls.isLocked){
                        controls.lock();
                    }
                    else{
                        controls.unlock();
                    }
                    break;
                    
        }
    });
        window.addEventListener("keyup", function(event){
            switch ( event.code ) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                    moveLeft = false;
                    break;

            case 'ArrowDown':
            case 'KeyS':
                    moveBackward = false;
                    break;

            case 'ArrowRight':
            case 'KeyD':
                    moveRight = false;
                    break;
            case 'PageUp':
                moveUp = false;
                break;
            case 'PageDown':
                moveDown = false;
                break;

            }
        });
}
function initLights(){
    // LIGHTS
    // Ambient light for general illumination
    ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    //sceneDisplay.add(ambientLight);
    sceneObjects.push(ambientLight);

    // directional light
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(-3, 25, -3);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.top += 60;
    directionalLight.shadow.camera.bottom -= 60;
    directionalLight.shadow.camera.right += 60;
    directionalLight.shadow.camera.left -= 60;
    directionalLight.shadow.mapSize.width = 2048; // Shadow Quality
    directionalLight.shadow.mapSize.height = 2048; // Shadow Quality
    directionalLight.shadow.bias = 0.0001;
    // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera)); // Help show light properties in the scene
    scene.add(directionalLight);
    sceneObjects.push(directionalLight);
    
    // Spotlight for specific illumination
    spotLight = new THREE.SpotLight(0xAAAAAA);
    spotLight.position.set(0, 20, 0);
    spotLight.castShadow = true;
    spotLight.shadow.bias = 0.0001;
    spotLight.angle = Math.PI / 18 ;
    spotLight.shadow.mapSize.width = 2048; // Shadow Quality
    spotLight.shadow.mapSize.height = 2048; // Shadow Quality
    // scene.add(new THREE.CameraHelper(spotLight.shadow.camera)); // Help show light properties in the scene
    //scene.add(spotLight.target);
    scene.add(spotLight);
    scene.add(spotLight.target);
    sceneObjects.push(spotLight);
}

//-----------------DECISION TREE STARTS----------------------------------------------------------------------//
//Import DecisionTree
var DecisionTree = require('decision-tree');

/*
temp: cold/hot
water: dry/wet
humidity: low/high
light: short/long
tree: Apple/Pine/Cactus/Poplar
 */
//Create training data
//Test data is compared to this data to check accuracy
//Predictions are made on this data to give results
var training_data = [
    {"temperature": "cold", "water": "dry", "humidity": "low", "light": "short", "tree": "Pine"},
    {"temperature": "cold", "water": "dry", "humidity": "low", "light": "long", "tree": "Pine"},
    {"temperature": "cold", "water": "dry", "humidity": "high", "light": "short", "tree": "Pine"},
    {"temperature": "cold", "water": "dry", "humidity": "high", "light": "long", "tree": "Apple"},
    {"temperature": "cold", "water": "wet", "humidity": "low", "light": "short", "tree": "Pine"},
    {"temperature": "cold", "water": "wet", "humidity": "low", "light": "long", "tree": "Apple"},
    {"temperature": "cold", "water": "wet", "humidity": "high", "light": "short", "tree": "Apple"},
    {"temperature": "cold", "water": "wet", "humidity": "high", "light": "long", "tree": "Apple"},
    {"temperature": "hot", "water": "dry", "humidity": "low", "light": "short", "tree": "Cactus"},
    {"temperature": "hot", "water": "dry", "humidity": "low", "light": "long", "tree": "Cactus"},
    {"temperature": "hot", "water": "dry", "humidity": "high", "light": "short", "tree": "Poplar"},
    {"temperature": "hot", "water": "dry", "humidity": "high", "light": "long", "tree": "Cactus"},
    {"temperature": "hot", "water": "wet", "humidity": "low", "light": "short", "tree": "Poplar"},
    {"temperature": "hot", "water": "wet", "humidity": "low", "light": "long", "tree": "Cactus"},
    {"temperature": "hot", "water": "wet", "humidity": "high", "light": "short", "tree": "Poplar"},
    {"temperature": "hot", "water": "wet", "humidity": "high", "light": "long", "tree": "Poplar"},
];

//Used to check the accuracy of the model
var test_data = [
    {"temperature": "cold", "water": "dry", "humidity": "low", "light": "short", "tree": "Pine"},
    {"temperature": "cold", "water": "dry", "humidity": "high", "light": "long", "tree": "Apple"},
    {"temperature": "hot", "water": "wet", "humidity": "low", "light": "long", "tree": "Cactus"},
    {"temperature": "hot", "water": "wet", "humidity": "high", "light": "long", "tree": "Poplar"},
];

var class_name = "tree";
var features = ["temperature", "water", "humidity", "light"];

var dt = new DecisionTree(class_name, features);

dt.train(training_data);

var accuracy = dt.evaluate(test_data);
console.log("Decision Tree Test Data Accuracy:", accuracy, "Expected: 1");

var predicted_class;

function setTemperature(temperatureInput) {
    if (-30 <= temperatureInput && temperatureInput <= 15) {
        return "cold";
    }
    else if (15 < temperatureInput && temperatureInput <= 60) {
        return "hot";
    }

    console.log("Given temperature value", temperatureInput, "is not in the value range!");
    return null;
}

function setWater(waterInput) {
    if (20 <= waterInput && waterInput <= 760) {
        return "dry";
    }
    else if (760 < waterInput && waterInput <= 1500) {
        return "wet";
    }

    console.log("Given water value", waterInput, "is not in the value range!");
    return null;
}

function setHumidity(humidityInput) {
    if (30 <= humidityInput && humidityInput <= 50) {
        return "low";
    }
    else if (50 < humidityInput && humidityInput <= 75) {
        return "high";
    }

    console.log("Given humidity value", humidityInput, "is not in the value range!");
    return null;
}

function setLight(lightInput) {
    if (4 <= lightInput && lightInput <= 7) {
        return "short";
    }
    else if (7 < lightInput && lightInput <= 11) {
        return "long";
    }

    console.log("Given light value", lightInput, "is not in the value range!");
    return null;
}

//According to given values predicts and returns the prediction
function predictTree(temperatureInput, waterInput, humidityInput, lightInput) {
    //Set prediction values
    var temperature = setTemperature(temperatureInput);
    var water = setWater(waterInput);
    var humidity = setHumidity(humidityInput);
    var light = setLight(lightInput);

    //Do prediction
    if (temperature != null && water != null && humidity != null && light != null) {
        return dt.predict({
            temperature: temperature,
            water: water,
            humidity: humidity,
            light: light
        });
    }

    console.log("Some prediction value is wrong. Continuing without predicting!")
    return null;
}
//-----------------DECISION TREE ENDS------------------------------------------------------------------------//

//Guess system with GUI
var guessCount = 0;
var points = 0;

function handleGuess() {
    answer.object.answer = predicted_class;

    if (guess.object.guess === predicted_class) {
        guessCount++;
        if (guessCount % 6 === 0) points += 100;
        else points += 10;
        pointsGUI.object.points = points;
    }
}

//When called (from the UI), handles everything about prediction
function handlePrediction(temperatureInput, waterInput, humidityInput, lightInput) {
    //Predict the tree according to given values
    predicted_class = predictTree(temperatureInput, waterInput, humidityInput, lightInput);
    
    if (predicted_class != null && hasReturned) {
        handleGuess(); //Calculates points and shows right answers
        previousTree = predictedTreeModel;
        // Store the predicted tree model
        predictedTreeModel = loadPredictedTree(predicted_class);
        // Start the movements
        moveWheelbarrow = true;
        // To predict if wheelbarrow returned the base;
        hasReturned = false;
    }
}

var twist = false;
var guess;
var answer;
var pointsGUI;

function createPanel(){
    const panel = new GUI({ width: 310 } );
    panel.title("GUI");
    panel.close();

    //Scene settings will be under this folder
    const settings = panel.addFolder('Settings');

    const objectSettings = {
        'X Rotation':0.0,
        'Y Rotation':0.0,
        'Z Rotation':0.0,
    }

    const object = settings.addFolder('Object Settings');

    // OBJECT ROTATION
    object.add(objectSettings,'X Rotation',0,Math.PI * 2).onChange( function(val){
        rotateAboutXAxis(selectedObject,val);
    });
    object.add(objectSettings, 'Y Rotation',0,Math.PI * 2).onChange( function(val){
        rotateAboutYAxis(selectedObject,val);
    });
    object.add(objectSettings, 'Z Rotation',0,Math.PI * 2).onChange( function(val){
        rotateAboutZAxis(selectedObject,val);
    });

    // OBJECT TRANSFORM
    var moveForward = { moveForward:function(){ transformOnZ(selectedObject,1); }};
    object.add(moveForward,'moveForward').name("Forward");
    var moveBackward = { moveBackward:function(){ transformOnZ(selectedObject,-1); }};
    object.add(moveBackward,'moveBackward').name("Backward");
    var moveLeft = { moveLeft:function(){ transformOnX(selectedObject,-1); }};
    object.add(moveLeft,'moveLeft').name("Left");
    var moveRight = { moveRight:function(){ transformOnX(selectedObject,1); }};
    object.add(moveRight,'moveRight').name("Right");
    var moveUp = { moveUp:function(){ transformOnY(selectedObject,1); }};
    object.add(moveUp,'moveUp').name("Up");
    var moveDown = { moveDown:function(){ transformOnY(selectedObject,-1); }};
    object.add(moveDown,'moveDown').name("Down");

     // Spotlight Settings
    const spotlight = settings.addFolder('Spotlight');
    const spotlightSettings = {
        intensity: spotLight.intensity,
        'X Rotation':spotLight.target.position.x,
        'Y Rotation':spotLight.target.position.y,
        'Z Rotation':spotLight.target.position.z,
    };
    spotlight.add( spotlightSettings, 'intensity', 0, 2 ).name("Intensity").onChange( function ( val ) {
        spotLight.intensity = val;
    } );
    // light on/off
    var lightTurnOnOff = { lightTurnOnOff:function(){ if(spotLight.visible === false){spotLight.visible = true;} else{spotLight.visible = false;} }};
    spotlight.add(lightTurnOnOff,'lightTurnOnOff').name("Turn On/Off");
    
    // spotlight transformation rotation
    // rotation
    spotlight.add(spotlightSettings,'X Rotation',-100,100).onChange( function(val){
        changeSpotlightTarget = true;
        spotLight.target.position.x = val;
    });
    spotlight.add(spotlightSettings,'Y Rotation',-100,100).onChange( function(val){
        changeSpotlightTarget = true;
        spotLight.target.position.y = val;
    });
    spotlight.add(spotlightSettings,'Z Rotation',-100,100).onChange( function(val){
        changeSpotlightTarget = true;
        spotLight.target.position.z = val;
    });
    
    // transformation
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.x += 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("X+");
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.x -= 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("X-");
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.y += 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("Y+");
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.y -= 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("Y-");
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.z += 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("Z+");
    var spotlightPositiveZ = { spotlightPositiveZ:function(){ spotLight.position.z -= 1; }};
    spotlight.add(spotlightPositiveZ,'spotlightPositiveZ').name("Z-");

    //Shadows
    const shadowSettings = settings.addFolder('Shadow Settings');

    //Shadow Quality
    var q = shadowSettings.add({q: "Medium"},'q', ["Low", "Medium", "High"]).name('Shadow Quality').onChange(shadowQuality);
    var quality;
    function shadowQuality() {
        if(q.object.q === "Low")  quality = 1024;
        else if(q.object.q === "Medium") quality = 2048;
        else if(q.object.q === "High") quality = 4096;

        directionalLight.shadow.map.dispose()
        directionalLight.shadow.map = null
        directionalLight.shadow.mapSize.width = quality; // Shadow Quality
        directionalLight.shadow.mapSize.height = quality; // Shadow Quality
    }

    //Turn ON and OFF directional light's Shadows (sun)
    var toggleShadowsButton = {
        add:function() {
            directionalLight.castShadow = !directionalLight.castShadow;
            spotLight.castShadow = !spotLight.castShadow;
        }
    }
    shadowSettings.add(toggleShadowsButton, 'add').name("Toggle Shadows");

    //Shaders
    var isDefaultMaterial = true;
    var defaultMaterials = [];
    var count = 0;
    var switchShadersButton = {
        add:function() {
            sceneObjects.forEach(function(obj) {
                if(obj.name === "plane") {
                    if(isDefaultMaterial) {
                        defaultMaterials[count] = obj.material;
                        count++;
                        obj.material = new THREE.MeshStandardMaterial({
                            color: obj.material.color,
                            map: obj.material.map
                        });
                    }
                    else {
                        obj.material = defaultMaterials[count];
                        count++;
                    }
                }
                else if(obj.name === "tree") {
                    obj.traverse( function( node ) {
                        if ( node.isMesh ) {
                            if(node.material != null) {
                                if(isDefaultMaterial) {
                                    defaultMaterials[count] = node.material;
                                    count++;
                                    node.material = Shaders.buildTwistMaterial(
                                        18, performance.now, node.material.color, node.material.map
                                    )
                                    twist = true;
                                }
                                else {
                                    node.material = defaultMaterials[count];
                                    count++;
                                }
                            }
                        }
                    });
                }
                else if(obj.name === "sceneOBJ") {
                    obj.traverse( function( node ) {
                        if ( node.isMesh ) {
                            if(isDefaultMaterial) {
                                defaultMaterials[count] = node.material;
                                count++;
                                node.material = new THREE.MeshStandardMaterial({
                                    color: node.material.color,
                                    map: node.material.map
                                });
                            }
                            else {
                                node.material = defaultMaterials[count];
                                count++;
                            }
                        }
                    });
                }
            });
            isDefaultMaterial = !isDefaultMaterial;
            count = 0;
        }
    }
    settings.add(switchShadersButton, 'add').name("Switch Shaders");

    object.close();
    spotlight.close();
    shadowSettings.close();
    settings.close();
    //Scene settings folder ends here

    //-------------------------------------------------------------------------------//

    //Prediction settings will be under this folder
    const predictionSettings = panel.addFolder('Prediction');
    const parameterSettings = predictionSettings.addFolder("Parameters");

    const parameters = {
        temperature: 15,
        water: 500,
        humidity:40,
        light: 6,
    };
    parameterSettings.add(parameters, 'temperature', -30, 60, 1).name('Temperature  (C)');
    parameterSettings.add(parameters, 'water', 20, 1500, 10).name('Water  (ml / week)');
    parameterSettings.add(parameters, 'humidity', 30, 75, 5).name('Humidity  (%)');
    parameterSettings.add(parameters, 'light', 4, 11, 1).name('Light  (h / day)');

    //Guess and points
    guess = predictionSettings.add({guess: "None"},'guess',["None", "Pine", "Apple", "Cactus", "Poplar"]).name('Your Guess');
    answer = predictionSettings.add({answer: ""},'answer' ).name('Correct Answer').listen().disable();
    pointsGUI = predictionSettings.add({points: 0},'points' ).name('Points Earned').listen().disable();

    //Take inputs from UI and call when prediction button is clicked
    var predictionButton = {
        add:function(){
            if(wheelbarrowFinished)
                handlePrediction(parameters.temperature, parameters.water, parameters.humidity, parameters.light);
            // To make spotlight follow wheelbarrow
            changeSpotlightTarget = false;
        }
    };
    predictionSettings.add(predictionButton,'add').name("Start Prediction");

    // parameterSettings.close();
    predictionSettings.close();
    //Prediction settings folder ends here
}

function twistScene() {
    scene.traverse( function ( child ) {
        if(child.name === "tree") {
            child.traverse( function( node ) {
                if ( node.isMesh ) {
                    if(node.material != null) {
                        const s = node.material.userData.shader;
                        if(s) {
                            s.uniforms.time.value = performance.now() / 1000;
                        }
                    }
                }
            });
        }
    });
}

function intersect(pos) {
  raycaster.setFromCamera(pos, camera);
  return raycaster.intersectObjects(sceneObjects, true);
}

// GLTF LOAD FUNCTIONS
function appleTreeGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/apple_tree/AppleTree.gltf', function(gltf){
        const mesh = gltf.scene;
        // Scale it a little
        mesh.scale.set(1.5,1.5,1.5);
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "tree";
        mesh.children[0].userData.draggable = true;
        appleTreeModel = mesh;
    });
}

function poplarTreeGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/white_poplar_tree/poplar_tree.gltf', function(gltf){
        const mesh = gltf.scene;
        // Scale it a little
        mesh.scale.set(1.5,1.5,1.5);
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "tree";
        mesh.children[0].userData.draggable = true;
        //mesh.rotation.y = 1.0;        // to make it look better;
        poplarTreeModel = mesh;
    });
}

function pineTreeGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/pine/pine.gltf', function(gltf){
        const mesh = gltf.scene;    
        // Scale it a little
        mesh.scale.set(1.5,1.5,1.5);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "tree";
        mesh.children[0].userData.draggable = true;
        pineTreeModel = mesh;
    });
}

function cactusGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/cactus/cactus.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        mesh.scale.set(1.5,1.5,1.5);
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "tree";
        mesh.children[0].userData.draggable = true;
        cactusModel = mesh;
    });
    
}

function fenceGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/fence/fence.gltf', function(gltf){
        const mesh = gltf.scene;     
        mesh.rotation.y = Math.PI / 2;
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: 0xE16D0D,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        fenceModel = mesh;
    });
}

function shedGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/shed/shed.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        mesh.scale.set(2,2,2);
        mesh.rotation.y = Math.PI / 2;
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        shedModel = mesh;
    });
}

function wheelbarrowGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/wheelbarrow/wheelbarrow.gltf', function(gltf){
        const mesh = gltf.scene;     
         // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = Shaders.CustomPhongShader(
                    node.material.color,
                    node.material.color,
                    new THREE.Color(0x555555),
                    new THREE.Vector4(0.6, 0.6, 0.6, 1.0),
                    new THREE.Vector4(0, 20, 0, 1),
                    1000
                );

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "wheelbarrow";
        wheelbarrowModel = mesh;
    });
}

function pondGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/pond/pond.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        mesh.scale.set(0.2,0.2,0.2);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        pondModel = mesh;
    });
}

function millGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/mill/mill.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        mesh.scale.set(4,4,4);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        millModel = mesh;
    });
}

function sheepGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/sheep/sheep.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        mesh.scale.set(2,2,2);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        sheepModel = mesh;
    });
}

function deerGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/deer/deer.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        //mesh.scale.set(2,2,2);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        deerModel = mesh;
    });
}

function foxGLTF(){
    const loader = new GLTFLoader(loadingManager);
    loader.load('./models/fox/fox.gltf', function(gltf){
        const mesh = gltf.scene;     
        // Scale it a little
        //mesh.scale.set(2,2,2);
        // Cast and recieve shadow
        mesh.traverse( function( node ) {
            if ( node.isMesh ) {
                node.material = new THREE.MeshToonMaterial({
                    color: node.material.color,
                    map: node.material.map
                });

                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        mesh.name = "sceneOBJ";
        mesh.userData.draggable = true;
        foxModel = mesh;
    });
}

function rotateAboutXAxis(object, rad){
    if(object != null){
        object.traverse( function (child){
            if ( child instanceof THREE.Mesh ){
               child.rotation.x = rad;
            }
        }); 
   }
}

function rotateAboutYAxis(object, rad){
    if(object != null){
        object.traverse( function (child){
            if ( child instanceof THREE.Mesh ){
                 child.rotation.y = rad;
            }
        });
    } 
}

function rotateAboutZAxis(object, rad){
    if(object != null){
        object.traverse( function (child){
            if ( child instanceof THREE.Mesh ){
                child.rotation.z = rad;
            }
        });
    }  
}

function transformOnX(object, amount){
    if(object != null && object.userData.draggable){
        object.position.x += amount;
   }
}

function transformOnY(object, amount){
    if(object != null && object.userData.draggable){
        object.position.y += amount;
    } 
}

function transformOnZ(object, amount){
    if(object != null && object.userData.draggable){
        object.position.z += amount;
    }  
}

function cameraControls(){
    const delta = 0.005;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveRight ) - Number( moveLeft );
    direction.normalize(); // this ensures consistent movements in all directions

    if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

    controls.moveRight( - velocity.x * delta );
    controls.moveForward( - velocity.z * delta );

}

function loadModels(){
    appleTreeGLTF();
    poplarTreeGLTF();
    cactusGLTF();
    pineTreeGLTF();
    fenceGLTF();
    shedGLTF();
    wheelbarrowGLTF();
    pondGLTF();
    millGLTF();
    sheepGLTF();
    deerGLTF();
    foxGLTF();
}

function addCactus(position){
    var newCactus = cactusModel.clone();
    newCactus.position.set(position.x, position.y, position.z);
     // Randomly rotate 
    rotateAboutZAxis(newCactus, Math.floor(Math.random() * (0 - (2*Math.PI) + 1) + (2*Math.PI)));
    sceneObjects.push(newCactus);
    scene.add(newCactus); 
}

function addAppleTree(position){
    var newAppleTree = appleTreeModel.clone();
    newAppleTree.position.set(position.x, position.y, position.z);
     // Randomly rotate 
    rotateAboutZAxis(newAppleTree, Math.floor(Math.random() * (0 - (2*Math.PI) + 1) + (2*Math.PI)));
    sceneObjects.push(newAppleTree);
    scene.add(newAppleTree); 
}

function addPoplarTree(position){
    var newPoplarTree = poplarTreeModel.clone();
    newPoplarTree.position.set(position.x, position.y, position.z);
    // Randomly rotate 
    rotateAboutZAxis(newPoplarTree, Math.floor(Math.random() * (0 - (2*Math.PI) + 1) + (2*Math.PI)));
    sceneObjects.push(newPoplarTree);
    scene.add(newPoplarTree); 
}

function addPineTree(position){
    var newPineTree = pineTreeModel.clone();
    newPineTree.position.set(position.x, position.y, position.z);
    // Randomly rotate 
    rotateAboutZAxis(newPineTree, Math.floor(Math.random() * (0 - (2*Math.PI) + 1) + (2*Math.PI)));
    sceneObjects.push(newPineTree);
    scene.add(newPineTree); 
}

function addFence(position, rotate){
    var fence = fenceModel.clone();
    fence.position.set(position.x, position.y, position.z);
    if(rotate){
        fence.rotation.y += Math.PI/2;
    }
    sceneObjects.push(fence);
    scene.add(fence); 
}

function addShed(position){
    var newShed = shedModel.clone();
    newShed.position.set(position.x, position.y, position.z);
    sceneObjects.push(newShed);
    scene.add(newShed); 
}

function addWheelbarrow(position){
    var newWheelbarrow = wheelbarrowModel.clone();
    newWheelbarrow.position.set(position.x, position.y, position.z);
    newWheelbarrow.rotation.y = Math.PI;
    wheelbarrow = newWheelbarrow;
    sceneObjects.push(newWheelbarrow);
    scene.add(newWheelbarrow); 
}

function addPond(position){
    var pond = pondModel.clone();
    pond.position.set(position.x, position.y, position.z);
    sceneObjects.push(pond);
    scene.add(pond); 
}

function addMill(position){
    var mill = millModel.clone();
    mill.position.set(position.x, position.y, position.z);
    sceneObjects.push(mill);
    scene.add(mill); 
}

function addSheep(position, rotation){
    var sheep = sheepModel.clone();
    sheep.rotation.y = rotation;
    sheep.position.set(position.x, position.y, position.z);
    // for sheep movement path
    sheep.userData.completeFirstPath = true;
    sheep.userData.pathIndex = 0;
    sheep.userData.returnPathIndex = 0;
    sceneObjects.push(sheep);
    scene.add(sheep); 
    return sheep;
}

function addDeer(position, rotation){
    var deer = deerModel.clone();
    deer.rotation.y = rotation;
    deer.position.set(position.x, position.y, position.z);
    // for sheep movement path
    deer.userData.completeFirstPath = true;
    deer.userData.pathIndex = 0;
    deer.userData.returnPathIndex = 0;
    sceneObjects.push(deer);
    scene.add(deer); 
    return deer;
}

function addFox(position, rotation){
    var fox = foxModel.clone();
    fox.rotation.y = rotation;
    fox.position.set(position.x, position.y, position.z);
    // for sheep movement path
    fox.userData.completeFirstPath = true;
    fox.userData.pathIndex = 0;
    fox.userData.returnPathIndex = 0;
    sceneObjects.push(fox);
    scene.add(fox); 
    return fox;
}

function onResourcesLoaded(){ 
    //APPLE TREES
    addAppleTree(new THREE.Vector3( -20, 0, -35 ));
    addAppleTree(new THREE.Vector3( -30, 0, -30 ));
    addAppleTree(new THREE.Vector3( -10, 0, -30 ));
    addAppleTree(new THREE.Vector3( -10, 0, -10 ));
    addAppleTree(new THREE.Vector3( -30, 0, -10 ));
    addAppleTree(new THREE.Vector3( -35, 0, -20 ));
    //addAppleTree(new THREE.Vector3( -35, 0, -5 ));
    addAppleTree(new THREE.Vector3( -5, 0, -5 ));
    
    //PINE TREES
    addPineTree(new THREE.Vector3( 10, 0, -30 ));
    addPineTree(new THREE.Vector3( 10, 0, -15 ));
    addPineTree(new THREE.Vector3( 10, 0, -5 ));
    addPineTree(new THREE.Vector3( 20, 0, -10 ));
    addPineTree(new THREE.Vector3( 35, 0, -5 ));
    addPineTree(new THREE.Vector3( 35, 0, -10 ));
    addPineTree(new THREE.Vector3( 35, 0, -30 ));
    addPineTree(new THREE.Vector3( 20, 0, -35 ));

    
    //CACTUS TREES
    addCactus(new THREE.Vector3( -10, 0, 10 ));
    addCactus(new THREE.Vector3( -30, 0, 10 ));
    addCactus(new THREE.Vector3( -15, 0, 15 ));
    addCactus(new THREE.Vector3( -5, 0, 25 ));
    addCactus(new THREE.Vector3( -35, 0, 25 ));
    addCactus(new THREE.Vector3( -30, 0, 35 ));
    addCactus(new THREE.Vector3( -15, 0, 35 ));

    
    //POPLAR TREES
    addPoplarTree(new THREE.Vector3( 5, 0, 5 ));
    addPoplarTree(new THREE.Vector3( 15, 0, 10 ));
    addPoplarTree(new THREE.Vector3( 15, 0, 15 ));
    addPoplarTree(new THREE.Vector3( 5, 0, 20 ));
    addPoplarTree(new THREE.Vector3( 5, 0, 30 ));
    addPoplarTree(new THREE.Vector3( 20, 0, 35 ));
    addPoplarTree(new THREE.Vector3( 30, 0, 30 ));

    // POND
    addPond(new THREE.Vector3( 0, 0, 0 ));
    
    // MILL
    addMill(new THREE.Vector3( -35, 0, -35 ));
    
    //WHEELBARROW
    addWheelbarrow(new THREE.Vector3( 30, 0, -45 ));
    
    //SHEEP
    sheep1 = addSheep(new THREE.Vector3( 0, 0, -5 ), Math.PI/2);
    sheep2 = addSheep(new THREE.Vector3( -35, 0, -10 ), Math.PI);
    
    // DEER
    deer1 = addDeer(new THREE.Vector3( 5, 0, -25 ), Math.PI/2);
    deer2 = addDeer(new THREE.Vector3( 5, 0, -5 ), Math.PI/2);
    
    // FOX
    fox1 = addFox(new THREE.Vector3(4, 0, 0),Math.PI/2);
    // SHED
    addShed(new THREE.Vector3( 35, 0, -45 ));
    
    // FENCES
    for(let i = -36; i < 44; i += 6){
        addFence(new THREE.Vector3( -40, 0, i ),false);
    }
     for(let i = -36; i < 44; i += 6){
        addFence(new THREE.Vector3( 40, 0, i ),false);
    }
    // Add rotated fences
    for(let i = -36; i < 36; i += 6){
        addFence(new THREE.Vector3( i, 0, -40 ),true);
    }
    for(let i = -36; i < 44; i += 6){
        addFence(new THREE.Vector3( i, 0, 40 ),true);
    }
}

function createPlanes(){
    // TEXTURES
    const textureLoader = new THREE.TextureLoader();
    // Soil
    const soilTexture = textureLoader.load('./textures/soil.jpg' );
    soilTexture.wrapS = THREE.RepeatWrapping;
    soilTexture.wrapT = THREE.RepeatWrapping;
    soilTexture.repeat.set( 4, 4 );
    // Snow
    const snowTexture = textureLoader.load('./textures/snow.jpg' );
    snowTexture.wrapS = THREE.RepeatWrapping;
    snowTexture.wrapT = THREE.RepeatWrapping;
    snowTexture.repeat.set( 4, 4 );
    // Dry Soil
    const drySoilTexture = textureLoader.load('./textures/dry_soil.jpg' );
    drySoilTexture.wrapS = THREE.RepeatWrapping;
    drySoilTexture.wrapT = THREE.RepeatWrapping;
    drySoilTexture.repeat.set( 4, 4 );
    // Grass
    const grassTexture = textureLoader.load('./textures/grass.jpg' );
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set( 4, 4 );
    
    // PLANE 1
    const geometry_plane = new THREE.PlaneBufferGeometry(40, 40, 20, 20);
    const material_plane1 = new THREE.MeshToonMaterial({
        color: new THREE.Color(0x0D2903),
        map: grassTexture
    });
    const plane1 = new THREE.Mesh(geometry_plane, material_plane1);
    plane1.name = "plane";
    plane1.material.needsUpdate = true; 
    plane1.rotation.x = -Math.PI / 2;
    plane1.position.y = 0;
    plane1.position.x = -20;
    plane1.position.z = -20;
    plane1.receiveShadow = true;
    plane1.userData.draggable = false;
    plane1.userData.ground = true;
    scene.add(plane1);
    sceneObjects.push(plane1);
    
    // PLANE 2
    const material_plane2 = new THREE.MeshToonMaterial({
        color: new THREE.Color("white"),
        map: snowTexture,
    });
    const plane2 = new THREE.Mesh(geometry_plane, material_plane2);
    plane2.name = "plane";
    plane2.material.needsUpdate = true; 
    plane2.rotation.x = -Math.PI / 2;
    plane2.position.y = 0;
    plane2.position.x = 20;
    plane2.position.z = -20;
    plane2.receiveShadow = true;
    plane2.userData.draggable = false;
    plane2.userData.ground = true;
    scene.add(plane2);
    sceneObjects.push(plane2);
    
    // PLANE 3
    const material_plane3 = new THREE.MeshToonMaterial({
        color: new THREE.Color(0xF8C471),
        map: drySoilTexture
    });
    const plane3 = new THREE.Mesh(geometry_plane, material_plane3);
    plane3.name = "plane";
    plane3.material.needsUpdate = true; 
    plane3.rotation.x = -Math.PI / 2;
    plane3.position.y = 0;
    plane3.position.x = -20;
    plane3.position.z = 20;
    plane3.receiveShadow = true;
    plane3.userData.draggable = false;
    plane3.userData.ground = true;
    scene.add(plane3);
    sceneObjects.push(plane3);
    
     // PLANE 4
    const material_plane4 = new THREE.MeshToonMaterial({
        color: new THREE.Color("green"),
        map: grassTexture
    });
    const plane4 = new THREE.Mesh(geometry_plane, material_plane4);
    plane4.name = "plane";
    plane4.material.needsUpdate = true; 
    plane4.rotation.x = -Math.PI / 2;
    plane4.position.y = 0;
    plane4.position.x = 20;
    plane4.position.z = 20;
    plane4.receiveShadow = true;
    plane4.userData.draggable = false;
    plane4.userData.ground = true;
    scene.add(plane4);
    sceneObjects.push(plane4);
    
    // BIG PLANE
    const geometry_plane5 = new THREE.PlaneBufferGeometry(1000, 1000, 20, 20);
    const material_plane5 = new THREE.MeshToonMaterial({
        color: new THREE.Color(0x442903),
        map: soilTexture
    });
    const plane5 = new THREE.Mesh(geometry_plane5, material_plane5);
    plane5.name = "plane";
    plane5.material.needsUpdate = true; 
    plane5.rotation.x = -Math.PI / 2;
    plane5.position.y = -0.1;
    plane5.position.x = 0;
    plane5.receiveShadow = true;
    plane5.userData.draggable = false;
    plane5.userData.ground = true;
    scene.add(plane5);
    sceneObjects.push(plane5);
    
}

function loadPredictedTree(treeType){
    predictedTreeName = treeType;
    putDownTree = false;
    var predictedTreeModel;
    if(treeType === "Poplar")
        predictedTreeModel = poplarTreeModel;
    if(treeType === "Pine")
        predictedTreeModel = pineTreeModel;
    if(treeType === "Apple")
        predictedTreeModel = appleTreeModel;
    if(treeType === "Cactus")
        predictedTreeModel = cactusModel;
    
    if(predictedTreeModel !== null){
        //var newTree = predictedTreeModel.clone();
        var newTree = predictedTreeModel.deepClone();
        newTree.name = "tree";
        newTree.position.set(35, -5 ,-50); 
        sceneObjects.push(newTree);
        scene.add(newTree);  
        return newTree;
    }
}

function spanPredictedTree(treeObject){
    
    if(treeObject !== null){
        var direction = new THREE.Vector3();
        direction.subVectors( new THREE.Vector3(35,1,-45), treeObject.position ).normalize();

        // scalar to simulate speed
        var speed = 0.1;

        var vector = direction.multiplyScalar( speed, speed, speed );
        
        if(treeObject.position.y < 1 && !putDownTree){
            treeObject.position.x += vector.x;
            treeObject.position.y += vector.y;
            treeObject.position.z += vector.z; 

            // Rotation
            treeObject.rotation.y += 0.1;
        }
        else{
            if(predictedTreeName === "Pine"){
                treeObject.userData.draggable = true;
                treeObject.userData.name = "pine";
                wheelbarrowMovement([new THREE.Vector3(35,0,-45), new THREE.Vector3(35,0,-20), new THREE.Vector3(20,0,-20)],
                               [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0)]);
            }
            if(predictedTreeName === "Apple"){
                treeObject.userData.draggable = true;
                treeObject.userData.name = "apple";
                wheelbarrowMovement([new THREE.Vector3(35,0,-45), new THREE.Vector3(35,0,-20), new THREE.Vector3(20,0,-20), new THREE.Vector3(-20,0,-20)],
                               [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0),new THREE.Vector3(-1,0,0)]);
            }
            if(predictedTreeName === "Cactus"){
                treeObject.userData.draggable = true;
                treeObject.userData.name = "Cactus";
                wheelbarrowMovement([new THREE.Vector3(35,0,-45), new THREE.Vector3(35,0,-20), new THREE.Vector3(20,0,-20), new THREE.Vector3(-20,0,-20), new THREE.Vector3(-20,0,20)],
                               [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1)]);
            }
            if(predictedTreeName === "Poplar"){
                treeObject.userData.draggable = true;
                treeObject.userData.name = "Poplar";
                wheelbarrowMovement([new THREE.Vector3(35,0,-45), new THREE.Vector3(35,0,-20),new THREE.Vector3(35,0,20),new THREE.Vector3(20,0,20)],
                               [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0)]);
            }
            
        }
        
    }     
}

// Animation of wheelbarrow
function wheelbarrowMovement(path, directionArray){
    let len = path.length;
      
    // scalar to simulate speed
    var speed = 0.1;
    
    // Get world position of wheelbarrow
    var wheelbarrowPosition =  new THREE.Vector3();
    wheelbarrow.getWorldPosition(wheelbarrowPosition);
    
    if(pathIndex < len && moveWheelbarrow){
        wheelbarrowFinished = false;
        var targetPosition = path[pathIndex];
         // Calculate direction
        var direction = new THREE.Vector3();
        direction.subVectors( targetPosition, wheelbarrowPosition ).normalize();
        var vector = direction.multiplyScalar( speed, speed, speed );
        
        // Change its position until reached the target point
        if(wheelbarrow.position.x.toFixed(1) !== targetPosition.x.toFixed(1) || wheelbarrow.position.z.toFixed(1) !== targetPosition.z.toFixed(1)){
            rotateWheelbarrow(directionArray[pathIndex]);
           
            wheelbarrow.position.x += vector.x;
            wheelbarrow.position.y += vector.y;
            wheelbarrow.position.z += vector.z;
            
            if(pathIndex !== 0){
                 // Move the tree with wheel
                predictedTreeModel.position.x += vector.x;
                //predictedTreeModel.position.y += vector.y;
                predictedTreeModel.position.z += vector.z;              
            }
           
        }
        // Go to next point
        else{
            pathIndex++;
        }
    }
    // finished the path
    else{
        pathIndex = 0;
        moveWheelbarrow = false;
        predictedTreeModel.userData.draggable = true;
        putDownTree = true;
        if(predictedTreeModel.position.y > 0){
            if(previousTree !== null) {
                if(previousTree.userData.name === predictedTreeModel.userData.name){

                    scene.remove(previousTree);
                }
                
            }
            predictedTreeModel.position.y -= 0.1;
        }
        //transformOnY(predictedTreeModel, -0.5);
        returnBase();
    }
}

var returnPathIndex = 0;
var hasReturned = true;
function returnBase(){
    var path, directionArray;
    if(predictedTreeName === "Pine"){
        path = [new THREE.Vector3(35,0,-20), new THREE.Vector3(35,0,-45),new THREE.Vector3(30,0,-45)];
        directionArray = [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0)];
    }
    if(predictedTreeName === "Poplar"){
        path = [new THREE.Vector3(35,0,20), new THREE.Vector3(35,0,-45),new THREE.Vector3(30,0,-45)];
        directionArray = [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0)];
    }
    if(predictedTreeName === "Cactus"){
        path = [new THREE.Vector3(-20,0,-20), new THREE.Vector3(35,0,-20), new THREE.Vector3(35,0,-45),new THREE.Vector3(30,0,-45)];
        directionArray = [new THREE.Vector3(0,0,-1), new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0)];
    }
    if(predictedTreeName === "Apple"){
        path = [new THREE.Vector3(35,0,-20), new THREE.Vector3(35,0,-45), new THREE.Vector3(30,0,-45)];
        directionArray = [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(-1,0,0)];
    }
    
    let len = path.length;     
    
    // scalar to simulate speed
    var speed = 0.1;
    
    // Get world position of wheelbarrow
    var wheelbarrowPosition =  new THREE.Vector3();
    wheelbarrow.getWorldPosition(wheelbarrowPosition);
    

    if(returnPathIndex < len && !hasReturned){
        var targetPosition = path[returnPathIndex];
         // Calculate direction
        var direction = new THREE.Vector3();
        direction.subVectors( targetPosition, wheelbarrowPosition ).normalize();
        var vector = direction.multiplyScalar( speed, speed, speed );
        
        // Change its position until reached the target point
        if(wheelbarrow.position.x.toFixed(1) !== targetPosition.x.toFixed(1) || wheelbarrow.position.z.toFixed(1) !== targetPosition.z.toFixed(1)){
            rotateWheelbarrow(directionArray[returnPathIndex]);           
            wheelbarrow.position.x += vector.x;
            wheelbarrow.position.y += vector.y;
            wheelbarrow.position.z += vector.z;

        }
        // Go to next point
        else{
            returnPathIndex++;
        }
    }
    // finished the path
    else{
        returnPathIndex = 0;
        hasReturned = true;
        wheelbarrowFinished = true;
    }
}

function animalMovement(sheep,path,directionArray){
    if(sheep === null){
        return;
    }
    
    let len = path.length;
      
    // scalar to simulate speed
    var speed = 0.1;
    
    // Get world position of sheep
    var sheepPosition =  new THREE.Vector3();
    sheep.getWorldPosition(sheepPosition);
    
    // direction for returning
    var reverseDirectionArray = [ new THREE.Vector3(directionArray[len-1].x *-1.0, directionArray[len-1].y *-1.0, directionArray[len-1].z *-1.0)];
    for(let i = len-1; i > 0;i--){
        reverseDirectionArray.push(new THREE.Vector3(directionArray[i].x *-1.0, directionArray[i].y *-1.0, directionArray[i].z *-1.0));
    }
    
    if(!sheep.userData.completeFirstPath){
        var targetPosition = path[sheep.userData.pathIndex];
         // Calculate direction
        var direction = new THREE.Vector3();
        direction.subVectors( targetPosition, sheepPosition ).normalize();
        var vector = direction.multiplyScalar( speed, speed, speed );
        
        // Change its position until reached the target point
        if(sheep.position.x.toFixed(0) !== targetPosition.x.toFixed(0) || sheep.position.z.toFixed(0) !== targetPosition.z.toFixed(0)){
            rotateAnimal(sheep,directionArray[sheep.userData.pathIndex]);
            sheep.position.x += vector.x;
            sheep.position.y += vector.y;
            sheep.position.z += vector.z;
           
        }
        // Go to next point
        else{
            if(sheep.userData.pathIndex === len-1){
                sheep.userData.completeFirstPath = true;
            }
            else sheep.userData.pathIndex++;
        }
    }
    // finished the path
    else{
        var targetPosition = path[sheep.userData.pathIndex];
        // Calculate direction
        var direction = new THREE.Vector3();
        direction.subVectors( targetPosition, sheepPosition ).normalize();
        var vector = direction.multiplyScalar( speed, speed, speed );
        
        // Change its position until reached the target point
        if(sheep.position.x.toFixed(0) !== targetPosition.x.toFixed(0) || sheep.position.z.toFixed(0) !== targetPosition.z.toFixed(0)){
            rotateAnimal(sheep,reverseDirectionArray[sheep.userData.returnPathIndex]);          
            sheep.position.x += vector.x;
            sheep.position.y += vector.y;
            sheep.position.z += vector.z;

        }
        // Go to next point
        else{
            if(sheep.userData.pathIndex === 0){
                sheep.userData.completeFirstPath = false;
                sheep.userData.returnPathIndex = 0;
            }
            else{
                sheep.userData.pathIndex--;
                sheep.userData.returnPathIndex++;
            }
        }
    } 
}

function setSpotlightTarget(){
    if(changeSpotlightTarget === false){
        if(wheelbarrow !== null){
            // Get world position of wheelbarrow
            var wheelbarrowPosition =  new THREE.Vector3();
            wheelbarrow.getWorldPosition(wheelbarrowPosition);
            spotLight.target.position.x = wheelbarrowPosition.x;
            spotLight.target.position.y = wheelbarrowPosition.y;
            spotLight.target.position.z = wheelbarrowPosition.z;
        }
    }
}

// Rotate it with respect to its movement direction
function rotateWheelbarrow(directionVector){
    if(directionVector.x === 1){
        wheelbarrow.rotation.y = Math.PI;
    }
    if(directionVector.x === -1){
        wheelbarrow.rotation.y = 0;
    }
    if(directionVector.z === 1){
        wheelbarrow.rotation.y = Math.PI/2;
    }
    if(directionVector.z === -1){
        wheelbarrow.rotation.y = 3*Math.PI/2;
    }
}

function rotateAnimal(sheep,directionVector){

    if(directionVector.x === 1){
        sheep.rotation.y = Math.PI/2;
    }
    if(directionVector.x === -1){
        sheep.rotation.y = 3*Math.PI/2;
    }
    if(directionVector.z === 1){
        sheep.rotation.y = 0;
    }
    if(directionVector.z === -1){
        sheep.rotation.y = Math.PI;
    }
}

THREE.Object3D.prototype.deepClone = function ( recursive ) {

    return new this.constructor().deepCopy( this, recursive );

}

THREE.Object3D.prototype.deepCopy = function( source, recursive ) {

        if ( recursive === undefined ) recursive = true;

        this.name = source.name;

        this.up.copy( source.up );

        this.position.copy( source.position );
        this.quaternion.copy( source.quaternion );
        this.scale.copy( source.scale );

        this.matrix.copy( source.matrix );
        this.matrixWorld.copy( source.matrixWorld );
        if(source.material){
            //changed
            this.material = source.material.clone()
        }
        if(source.geometry){
            //changed
            this.geometry = source.geometry.clone()
        }
        this.matrixAutoUpdate = source.matrixAutoUpdate;
        this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

        this.layers.mask = source.layers.mask;
        this.visible = source.visible;

        this.castShadow = source.castShadow;
        this.receiveShadow = source.receiveShadow;

        this.frustumCulled = source.frustumCulled;
        this.renderOrder = source.renderOrder;

        this.userData = JSON.parse( JSON.stringify( source.userData ) );

        if ( recursive === true ) {

            for ( var i = 0; i < source.children.length; i ++ ) {

                var child = source.children[ i ];
                this.add( child.deepClone() ); //changed

            }

        }
        return this;
    }

main();		
