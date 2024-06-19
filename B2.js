// p5.js interface to Google MediaPipe Landmark Tracking 
// Tracks 478 points on the face, and calculates 52 face metrics.
// See https://mediapipe-studio.webapps.google.com/home
// Uses p5.js v.1.8.0 + MediaPipe v.0.10.7
// By Golan Levin, version of 10/29/2023
// Huge thanks to Orr Kislev, who made it work in p5's global mode!
// Based off of: https://editor.p5js.org/golan/sketches/0yyu6uEwM

// Don't change the names of these global variables.
let myFaceLandmarker;
let faceLandmarks;
let myCapture;
let lastVideoTime = -1;
let extra;


let eyebrowRaised = false; // Flag to track if eyebrow is raised

let letters = []; // letter array 
let letters2 = []; // letter array
let delayFrames = 240; // 2 seconds to being 
let addedW = false; // Track if first letter has been added 
let delayBetweenLetters = 5; // 1/6 of a second between letters
let nextLetterTime = 0; // Track when to add the next letter
let lettersToAdd = ["O"," ","R","E","C","I","E","V","E"," ","T","H","E"," ","R","G","B"," ","V","A","L","U","E"]; // Letters to add
let lettersToAdd2 = ["R","A","I","S","E"," ","Y","O","U","R"," ","E","Y","E","B","R","O","W","S" ]; // Letters to add

let tryingToNavigate = false; //for loading next html
let noFaceDetectedStartTime = null;
const NO_FACE_DETECTED_THRESHOLD = 30000;

let fillValue;
let freezeFill = false;
let lastFillValue = fillValue; // Initialize with the initial fillValue


// Works best with just one or two sets of landmarks.
const trackingConfig = {
  doAcquireFaceMetrics: true,
  cpuOrGpuString: "GPU", /* "GPU" or "CPU" */
  maxNumFaces: 1, // number of faces to track
};

//------------------------------------------
//loads the mediapipe Facelandmarker and sets up thhe fileset resolver for vision tasks
async function preload() {
  const mediapipe_module = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js');
  FaceLandmarker = mediapipe_module.FaceLandmarker;
  FilesetResolver = mediapipe_module.FilesetResolver;
  
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm"
  );
  
  // Face Landmark Tracking:
  // https://codepen.io/mediapipe-preview/pen/OJBVQJm
  // https://developers.google.com/mediapipe/solutions/vision/face_landmarker
	myFaceLandmarker = await FaceLandmarker.createFromOptions(vision, {
		numFaces: trackingConfig.maxNumFaces,
		runningMode: "VIDEO",
		outputFaceBlendshapes:trackingConfig.doAcquireFaceMetrics,
		baseOptions: {
			delegate: trackingConfig.cpuOrGpuString,
			modelAssetPath:
				"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
		},
	});
}

//------------------------------------------
//function to continously process video frames from the webcam using 'requestAnimationFrame'
async function predictWebcam() {
  let startTimeMs = performance.now();
  if (lastVideoTime !== myCapture.elt.currentTime) {
    if (myFaceLandmarker) {
      faceLandmarks = myFaceLandmarker.detectForVideo(myCapture.elt,startTimeMs);
    }
    lastVideoTime = myCapture.elt.currentTime;
  }
  window.requestAnimationFrame(predictWebcam);
}

//------------------------------------------
///setup function: Initializes the canvas and sets up the webcam capture
function setup() {
  const canvas = createCanvas(800, 600);
  canvas.parent('p5-sketch');  // Attach the canvas to the div with id 'p5-sketch'
  myCapture = createCapture(VIDEO);

  myCapture.size(320, 240);
  myCapture.hide();
  extra = createGraphics(windowWidth, 700);  // Instruction text
  extra.background(0);
  ColourPalette = createGraphics(300, 600); 
 
}
function draw() { 
  background("black");
  //call all functions and extra canvas
  predictWebcam();
  drawVideoBackground();
  drawFacePoints();
  drawFaceMetrics();
  drawDiagnosticInfo(); 
  typography();
  myColor();
  extra.textSize(18);
  extra.textFont("Courier")
  getRandomColor();
}

