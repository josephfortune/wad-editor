/* If you are looking here then I assume you have some interest in understanding how to
 * manipulate the WAD3 format. If you are creating a free application for the benefit
 * of the community then feel free to sift through and copy any code that you like. 
 * If you have any questions, contact me at 
 * joe((at))fortunatelyjoe.com <---- See how I fooled the bots there!
 *
 * Good luck in your programming endeavors!
 *
 * -Joe */



"use strict";

var textures = []; // A global array containing all the texture objects
var file_name = "" // store the name of the currently open WAD file


/********************************************************
 * upload
 *
 * Handles the file upload button
 ********************************************************/
function upload() {
  // Clear any previous loaded textures   
  textures = [];

  // Clear any previous loaded textures from document texture list
  var select = document.getElementById("texture_list");
  for(var i = select.options.length - 1 ; i >= 0 ; i--)
    select.remove(i);

  // Get the file
  var file = document.getElementById("upload").files[0];
  file_name = file.name
  // Create a FileReader to read file
  var reader = new FileReader();
  
  // Set up callback function so when the FilReader is finished, it passes the ArrayBuffer
  // to the parseWad function
  reader.onload = function() {
    parseWad(reader.result);  
  }

  // Start converting file to ArrayBuffer
  reader.readAsArrayBuffer(file);

}



/********************************************************
 * onSelectTexture
 *
 * Event handler for when a texture is selected from the
 * texture list. 
 ********************************************************/
function onSelectTexture() {
  var index = document.getElementById("texture_list").selectedIndex;
  displayTexture(textures[index]);
  
  // Update rename box with current texture name
  document.getElementById("rename").value = textures[index].name;
}



/********************************************************
 * parseWad
 *
 * Takes an ArrayBuffer of a WAD file and parses it.
 ********************************************************/
function parseWad(buffer) {

  // Create DataView to view the buffer by types
  var dv = new DataView(buffer);
  
  // Is this a valid WAD3 file?
  if (!isValidWad(dv)) {
    alert("File is not a valid WAD3 file.");
    return;
  }

  // Get the WAD header
  var header = getWadHeader(dv);

  // Get the WAD Directory Entries (List of texture file details)
  var entries = getWadEntries(dv, header.dirOffset, header.nEntries); // Global

  // Create the texture objects
  for (var i = 0; i < entries.length; i++) {
    textures[i] = retrieveTexture(dv, entries[i]);
  }

  // Populate texture list
  for (var i = 0; i < entries.length; i++) {
    var option = document.createElement("OPTION");
	  option.text = entries[i].name;
	  option.value = entries[i].name;
    document.getElementById("texture_list").options.add(option);
  }

  // Display first texture as default
  var texture = retrieveTexture(dv, entries[0]);
  document.getElementById("texture_list").selectedIndex = 0
  displayTexture(texture);
}



/********************************************************
 * getWadHeader
 *
 * Takes a DataView object of the WAD file and parses the
 * WAD header into an object.
 *
 *Header Specification (12 bytes)
 *  4   Magic Number  "WAD3"
 *  4   nDir          (The number of directory entries)
 *  4   nDirOffset    Offset into file where entries start
 ********************************************************/
function getWadHeader(dv) {
  var header = {};
  
  // Get the number of entries
  header.nEntries = dv.getUint32(4, true);

  // Get directory offset (directory contains all the file entries)
  header.dirOffset = dv.getUint32(8, true);  

  return header;
}



/********************************************************
 * isWadValid
 *
 * Takes a DataView object of the WAD file and checks for
 * the magic string "WAD3". Returns true if valid, false
 * if not.
 ********************************************************/
function isValidWad(dv) {
  // Read magic string and make sure this is a valid WAD3 File
  if (dv.getUint8(0) != 0x57 || dv.getUint8(1) != 0x41 || dv.getUint8(2) != 0x44 || dv.getUint8(3) != 0x33) // "WAD3"
    return false;

  return true;
}



/********************************************************
 * getWadEntries
 *
 * Takes a DataView object of the WAD file and parses the
 * collection of WAD entries into an array of objects.
 *
 * Directory Entry Specification (32 bytes)
 *  4   nFilePos      Absolute offset to file's location
 *  4   nDiskSize     Size of the file
 *  4   nSize         Uncompressed size
 *  1   nType         Type of entry
 *  1   bCompression  0 if not compressed
 *  2   nDUmmy        Unused
 *  16  szName        Name of file (null terminated)  
 ********************************************************/
