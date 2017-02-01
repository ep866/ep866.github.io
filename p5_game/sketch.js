var x, y;
var xVal = 0,
    yVal = 0,
    score = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(200);

  x = mouseX;
  y = mouseY;

  strokeWeight(0);
  fill(55);
  textStyle(NORMAL);
  text("mouseX", 10, 20);
  text("mouseY", 10, 80);

  fill(244, 66, 66);
  rect(20, 40, xVal, 20);
  rect(20, 100, yVal, 20);

  strokeWeight(0);
  text(xVal + " moves", xVal + 30, 55);
  text(yVal + " moves", yVal + 30, 115);

  // flash a different color when you score points
  if(xVal == yVal && xVal != 0) {
    background(66, 244, 229);
    text( "You scored!", windowWidth/2, windowHeight/2 );
  }

  fill(55);
  textStyle(BOLD);
  text("Score " + score, 10, 145);
  text("Equalize the number of x and y moves and score! ", 10, 165);

}

function mouseMoved() {

  if(mouseX != x) {
    console.log("moved x");
    xVal += 1;
  } else if(mouseY != y) {
    console.log("moved y");
    yVal += 1;
  }

  if(xVal == yVal && xVal != 0) {
    score += 1;
  }

  // restart at end of window
  if(xVal == windowWidth) {
    xVal = 0;
    yVal = 0;
    score = 0;
  }

}


// draw lines from top left corner to mouse x and y position

// function setup() {
//   createCanvas(windowWidth, windowHeight);

//   strokeWeight(2);
//   stroke(55,10,20);
// }

// function draw() {
//   background(255);

//   x = mouseX;
//   y = mouseY;

//   line(0,0,x,y);
// }