//The text typing 
function typography() {
 
  push(); // the title
  extra.fill(255);

  if (frameCount < delayFrames && !addedW) { //if frame count is smaller than delayframes add first letter
    letters.push("T"); //push the first letter
    addedW = true; // Indicate that first letter have been added
    nextLetterTime = frameCount + delayBetweenLetters; // time in between letters
  }

  if (frameCount >= nextLetterTime && lettersToAdd.length > 0) {
    letters.push(lettersToAdd.shift()); // Add the next letter from the array
    nextLetterTime = frameCount + delayBetweenLetters; //add next letter after 10 frames
  }

  const spacing = 20;// amount of spacing beteen letters 
  // Display the letters from the array
  for (let i = 0; i < letters.length; i++) {
   extra.text(letters[i], 40 + i * spacing, 60);//display on the extra canvas, add spacing so letters are clear
  }
pop();// the push and pop functions allow me to change the setting for brief parts of the code 
push(); // the title
extra.fill(255);

if (frameCount < delayFrames && !addedW) { //if frame count is smaller than delayframes add first letter
  letters2.push("T"); //push the first letter
  addedW = true; // Indicate that first letter have been added
  nextLetterTime = frameCount + delayBetweenLetters; // time in between letters
}

if (frameCount >= nextLetterTime && lettersToAdd2.length > 0) {
  letters2.push(lettersToAdd2.shift()); // Add the next letter from the array
  nextLetterTime = frameCount + delayBetweenLetters; //add next letter after 10 frames
}

const spacing2 = 20;// amount of spacing beteen letters 
// Display the letters from the array
for (let i = 0; i < letters2.length; i++) {
 extra.text(letters2[i], 40 + i * spacing2, 80);//display on the extra canvas, add spacing so letters are clear
}
pop();// the push and pop functions allow me to change the setting for brief parts of the code 
}

//------------------------------------------
function drawVideoBackground() { //function to draw the webcam video feed as the background 
  push();
  translate(width/2, 0);
  scale(-1, 1);
     // Apply tint if eyebrow is raised
     if (eyebrowRaised) {
      tint(255, 0, 0, 0);; // Reset tint
      if (tryingToNavigate == false)//to make sure the html redirects as the next p5 sketch is drawn
      // window.location.href = "Completed.html";  // Open the next interface
          tryingToNavigate = true;

  } else {
    tint(255, 0, 0, 0);; // Reset tint
  }
  image(myCapture, 0, 0, width, height);
  pop();

}

//------------------------------------------
// Tracks 478 points on the face. 
function drawFacePoints() { //draw the detected face landmarks
  let faceDetected = false;

	if (faceLandmarks && faceLandmarks.faceLandmarks) {
		const nFaces = faceLandmarks.faceLandmarks.length;
	  if (faceLandmarks && faceLandmarks.faceLandmarks) {
      const nFaces = faceLandmarks.faceLandmarks.length;
      if (nFaces > 0) {
        faceDetected = true;
        for (let f = 0; f < nFaces; f++) {
          let aFace = faceLandmarks.faceLandmarks[f];
          if (aFace) {
            let nFaceLandmarks = aFace.length;

					noFill();
					stroke("white");
					strokeWeight(0.5);
					for (let i = 0; i < nFaceLandmarks; i++) {
						let px = aFace[i].x;
						let py = aFace[i].y;
						px = map(px, 0, 1, width, 0);
						py = map(py, 0, 1, 0, height);
						circle(px, py, 1);
					}

					noFill();
					stroke("white");
					strokeWeight(0.5);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_LIPS);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS);
					drawConnectors(aFace, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS);
					drawConnectors(aFace, FACELANDMARKER_NOSE); // Google offers no nose
        }
      }
    }
  }
}

  if (faceDetected) {
    noFaceDetectedStartTime = null; // Reset timer when a face is detected
  } else {
    if (!noFaceDetectedStartTime) {
      noFaceDetectedStartTime = millis(); // Start timer when no face is detected
    } else if (millis() - noFaceDetectedStartTime > NO_FACE_DETECTED_THRESHOLD) {
      if (!tryingToNavigate) {
        console.log("No face detected for more than 30 seconds. Redirecting...");
        window.location.href = "index.html"; // Redirect to the next interface
        tryingToNavigate = true; // Mark navigation as initiated
      }
    }
  }
}