function getWadEntries(dv, dirOffset, nEntries) {
  var entrySize = 32;
  var entries = [];

  for (var i = 0; i < nEntries; i++) {

    // Object to hold entry
    var currEntry = {};

    // Offset to start of current entry
    var entryPos = dirOffset + i * entrySize;

    // Offset property
    currEntry.offset = dv.getUint32(entryPos, true);

    // Size property
    currEntry.size = dv.getUint32(entryPos + 4, true);

    // Uncompressed Size property
    currEntry.uSize = dv.getUint32(entryPos + 8, true);

    // Type property
    currEntry.type = dv.getUint8(entryPos + 12);

    // Compressed State property
    currEntry.isCompressed = dv.getUint8(entryPos + 13);

    // Name String property
    currEntry.name = dataViewToString(dv, entryPos + 16, 16);

    // Add entry to entries array
    entries.push(currEntry);

  }
  
  return entries;
}



/********************************************************
 * dataViewToString
 *
 * Takes a DataView object of the WAD file, a starting
 * offset, and a maximum length and converts that portion
 * of the dataView to a string.
 ********************************************************/
function dataViewToString(dv, start, len) {
  var str = "";
    for (var i = 0; i < len; i++) {
      // Get the ASCII code
      var charCode = dv.getUint8(start + i);

      // End loop if NULL-terminator
      if (charCode == 0) break;

      // Add character to name string
      str += String.fromCharCode(charCode);
    }
  return str;
}



/********************************************************
 * retrieveTexture
 *
 * Takes a DataView object of the WAD file, and the 
 * the texture's directory entry object and creates
 * a texture object.
 *
 * Texture File Specification (file header is 40 bytes)
 *  16  szName    Name of texture file (null terminated)
 *  4   nWidth    Width of texture in pixels
 *  4   nHeight   Height of texture in pixels
 *  4   offset0   relative Offset to level 0 MIP texture
 *  4   offset1   relative Offset to level 1 MIP texture
 *  4   offset2   relative Offset to level 2 MIP texture
 *  4   offset3   relative offset to level 3 MIP texture
 *---OFFSETS ARE RELATIVE TO BEGINNING OF FILE HEADER)---
 *  VAR tex0      MIP texture level 0
 *  VAR tex1      MIP texture level 1
 *  VAR tex2      MIP texture level 2
 *  VAR tex3      MIP texture level 3
 *  2   nColors   Number of colors in palette (Max 256)
 *  768 palette   Color table, 256 triplets of (R, G, B)
 *  2   padding
 ********************************************************/
function retrieveTexture(dv, dirEntry) {
  var texture = {};
  var offset = dirEntry.offset; // Offset of actual texture within file

  // Name
  texture.name = dataViewToString(dv, offset, 16);

  // Width/Height
  texture.width = dv.getUint32(offset + 16, true);
  texture.height = dv.getUint32(offset + 20, true);

  // MIP Texture Offsets by level
  var mipOffset = [];
  mipOffset[0] = dv.getUint32(offset + 24, true);
  mipOffset[1] = dv.getUint32(offset + 28, true);
  mipOffset[2] = dv.getUint32(offset + 32, true);
  mipOffset[3] = dv.getUint32(offset + 36, true);
  
  // Read in MIP Textures by level
  texture.mipLevel = [];
  for (var level = 0; level < 4; level++) {
    texture.mipLevel[level] = [];

    // Read the pixels (Note, these are not RGB values, they are references to the palette)
    // The texture dimensions are divided by a power of 4 for each additional MIP level /4 /16 /64
    var nPixels = (texture.width * texture.height) / Math.pow(4, level);
    for (var i = 0; i < nPixels; i++) {
      texture.mipLevel[level][i] = dv.getUint8(offset + mipOffset[level] + i, true);
    }
  }

  // Read in palette
  texture.palette = [];

  // Palette is at the end of the file. We find the palette by starting at the file offset, fast-forward 
  // to end of file, then back off by the size of the palette 768 (256 * 3)
  var paletteOffset = offset + dirEntry.size - 768 - 2;
  for (var i = 0; i < 768; i += 3) {
    var r = dv.getUint8(paletteOffset + i, true);
    var g = dv.getUint8(paletteOffset + i + 1, true);
    var b = dv.getUint8(paletteOffset + i + 2, true);

    // Add the RGB object to the palette array
    texture.palette.push({r:r, g:g, b:b});
  }
  return texture;
}



