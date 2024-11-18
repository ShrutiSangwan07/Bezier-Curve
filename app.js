// Bullet settings
const BULLET_ACCELERATION = 1.05; // Higher number increases rate bullet accelerates over time. 1.0 causes bullets to travel at a constant speed. Higher number increases rate bullet accelerates over time.
const BULLET_BRIGHTNESS_MIN = 50; // Minimum bullet brightness.
const BULLET_BRIGHTNESS_MAX = 70; // Maximum bullet brightness.
const BULLET_SPEED = 1; // Base speed of bullets.
const BULLET_TRAIL_LENGTH = 3; // Base length of bullet trails.
const BULLET_TARGET_INDICATOR_ENABLED = true; // Determine if target position indicator is enabled.

// Impact settings
const IMPACT_BRIGHTNESS_MIN = 50; // Minimum impact brightness.
const IMPACT_BRIGHTNESS_MAX = 80; // Maximum impact brightness.
const IMPACT_COUNT = 20; // Base impact count per bullet.
const IMPACT_DECAY_MIN = 0.1; // Minimum impact decay rate.
const IMPACT_DECAY_MAX = 0.5; // Maximum impact decay rate.
const IMPACT_FRICTION = 0.95; // Slows the speed of impacts over time.
const IMPACT_GRAVITY = 0.7; // How quickly impacts move toward a downward trajectory.
const IMPACT_HUE_VARIANCE = 20; // Variance in impact coloration.
const IMPACT_TRANSPARENCY = 1; // Base impact transparency.
const IMPACT_SPEED_MIN = 1; // Minimum impact speed.
const IMPACT_SPEED_MAX = 10; // Maximum impact speed.
const IMPACT_TRAIL_LENGTH = 3; // Base length of explosion impact trails.

const CANVAS_CLEANUP_ALPHA = 0.01; // Alpha level that canvas cleanup iteration removes existing trails. Lower value increases trail duration.
const HUE_STEP_INCREASE = 0.5; // Hue change per loop, used to rotate through different bullet colors.

const TICKS_PER_BULLET_MIN = 5; // Minimum number of ticks per manual bullet launch.
const TICKS_PER_BULLET_AUTOMATED_MIN = 20; // Minimum number of ticks between each automatic bullet launch.
const TICKS_PER_BULLET_AUTOMATED_MAX = 50; // Maximum number of ticks between each automatic bullet launch.

// === END CONFIGURATION ===

// === LOCAL VARS ===

let canvas = document.getElementById('canvas');
// Set canvas dimensions.
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;
// Set the context, 2d in this case.
let context = canvas.getContext('2d');
// Bullet and impacts collections.
let bullets = [], impacts = [];
// Mouse coordinates.
let mouseX, mouseY;
// Variable to check if mouse is down.
let isMouseDown = false;
// Initial hue.
let hue = 120;
// Track number of ticks since automated bullet.
let ticksSinceBulletAutomated = 0;
// Track number of ticks since manual bullet.
let ticksSinceBullet = 0;

// Function to resize canvas
function resizeCanvas() {
	canvas.width = canvas.parentElement.clientWidth;
	canvas.height = canvas.parentElement.clientHeight;
}

// Add event listener for window resize
window.addEventListener('resize', resizeCanvas);

// === END LOCAL VARS ===

// === HELPERS ===

// Use requestAnimationFrame to maintain smooth animation loops.
// Fall back on setTimeout() if browser support isn't available.
window.requestAnimFrame = (() => {
	return 	window.requestAnimationFrame ||
		   	window.webkitRequestAnimationFrame ||
		   	window.mozRequestAnimationFrame ||
		   	function(callback) {
		   		window.setTimeout(callback, 1000 / 60);
			};
})();

// Get a random number within the specified range.
function random(min, max) {
	return Math.random() * (max - min) + min;
}