function drawFaceMetrics(){ //draw the calculated face metrics
  if (trackingConfig.doAcquireFaceMetrics){
    if (faceLandmarks && faceLandmarks.faceBlendshapes) {
      const nFaces = faceLandmarks.faceLandmarks.length;
      for (let f = 0; f < nFaces; f++) {
        let aFaceMetrics = faceLandmarks.faceBlendshapes[f];
        if (aFaceMetrics){
          fill('black'); 
          textSize(10.5); 
          let tx = 50; 
          let ty = 40; 
          let dy = 11;
          let vx0 = tx-5; 
          let vx1 = 5;
          
        
          let nMetrics = aFaceMetrics.categories.length; 
          for (let i=1; i<nMetrics; i++){
            let metricName = aFaceMetrics.categories[i].categoryName;
            noStroke();
            text(metricName, tx,ty); 
            
            let metricValue = aFaceMetrics.categories[i].score;
            let vx = map(metricValue,0,1,vx0,vx1);
            stroke(0,0,0); 
            strokeWeight(2.0); 
            line(vx0,ty-2, vx,ty-2); 
            stroke(0,0,0,20);
            line(vx0,ty-2, vx1,ty-2); 
            ty+=dy;
          }

          image(extra, 100, 0);
              // Log the value of 'facepucker' metric

              //talking function, if talking notify to stope 
        
              let mouthLowerDownLeft = aFaceMetrics.categories.find(category => category.categoryName === 'mouthLowerDownLeft');
              let mouthUpperUpRight = aFaceMetrics.categories.find(category => category.categoryName === 'mouthUpperUpRight');
              let browOuterUpLeft = aFaceMetrics.categories.find(category => category.categoryName === 'browOuterUpLeft');
              let browOuterUpRight = aFaceMetrics.categories.find(category => category.categoryName === 'browOuterUpRight');
              let jawOpen = aFaceMetrics.categories.find(category => category.categoryName === 'jawOpen');
              
            
                //if the participant is talking then notified to STOP, this is calculated by the mouthUpperRight and mouthLowerDownLeft
              if ((mouthUpperUpRight && mouthUpperUpRight.score < 0.1) || (mouthLowerDownLeft && mouthLowerDownLeft.score < 0.1)) {
                  extra.color(255,0,0);
                  extra.clear();
              } else {
                  extra.clear();
                  extra.fill(255,0,0);
              }

           
            const lerpAmount = 0.1;
            function clamp(value, min, max) {
              return Math.max(min, Math.min(max, value));
            }
            
            // Function to map a value from one range to another
            function mapValue(value, inMin, inMax, outMin, outMax) {
              return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
            }
            
            // Function to perform linear interpolation
            function lerp(a, b) {
              return a + (b - a);
            }

let fillValue = 0; // Initial fill value
let freezeFill = false; // Example boolean to control fill value update

// Initialize maxScore
let maxScore = 0;

// Check and update maxScore based on browOuterUpLeft
if (browOuterUpLeft) {
  maxScore = Math.max(maxScore, browOuterUpLeft.score);
}

// Check and update maxScore based on browOuterUpRight
if (browOuterUpRight) {
  maxScore = Math.max(maxScore, browOuterUpRight.score);
}

// Clamp the score within the expected range [0.1, 0.9]
maxScore = clamp(maxScore, 0.1, 0.9);

if (!freezeFill && !eyebrowRaised) {
  const targetFillValue = mapValue(maxScore, 0.1, 0.9, 0, 255);
  fillValue = lerp(fillValue, targetFillValue, lerpAmount);
  lastFillValue = fillValue; // Update lastFillValue to the current fillValue
}

// Adjust this value to control smoothing speed
if (jawOpen && jawOpen.score >= 0.4) {
  console.log("eyebrowRaise");
  freezeFill = true; 
  eyebrowRaised = true; // Flag to track if eyebrow is raised
}

// If eyebrow is raised, keep fillValue at the last value before eyebrow raise
if (eyebrowRaised) {
  fillValue = lastFillValue;
}


console.log("Fill Value:", fillValue);
    
  
document.getElementById('blue').value = fillValue;

 fetch("http://172.20.10.4:3000/colour", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ colour: 'B', value: fillValue }),
 })
 .then(response => {
  if (!response.ok) {
     throw new Error('Network response was not ok');
    }
   return response.json();
 })

    }
  }
    }
  }
}

//------------------------------------------
function drawConnectors(landmarks, connectorSet) {//draw lines connecting specific landmark points
  if (landmarks) {
    let nConnectors = connectorSet.length;
    for (let i=0; i<nConnectors; i++){
      let index0 = connectorSet[i].start; 
      let index1 = connectorSet[i].end;
      let x0 = map(landmarks[index0].x, 0,1, width,0);
      let y0 = map(landmarks[index0].y, 0,1, 0,height);
      let x1 = map(landmarks[index1].x, 0,1, width,0);
      let y1 = map(landmarks[index1].y, 0,1, 0,height);
      line(x0,y0, x1,y1); 
    }
  }
}

//------------------------------------------
function drawDiagnosticInfo() { //draw diagnostic information life frames per second 
  noStroke();
  fill("black");
  textSize(12); 
  text("FPS: " + int(frameRate()), 50, 27);
}

 function myColor(){
  fetch("http://172.20.10.4:3000/colour")
    .then(res => res.json())
    .then(res => {
      let objR = res.find(o => o.colour === 'R');
      let objG = res.find(o => o.colour === 'G');

       if (objR !== undefined) {
        document.getElementById('red').value = objR.value; // Assuming objB.value is the correct value
        console.log('hello', objR);
       }

   if (objG !== undefined) {
       document.getElementById('green').value = objG.value; // Assuming objG.value is the correct value
       console.log(objG);
       }

      var red = document.getElementById('red').value;
      var green = document.getElementById('green').value;
      var blue = document.getElementById('blue').value;
      var color = 'rgb(' + red + ',' + green + ',' + blue + ')';
      // document.body.style.backgroundColor = color; 
      document.getElementById('box').value = color;
      document.getElementById('colorSquare').style.backgroundColor = color;
    }
  )}

    document.getElementById('red').addEventListener('input', myColor);
    document.getElementById('green').addEventListener('input', myColor);
    document.getElementById('blue').addEventListener('input', myColor);

    setInterval(myColor, 50);

    function getRandomColor() {
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    }


    
    window.onload = function() {
      document.body.style.backgroundColor = getRandomColor();
    };

// Attach setRandomColor function to window.onload event