/********************************************************
 * displayTexture
 *
 * Takes a texture object and displays it on the
 * "viewport" canvas
 ********************************************************/
function displayTexture(texture) {

  // Get canvas context  
  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");

  // Resize canvas to image
  canvas.height = texture.height;
  canvas.width = texture.width;
  
  // Get access to the canvas pixel buffer
  var imgData = ctx.createImageData(texture.width, texture.height);
  
  // Clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw pixels to pixel buffer
  var nPixels = texture.width * texture.height;
  var imgDataIndex = 0;
  for (var i = 0; i < nPixels; i++) {
    var palIndex = texture.mipLevel[0][i];
    imgData.data[imgDataIndex + 0] = texture.palette[palIndex].r; // Red
    imgData.data[imgDataIndex + 1] = texture.palette[palIndex].g; // Green
    imgData.data[imgDataIndex + 2] = texture.palette[palIndex].b; // Blue
    imgData.data[imgDataIndex + 3] = 255;                         // Alpha
    imgDataIndex += 4;  
  }

  // Send pixel buffer back to canvas
  ctx.putImageData(imgData, 0, 0);
}



/********************************************************
 * buildWad()
 *
 * Builds a binary WAD file using textures stored in the
 * global "textures" array variable and then initiates
 * the download.
 ********************************************************/
function buildWad() {
  // Keep track of file offsets for later when we build directory entries
  var fileOffsets = [];

  // Keep track of the individual file lengths for later when we build directory entries
  var fileSizes = [];

  // Header size
  var headerSize = 12;
  
  // Calculate the size of the directory entries section
  var entriesSize = textures.length * 32;

  // Calculate size of the file/data section
  var fileSectionSize = 0;
  for (var i = 0; i < textures.length; i++) {
    var nPixels = textures[i].width * textures[i].height;
    fileSectionSize += 40 + nPixels + nPixels/4 + nPixels/16 + nPixels/64 + 2 + 768 + 2;
  }

  // Create a buffer to hold our file
  var buffer = new ArrayBuffer(headerSize + entriesSize + fileSectionSize);

  // Create a dataview so we can populate the buffer with specific data types
  var dv =  new DataView(buffer);

  // File position
  var pos = 0;
  
  // Build header
  pos = putByte(dv, pos, 0x57); // W
  pos = putByte(dv, pos, 0x41); // A
  pos = putByte(dv, pos, 0x44); // D
  pos = putByte(dv, pos, 0x33); // 3
  pos = put32(dv, pos, textures.length);              // nDirs
  pos = put32(dv, pos, headerSize + fileSectionSize); // nDirOffset (entries start after file/data section)


  // Build File/Data section
  for (var i = 0; i < textures.length; i++) {
    fileOffsets.push(pos); // Note the current file position (used in directory entry later)

    pos = putStr16(dv, pos, textures[i].name); // Name string
    pos = put32(dv, pos, textures[i].width);   // Width
    pos = put32(dv, pos, textures[i].height);  // Height

    // Calculate MIP texture offsets
    var nPixels = textures[i].height * textures[i].width;
    var mipOffset0 = 40;
    var mipOffset1 = mipOffset0 + nPixels;
    var mipOffset2 = mipOffset1 + nPixels/4;
    var mipOffset3 = mipOffset2 + nPixels/16;

    // Write the MIP offsets
    pos = put32(dv, pos, mipOffset0);   // MIP Level 0 offset
    pos = put32(dv, pos, mipOffset1);   // MIP Level 1 offset
    pos = put32(dv, pos, mipOffset2);   // MIP Level 2 offset
    pos = put32(dv, pos, mipOffset3);   // MIP Level 3 offset

    // Write the MIP texture data by level
    for (var level = 0; level < 4; level++) {
      
      // Write all pixels within that layer
      var currLevel = textures[i].mipLevel[level];
      var currLength = currLevel.length;
      for (var pixel = 0; pixel < currLength; pixel++) {
        
        // Write pixel
        pos = putByte(dv, pos, currLevel[pixel]);
      } 
    }

    // Write the palette
    pos = put16(dv, pos, 256); // Number of colors used
    var palette = textures[i].palette;
    for (var palIndex = 0; palIndex < 256; palIndex++) {
      
      // Write palette entry
      pos = putByte(dv, pos, palette[palIndex].r); // Red
      pos = putByte(dv, pos, palette[palIndex].g); // Green
      pos = putByte(dv, pos, palette[palIndex].b); // Blue
    }
    
    // 2 bytes of padding following palette
    pos = put16(dv, pos, 0);

    // Record the file size (current position - starting position)
    fileSizes[i] = pos - fileOffsets[i];
  } 

  // Now build the directory entries
  for (var i = 0; i < textures.length; i++) {
    pos = put32(dv, pos, fileOffsets[i]);       // offset of file in WAD
    pos = put32(dv, pos, fileSizes[i]);         // file size
    pos = put32(dv, pos, fileSizes[i]);         // uncompressed size (same, we don't support compression)
    pos = putByte(dv, pos, 67);                 // type (67 is what Wally uses, so it must be a good choice)
    pos = putByte(dv, pos, 0);                  // compression (0 because we don't support it)
    pos = put16(dv, pos, 0);                    // 2 dummy bytes
    pos = putStr16(dv, pos, textures[i].name);  // texture name (16 bytes, null terminated)
  }

  saveData(buffer, "download.wad");
}