// Calculate the distance between two points.
function calculateDistance(aX, aY, bX, bY) {
	let xDistance = aX - bX;
	let yDistance = aY - bY;
	return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// Array to store generated points
const startingPoints = [];

// Function to get a random starting point along the edge of the screen
function getRandomStartingPoint() {
	// If the array has 10 values, use the values from the array
	if (startingPoints.length >= 10) {
		return startingPoints[Math.floor(Math.random() * startingPoints.length)];
	}

	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;
	const edge = Math.floor(Math.random() * 4); // Random number between 0 and 3
	let x, y;

	switch (edge) {
		case 0: // Top edge
			x = Math.random() * canvasWidth;
			y = 0;
			break;
		case 1: // Bottom edge
			do {
				x = Math.random() * canvasWidth;
			} while (x > canvasWidth * 0.4 && x < canvasWidth * 0.6); // Exclude center bottom 20%
			y = canvasHeight;
			break;
		case 2: // Left edge
			x = 0;
			y = Math.random() * canvasHeight;
			break;
		case 3: // Right edge
			x = canvasWidth;
			y = Math.random() * canvasHeight;
			break;
	}

	const point = { x, y };
	startingPoints.push(point); // Add the generated point to the array

	return point;
}

// === END HELPERS ===

// === EVENT LISTENERS ===

// Track current mouse position within canvas.
canvas.addEventListener('mousemove', (e) => {
	mouseX = e.pageX - canvas.offsetLeft
	mouseY = e.pageY - canvas.offsetTop
});

// Track when mouse is pressed.
canvas.addEventListener('mousedown', (e) => {
	e.preventDefault()
	isMouseDown = true
});

// Track when mouse is released.
canvas.addEventListener('mouseup', (e) => {
	e.preventDefault()
	isMouseDown = false
});

// === END EVENT LISTENERS ===

// === PROTOTYPING ===

// Creates a new bullet.
// Path begins at 'start' point and ends at 'end' point.
function Bullet(startX, startY, endX, endY) {
    // Set current coordinates.
    this.x = startX;
    this.y = startY;
    // Set starting coordinates.
    this.startX = startX;
    this.startY = startY;
    // Set end coordinates.
    this.endX = endX;
    this.endY = endY;
    // Get the distance to the end point.
    this.distanceToEnd = calculateDistance(startX, startY, endX, endY);
    this.distanceTraveled = 0;
    // Create an array to track current trail impacts.
    this.trail = [];
    // Trail length determines how many trailing impacts are active at once.
    this.trailLength = BULLET_TRAIL_LENGTH;
    // While the trail length remains, add current point to trail list.
    while (this.trailLength--) {
        this.trail.push([this.x, this.y]);
    }
    // Calculate the angle to travel from start to end point.
    this.angle = Math.atan2(endY - startY, endX - startX);
    // Set the speed.
    this.speed = BULLET_SPEED;
    // Set the acceleration.
    this.acceleration = BULLET_ACCELERATION;
    // Set the brightness.
    this.brightness = random(BULLET_BRIGHTNESS_MIN, BULLET_BRIGHTNESS_MAX);
}

// Update a bullet prototype.
// 'index' parameter is index in 'bullets' array to remove, if journey is complete.
Bullet.prototype.update = function (index) {
    // Remove the oldest trail impact.
    this.trail.pop();
    // Add the current position to the start of trail.
    this.trail.unshift([this.x, this.y]);

    // Animate the target radius indicator.
    if (BULLET_TARGET_INDICATOR_ENABLED) {
        if (this.targetRadius < 8) {
            this.targetRadius += 0.3;
        } else {
            this.targetRadius = 1;
        }
    }

    // Increase speed based on acceleration rate.
    this.speed *= this.acceleration;

  // Increment distance traveled
  this.distanceTraveled += this.speed;

   // Calculate Bezier curve points
   const t = Math.min(this.distanceTraveled / this.distanceToEnd, 1); // Ensure t does not exceed 1

    
    // Control points for the Bezier curve
    const controlPointX = (this.startX + this.endX) / 2; // Midpoint for horizontal control
    const controlPointY = Math.min(this.startY, this.endY) - (50 + (this.distanceTraveled * 0.1)); // Dynamic control point height

    // Calculate the new bullet position using Bezier curve formula
    this.x = Math.pow(1 - t, 2) * this.startX + 
              2 * (1 - t) * t * controlPointX + 
              Math.pow(t, 2) * this.endX;
    this.y = Math.pow(1 - t, 2) * this.startY + 
              2 * (1 - t) * t * controlPointY + 
              Math.pow(t, 2) * this.endY;

                  // Apply gravity effect
    this.y += 0.5; 

    // Check if final position has been reached (or exceeded).
   
    if (this.distanceTraveled >= this.distanceToEnd) {
           // Snap to the end position to avoid gaps
           this.x = this.endX;
           this.y = this.endY;
   
        // Destroy bullet by removing it from collection.
        bullets.splice(index, 1);
        // Create impact explosion at end point.
        createImpacts(this.endX, this.endY);
    }
}

// Draw a bullet.
// Use CanvasRenderingContext2D methods to create strokes as bullet paths. 
Bullet.prototype.draw = function () {
    // Begin a new path for bullet trail.
    context.beginPath();
    // Get the coordinates for the oldest trail position.    
    let trailEndX = this.trail[this.trail.length - 1][0];
    let trailEndY = this.trail[this.trail.length - 1][1];
    // Create a trail stroke from trail end position to current bullet position.
    context.moveTo(trailEndX, trailEndY);
    context.lineTo(this.x, this.y);
    // Set stroke coloration and style.
    context.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
    // Draw stroke.
    context.stroke();

    if (BULLET_TARGET_INDICATOR_ENABLED) {
        // Begin a new path for end position animation.
        context.beginPath();
        // Create a pulsing circle at the end point with targetRadius.
        context.arc(this.endX, this.endY, this.targetRadius, 0, Math.PI * 2);
        // Draw stroke.
        context.stroke();
    }
}

// Creates a new impact at provided 'x' and 'y' coordinates.
function Impact(x, y) {
	// Set current position.
	this.x = x;
	this.y = y;
	// To better simulate a bullet, set the angle of travel to random value in any direction.
	this.angle = random(0, Math.PI * 2);
	// Set friction.
	this.friction = IMPACT_FRICTION;
	// Set gravity.
	this.gravity = IMPACT_GRAVITY;
	// Set the hue to somewhat randomized number.
	// This gives the impacts within a bullet explosion an appealing variance.
	this.hue = random(hue - IMPACT_HUE_VARIANCE, hue + IMPACT_HUE_VARIANCE);
	// Set brightness.
	this.brightness = random(IMPACT_BRIGHTNESS_MIN, IMPACT_BRIGHTNESS_MAX);
	// Set decay.
	this.decay = random(IMPACT_DECAY_MIN, IMPACT_DECAY_MAX);	
	// Set speed.
	this.speed = random(IMPACT_SPEED_MIN, IMPACT_SPEED_MAX);
	// Create an array to track current trail impacts.
	this.trail = [];
	// Trail length determines how many trailing impacts are active at once.
	this.trailLength = IMPACT_TRAIL_LENGTH;
	// While the trail length remains, add current point to trail list.
	while(this.trailLength--) {
		this.trail.push([this.x, this.y]);
	}
	// Set transparency.
	this.transparency = IMPACT_TRANSPARENCY;
}

// Update a impact prototype.
// 'index' parameter is index in 'impacts' array to remove, if journey is complete.
Impact.prototype.update = function(index) {
	// Remove the oldest trail impact.
	this.trail.pop();
	// Add the current position to the start of trail.
	this.trail.unshift([this.x, this.y]);

	// Decrease speed based on friction rate.
	this.speed *= this.friction;
	// Calculate current position based on angle, speed, and gravity (for y-axis only).
	this.x += Math.cos(this.angle) * this.speed;
	this.y += Math.sin(this.angle) * this.speed + this.gravity;

	// Apply transparency based on decay.
	this.transparency -= this.decay;
	// Use decay rate to determine if impact should be destroyed.
	if(this.transparency <= this.decay) {
		// Destroy impact once transparency level is below decay.
		impacts.splice(index, 1);
	}
}

// Draw a impact.
// Use CanvasRenderingContext2D methods to create strokes as impact paths. 
Impact.prototype.draw = function() {
	// Begin a new path for impact trail.
	context.beginPath();
	// Get the coordinates for the oldest trail position.	
	let trailEndX = this.trail[this.trail.length - 1][0];
	let trailEndY = this.trail[this.trail.length - 1][1];
	// Create a trail stroke from trail end position to current impact position.
	context.moveTo(trailEndX, trailEndY);
	context.lineTo(this.x, this.y);
	// Set stroke coloration and style.
	// Use hue, brightness, and transparency instead of RGBA.
	context.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.transparency})`;
	context.stroke();
}

// === END PROTOTYPING ===

// === APP HELPERS ===

// Cleans up the canvas by removing older trails.
//
// In order to smoothly transition trails off the canvas, and to make them 
// appear more realistic, we're using a composite fill.
// Set the initial composite mode to 'destination-out' to keep content that
// overlap with the fill we're adding.
//
// see: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
function cleanCanvas() {
	// Set 'destination-out' composite mode, so additional fill doesn't remove non-overlapping content.
	context.globalCompositeOperation = 'destination-out';
	// Set alpha level of content to remove.
	// Lower value means trails remain on screen longer.
	context.fillStyle = `rgba(0, 0, 0, ${CANVAS_CLEANUP_ALPHA})`;
	// Fill entire canvas.
	context.fillRect(0, 0, canvas.width, canvas.height);
	// Reset composite mode to 'lighter', so overlapping impacts brighten each other.
	context.globalCompositeOperation = 'lighter';
}

// Create impact explosion at 'x' and 'y' coordinates.
function createImpacts(x, y) {
	// Set impact count.
	// Higher numbers may reduce performance.
	let impactCount = IMPACT_COUNT;
	while(impactCount--) {
		// Create a new impact and add it to impacts collection.
		impacts.push(new Impact(x, y));
	}
}

// Launch bullets automatically.
function launchAutomatedBullet() {
	// Determine if ticks since last automated launch is greater than random min/max values.
	if(ticksSinceBulletAutomated >= random(TICKS_PER_BULLET_AUTOMATED_MIN, TICKS_PER_BULLET_AUTOMATED_MAX)) {
		// Check if mouse is not currently clicked.
		if(!isMouseDown) {
			// Get random starting point
			const startingPoint = getRandomStartingPoint();
			let startX = startingPoint.x;
			let startY = startingPoint.y;

			// Set end position to random position, somewhere in the top half of screen.
			let endX = random(0, canvas.width);
			let endY = random(0, canvas.height / 2);
			// Create new bullet and add to collection.
			bullets.push(new Bullet(startX, startY, endX, endY));
			// Reset tick counter.
			ticksSinceBulletAutomated = 0;
		}
	} else {
		// Increment counter.
		ticksSinceBulletAutomated++;
	}
}

// Launch bullets manually, if mouse is pressed.
function launchManualBullet() {
	// Check if ticks since last bullet launch is less than minimum value.
	if(ticksSinceBullet >= TICKS_PER_BULLET_MIN) {
		// Check if mouse is down.
		if(isMouseDown) {
			// Set start position to bottom center.
			let startX = canvas.width / 2;
			let startY = canvas.height;
			// Set end position to current mouse position.
			let endX = mouseX;
			let endY = mouseY;
			// Create new bullet and add to collection.
			bullets.push(new Bullet(startX, startY, endX, endY));
			// Reset tick counter.
			ticksSinceBullet = 0;
		}
	} else {
		// Increment counter.
		ticksSinceBullet++;
	}
}

// Update all active bullets.
function updateBullets() {
	// Loop backwards through all bullets, drawing and updating each.
	for (let i = bullets.length - 1; i >= 0; --i) {
		bullets[i].draw();
		bullets[i].update(i);
	}
}

// Update all active impacts.
function updateImpacts() {
	// Loop backwards through all impacts, drawing and updating each.
	for (let i = impacts.length - 1; i >= 0; --i) {
		impacts[i].draw();
		impacts[i].update(i);
	}
}

// === END APP HELPERS ===

// Primary loop.
function loop() {
	// Smoothly request animation frame for each loop iteration.
	requestAnimFrame(loop);

	// Adjusts coloration of bullets over time.
	hue += HUE_STEP_INCREASE;

	// Clean the canvas.
	cleanCanvas();

	// Update bullets.
	updateBullets();

	// Update impacts.
	updateImpacts();
	
	// Launch automated bullets.
	launchAutomatedBullet();
	
	// Launch manual bullets.
	launchManualBullet();
}

// Initiate loop after window loads.
window.onload = loop;