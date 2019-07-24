function createPalette(size, buffer) {

  //Create a frequency list of all colors in the buffer
  var colors = [];

  // For every pixel
  for (var i = 0; i < buffer.length; i += 4) {

    // Get the rgb values of the current pixel
    var r = buffer[i+0];
    var g = buffer[i+1];
    var b = buffer[i+2];

    // Compare against the already catalogued colors list
    var found = false;
    for (var j = 0; j < colors.length; j++) {

      // If color is already noted, add to its frequency count
      if (colors[j].r == r && colors[j].g == g && colors[j].b == b) {
        colors[j].frequency++;
        found = true;
        break;
      }  
    }

    // If color not found in the loop, this is a new color, add it
    if (!found)
      colors.push({r:r, g:g, b:b, frequency:0});

  }

  // Sory by frequency
  colors.sort( function(a, b) {return b.frequency - a.frequency;});

  // Get ready to form the palette
  var palette = [];

  // If the number of colors is <= the palette size, just add all the colors
  if (colors.length < size) {
    for (var i = 0; i < colors.length; i++)
      palette.push(colors[i]);
  }
  else {
    // How far to step in between in colors to get the widest possible range of the frequencies
    var step = Math.floor(colors.length / size);

    // Add the colors to the palette
    for (var i = 0, color = 0; i < size; i++, color += step) {
      palette.push(colors[color]);
    }
  }

  // Check for blue 0 0 255 (Half-Life's transparency color) and put it in position 255
  var blueIndex = -1;
  for (var i = 0; i < palette.length; i++) {
    if (palette[i].r == 0 && palette[i].g == 0 && palette[i].b == 255) {
      blueIndex = i;
      break;
    }
  }

  // If blue was found
  if (blueIndex != -1) {
    
    // Is the palette is not full, just push blue in the back (after some padding).
    if (palette.length < 256) {

      // If the palette is not the full 256 length, fill it out. Blue must be in position 255.
      for (var i = palette.length - 1; i < 255; i++)
        palette.push({r:0, g:0, b:255});
    }
    // If the palette is full
    else {
      // Swap color at index 255 with blue
      var swapColor = palette[255];
      palette[255] = palette[blueIndex];
      palette[blueIndex] = swapColor;
    }
  }

  return palette;
}


function pixelsToPalette(buffer, palette) {
  var newBuffer = [];
  // For every pixel
  for (var bufIndex = 0; bufIndex < buffer.length; bufIndex+=4) {
    
    // Collect current pixel
    var r = buffer[bufIndex + 0];
    var g = buffer[bufIndex + 1];
    var b = buffer[bufIndex + 2];

    // Find the closest color within the palette
    var closest = 16777216; // Start with max possible cubed distance
    var closestIndex = -1;
    for (var i = 0; i < palette.length; i++) {
      // Get the current color      
      var color = palette[i];

      // Calculate the distance between the image pixel's color and the current entry in the palette
      var dist = (r - color.r)*(r - color.r) + (g - color.g)*(g - color.g) + (b - color.b)*(b - color.b);

      // If this is the closest distance yet, save it
      if (dist < closest) {
        closest = dist;
        closestIndex = i;
      }
    }

    // Store closest color
    newBuffer.push(closestIndex);  
  }

  return newBuffer;
}



function generateMipTexture(buffer, imgWidth) {
  var mipBuffer = [];

  var width = imgWidth * 4; // The buffer is made of RGBA qaudruplets, so the true buffer width is 4 times the image width

  // For every other pixel in the buffer
  for (var i = 0; i < buffer.length-width; i+=8) {

    // Only visit every other row
    if (i % (width) == 0 && i != 0)
      i += width;

    // Average the surrounding colors (2 right and 2 down)
    var r = Math.round((buffer[i+0] + buffer[i+4+0] + buffer[i+width+0] + buffer[i+4+width+0]) / 4);
    var g = Math.round((buffer[i+1] + buffer[i+4+1] + buffer[i+width+1] + buffer[i+4+width+1]) / 4);
    var b = Math.round((buffer[i+2] + buffer[i+4+2] + buffer[i+width+2] + buffer[i+4+width+2]) / 4);

    // Add new RGBA quadruplet to MIP buffer
    mipBuffer.push(r);
    mipBuffer.push(g);
    mipBuffer.push(b);
    mipBuffer.push(255);    
  }
  return mipBuffer;
}



self.onmessage = function(event) {
    self.postMessage({type: "status", msg: "Beginning"});

    // Get the incoming pixel buffer
    var rgbBuffer = event.data.buffer;

    // Create the palette
    self.postMessage({type: "status", msg: "Creating palette"});
    var palette = createPalette(256, rgbBuffer);

    // Create the MIP Textures
    self.postMessage({type: "status", msg: "Generating MIP Textures"});
    var mipLevel1 = generateMipTexture(rgbBuffer, event.data.width);
    var mipLevel2 = generateMipTexture(mipLevel1, event.data.width/2);
    var mipLevel3 = generateMipTexture(mipLevel2, event.data.width/4);

    // Convert the pixel buffer to palette-reference form
    self.postMessage({type: "status", msg: "Palettizing image"});
    var refBuffer = pixelsToPalette(rgbBuffer, palette);

    // Convert the MIP Textures to palette-reference form
    self.postMessage({type: "status", msg: "Palettizing MIP Textures"});
    mipLevel1 = pixelsToPalette(mipLevel1, palette);
    mipLevel2 = pixelsToPalette(mipLevel2, palette);
    mipLevel3 = pixelsToPalette(mipLevel3, palette);

    // Create the Texture object
    var texture = {};
    texture.palette = palette;
    texture.height = event.data.height;
    texture.width = event.data.width;
    texture.mipLevel = new Array(4);
    texture.mipLevel[0] = refBuffer;
    texture.mipLevel[1] = mipLevel1;
    texture.mipLevel[2] = mipLevel2;
    texture.mipLevel[3] = mipLevel3;

    // Make sure the filename/texturename isnt too long
    var name = event.data.name;
    if (name.length > 11)
      texture.name = name.slice(0, 12);
    else
      texture.name = name; 

    self.postMessage({type: "status", msg: "Complete"});
    self.postMessage({type:"data", texture:texture});
}