/********************************************************
 * binary put functions
 *
 * Takes a dataview object, a position (in bytes), and
 * a variable to write.
 ********************************************************/
function putByte(dv, pos, data) {
  dv.setUint8(pos, data);
  return pos + 1; 
}

function put16(dv, pos, data) {
  dv.setUint16(pos, data, true);
  return pos += 2;
}

function put32(dv, pos, data) {
  dv.setUint32(pos, data, true);
  return pos += 4;
}

function putStr16(dv, pos, str) {
  if (str.length > 15) {
    console.error("putStr16: Attempted to use string greater than length 15");
    return null;
  }

  var charLoop = str.length;        // How many characters to add
  var nullLoop = 16 - str.length;   // How many null terminators to add

  // Loop to add the string characters
  for (var i = 0; i < charLoop; i++) {
    var charCode = str.charCodeAt(i);
    dv.setUint8(pos + i, charCode);
  }

  // Loop to fill the any remaining bytes within the 16 length with null terminators
  for (var i = 0; i < nullLoop; i++) {
    dv.setUint8(pos + charLoop + i, 0);
  }

  return pos += 16;
}



/********************************************************
 * saveData
 *
 * Takes a data buffer (assumed to be a binary file) and
 * initiates the download.
 ********************************************************/
function saveData(data, fileName) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";

    var blob = new Blob([data], {type: "octet/stream"});
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

/********************************************************
 * exportZip()
 *
 * Build a zip from all textures and save it
 ********************************************************/
function exportZip() {
	var zip = new JSZip();
	// create a folder with the name of the file to prevent a mess on "extract here"
	var img = zip.folder(file_name.toLowerCase().replace(".wad", ""));
	var canvas = document.getElementById("viewport");
	for (var i = 0; i < textures.length; i++) {
		// display each texture to get it's data URL
		displayTexture(textures[i])
		// convert the dataURL to base64 and save it to a file
		img.file(`${textures[i].name}.png`, canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, ""), {base64: true});
	}
	zip.generateAsync({type:"blob"})
		.then(function(content) {
			// see FileSaver.js
			saveAs(content, `${file_name}.zip`);
		});
	// re-display the currently selected texture
	displayTexture(textures[document.getElementById("texture_list").selectedIndex])
}

/********************************************************
 * add_img_handler()
 *
 * Handles the actions for adding an image to the WAD
 * collection.
 ********************************************************/
