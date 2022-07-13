document.querySelector('#file-input').addEventListener('change', loadImage)
document.querySelector('#add-color').addEventListener('click', addColor)

addEventListener('paste', pasteImage)

const canvas = document.getElementsByTagName('canvas')[0]
const ctx = canvas.getContext('2d')
const processButton = document.querySelector('#process-image')

processButton.addEventListener('click', updateCanvas)

canvas.width = 1920
canvas.height = 1080

// Draw the upload image text
ctx.font = 'lighter 66px sans-serif'
ctx.textAlign = 'center'
ctx.fillStyle = '#ccc'
ctx.fillText('Paste image or click to upload', canvas.width / 2, canvas.height / 2)

/**
 * Display the image to the canvas
 * @param {HTMLImageElement} image - The image to display
 */
function displayImage(image) {
  canvas.width = image.width
  canvas.height = image.height

  canvas.style.aspectRatio = image.width + '/' + image.height
  ctx.drawImage(image, 0, 0)
  processButton.disabled = false
}

/**
 * Load an image from the file input
 * @param {InputEvent} e - The file upload event
 */
function loadImage(e) {
  const reader = new FileReader()
  reader.addEventListener('load', event => {
    const img = new Image()
    img.addEventListener('load', () => displayImage(img))
    img.src = event.target.result.toString()
  })
  reader.readAsDataURL(e.target.files[0])
}

/**
 * Load an image from the user clipboard
 * @param {ClipboardEvent} e - The paste event
 */
function pasteImage(e) {
  for (const item of e.clipboardData.items) {
    if (item.kind != 'file') continue
    const reader = new FileReader()
    const file = item.getAsFile()
    reader.addEventListener('load', event => {
      const img = new Image()
      img.addEventListener('load', () => displayImage(img))
      img.src = event.target.result
    })
    reader.readAsDataURL(file)
    break
  }
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
  const palette = []
  for (const colorInp of document.getElementsByClassName('palette-color')) palette.push(hexToRgb(colorInp.value))

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

  ctx.putImageData(imgData, 0, 0)
}

/**
 * Add a color to the selected palette
 */
function addColor() {
  const elem = document.createElement('div')
  const inp = document.createElement('input')
  const rem = document.createElement('button')

  inp.className = 'palette-color'
  inp.type = 'color'
  rem.innerHTML = '×'

  rem.addEventListener('click', () => elem.remove())

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

    if (first) {
      loadpalette(data[theme])
      first = false
    }
  }
  document.getElementById('select-palette').addEventListener('change', e => loadpalette(data[e.target.value]))
})
