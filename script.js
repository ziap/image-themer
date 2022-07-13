document.getElementById('file-input').addEventListener('change', loadImage)
document.getElementById('add-color').addEventListener('click', addColor)
document.getElementById('process-image').addEventListener('click', updateCanvas)

const canvas = document.getElementsByTagName('canvas')[0]
const ctx = canvas.getContext('2d')
let image = new Image()

canvas.width = 1920
canvas.height = 1080

// Draw the upload image text
ctx.font = 'lighter 90px sans-serif'
ctx.textAlign = 'center'
ctx.fillStyle = '#ccc'
ctx.fillText('Upload image', canvas.width / 2, canvas.height / 2)

/**
 * Display the image to the canvas
 */
function displayImage() {
  // Resize the canvas
  canvas.width = image.width
  canvas.height = image.height

  // Change the canvas display size
  canvas.style.aspectRatio = image.width + '/' + image.height

  // Draw the image to the canvas
  ctx.drawImage(image, 0, 0)
}

/**
 * Load an image from the file input
 * @param {InputEvent} e - The file upload event
 */
function loadImage(e) {
  const reader = new FileReader()
  reader.onload = event => {
    const img = new Image()
    img.onload = () => {
      image = img
      displayImage()
    }
    img.src = event.target.result.toString()
  }
  reader.readAsDataURL(e.target.files[0])
}

/**
 * Convert hex string to rgb
 * @param {string} hex - The hex string
 * @returns {{r: number, g: number, b: number}} - The RGB color object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Recolor the image
 */
function updateCanvas() {
  // Check if image exists
  if (!image.src) return

  // Load image to canvas
  displayImage()

  // Retrieve the color palette from the document
  const palette = []
  for (const colorInp of document.getElementsByClassName('palette-color')) palette.push(hexToRgb(colorInp.value))

  // Get array of pixels from the canvas
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { width, height, data } = imgData

  // Iterate from top to bottom, left to right
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = 4 * (x + y * width);

    const ir = data[index + 0]
    const ig = data[index + 1]
    const ib = data[index + 2]

    // Quantization error (for dithering)
    let er, eg, eb

    // Nearest neighbor search
    let minDiff = Infinity
    for (const { r, g, b } of palette) {
      const diffr = ir - r
      const diffg = ig - g
      const diffb = ib - b

      const diff = diffr * diffr + diffg * diffg + diffb * diffb

      if (diff < minDiff) {
        minDiff = diff

        data[index + 0] = r
        data[index + 1] = g
        data[index + 2] = b

        er = diffr
        eg = diffg
        eb = diffb
      }
    }

    // Dithering
    for (const [i, j, w] of [
      [x + 1, y + 0, 7],
      [x - 1, y + 1, 3],
      [x + 0, y + 1, 5],
      [x + 1, y + 1, 1]
    ]) {
      if (i < 0 || i >= width || j >= height) continue
      const neighbor = 4 * (i + j * width)
      data[neighbor + 0] += er * w / 16
      data[neighbor + 1] += eg * w / 16
      data[neighbor + 2] += eb * w / 16
    }
  }

  // Draw the recolored image to the canvas
  ctx.putImageData(imgData, 0, 0)
}

/**
 * Add a color to the selected palette
 */
function addColor() {
  // Create the elements
  const elem = document.createElement('div')
  const inp = document.createElement('input')
  const rem = document.createElement('button')

  // Set the attributes
  inp.className = 'palette-color'
  inp.type = 'color'
  rem.innerHTML = '×'

  // Add click event to the remove button
  rem.addEventListener('click', () => elem.remove())

  // Append the elements to the document
  elem.appendChild(inp)
  elem.appendChild(rem)
  document.getElementById('palette').appendChild(elem)
}

/**
 * Load a color palette
 * @param {string[]} palette - An array of color palette in hex format
 */
function loadpalette(palette) {
  const paletteContainer = document.getElementById('palette')
  const paletteInp = paletteContainer.getElementsByClassName('palette-color')
  while (paletteInp.length > palette.length) paletteContainer.lastChild.remove()
  while (paletteInp.length < palette.length) addColor()
  for (let i = 0; i < palette.length; i++) paletteInp[i].value = palette[i]
}

// Add the palettes from themes.json
fetch('themes.json').then(res => res.json()).then(data => {
  let first = true
  for (const theme of Object.keys(data)) {
    const opt = document.createElement('option')
    opt.value = opt.innerHTML = theme
    document.getElementById('select-palette').appendChild(opt)

    // Load the first palette
    if (first) {
      loadpalette(data[theme])
      first = false
    }
  }
  document.getElementById('select-palette').addEventListener('change', e => loadpalette(data[e.target.value]))
})