function add_img_handler(){
    // Get the image file
    var imgFile = document.getElementById("add_img").files[0];

    // Create a FileReader and onload handler
    var reader = new FileReader();
    reader.onload = function(event){

      // Create image and onload handler
      var img = new Image();
      img.onload = function(){

        // Status Window
        var status = document.getElementById("status");
        status.value = "Status: Starting";

        // Make sure img dimensions are multiples of 16
        if (img.width % 16 || img.height % 16) {
          status.value = "Status: Error - Image dimensions must be multiples of 16." 
          return;
        }
        
        // Disable interface
        setDisableInterface(true);

        // Set-up canvas 
        var canvas = document.getElementById("viewport");
        var ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas
        ctx.drawImage(img,0,0);

        // Get the pixel buffer from the canvas
        var buffer = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Create web worker to handle the intense image processing routines
        var textureWorker = new Worker('create_texture.js');

        // Worker output variable
        var texture;

        // Message handler for textureWorker
        textureWorker.onmessage = function(event) {

          // Is incoming message a status update?
          if (event.data.type == "status") {
            status.value = "Status: " + event.data.msg;  
          }            
          
          // Otherwise its the processed texture
          else {
            texture = event.data.texture;
            
            // Display the image from palette form
            displayImg(texture.mipLevel[0], texture.palette);

            // Add the texture (handles document stuff)
            addTexture(texture);

            // Reenable interface
            setDisableInterface(false);

            console.log(texture.palette);
          }
        }

        // Start textureWorker thread
        textureWorker.postMessage({height:img.height, width:img.width, name:imgFile.name, buffer:buffer});        
    }
    img.src = event.target.result; 
  }
  // Invoke FileReader with the image file
  reader.readAsDataURL(imgFile);     
}



/********************************************************
 * displayImg()
 *
 * Takes an array of pixels (which are not RGB values, but
 * references into the palette), and the palette itself
 * and displays the image in the viewport canvas.
 ********************************************************/
function displayImg(refs, palette) {
  // Get image data to swap out
  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");
  var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var buffer = imgData.data;

  // For all the palette references in the buffer
  var pixelIndex = 0;
  for (var i = 0; i < refs.length; i++) {
    // Grab color from palette
    var color = palette[refs[i]];

    // Build the pixel in the pixel buffer
    buffer[pixelIndex++] = color.r;
    buffer[pixelIndex++] = color.g;
    buffer[pixelIndex++] = color.b;
    buffer[pixelIndex++] = 255;
  }

  // Reinsert image data to canvas
  ctx.putImageData(imgData, 0, 0);
}



/********************************************************
 * addTexture()
 *
 * Takes a texture object handles integrating it into the
 * WAD's collection. Also handles updating document with
 * new texture's information.
 ********************************************************/
function addTexture(texture) {
  // TODO ----------------- Generate mip textures 
  
  // Add texture object
  textures.push(texture);

  // Add to list
  var list = document.getElementById("texture_list");
  var option = document.createElement("option");
  option.text = texture.name;
  list.add(option); 
  
}



/********************************************************
 * removeTexture()
 *
 * removes the texture that is selected in the texture
 * list form, both from the form and from the internal
 * texture array.
 ********************************************************/
function removeTexture() {
  // Make sure there are actually textures available to remove
  if (textures.length == 0)
    return;

  // Get list from document
  var list = document.getElementById("texture_list");

  // Get selected index from list
  var index = list.selectedIndex;

  // Make sure something is selected in list
  if (index == -1)
    return;

  // Remove from texture array without leaving gap
  textures.splice(index, 1);
  
  // Remove from list in document
  list.remove(index);

  // Clear the canvas of current image
  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
}



/********************************************************
 * setDisableInterface()
 *
 * Enables/Disables the form elements depending on the
 * boolean argument.
 ********************************************************/
function setDisableInterface(boolean) {
  document.getElementById("upload").disabled = boolean;
  document.getElementById("add_img").disabled = boolean;
  document.getElementById("download").disabled = boolean;   
  document.getElementById("remove").disabled = boolean; 
  document.getElementById("texture_list").disabled = boolean;
  document.getElementById("rename").disabled = boolean;
}



/********************************************************
 * rename()
 *
 * Renames a texture to whatever is in the rename form
 * element and updates the texture name in both the form
 * list and its internal object in the texture array.
 ********************************************************/
function rename() {
  var newName = document.getElementById("rename").value;
  var status = document.getElementById("status");
  if (newName.length > 12) {
    status.value = "Status: Error - Name must be no longer than 12 characters";
    return;
  }

  // Make sure there are actually textures in the list
  if (textures.length == 0)
    return;

  // Get list from document
  var list = document.getElementById("texture_list");

  // Get selected index from list
  var index = list.selectedIndex;

  // Make sure something is selected in list
  if (index == -1)
    return;

  textures[index].name = newName;
    
  list.options[index].text = newName;

  status.value = "Status: Texture renamed.";
  
}

