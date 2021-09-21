;(() => {
    document.getElementById('file-input').addEventListener('change', loadImage)
    document.getElementById('add-color').addEventListener('click', addColor)
    document.getElementById('process-image').addEventListener('click', updateCanvas)

    const canvas = document.getElementsByTagName('canvas')[0]
    const ctx = canvas.getContext('2d')
    let image = new Image()

    canvas.width = 800
    canvas.height = 450

    // Draw the upload image text
    ctx.font = 'lighter 40px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ccc'
    ctx.fillText('Upload image', canvas.width / 2, 150)

    /**
     * Display the image to the canvas
     */
    function displayImage() {
        // Resize the canvas
        canvas.width = image.width
        canvas.height = image.height

        // Change the canvas display size
        canvas.style.width = '800px'
        canvas.style.height = (800 / image.width) * image.height + 'px'

        // Draw the image to the canvas
        ctx.drawImage(image, 0, 0)
    }

    /**
     * Load an image from the file input
     * @param {Event} e - The file upload event
     */
    function loadImage(e) {
        const reader = new FileReader()
        reader.onload = event => {
            const img = new Image()
            img.onload = () => {
                image = img
                displayImage()
            }
            img.src = event.target.result
        }
        reader.readAsDataURL(e.target.files[0])
    }

    /**
     * Convert hex string to rgb
     * @param {string} hex - The hex string
     * @returns {{r: string, g: string, b: string}} - The RGB color object
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16)
              }
            : null
    }

    /**
     * Recolor the image
     */
    function updateCanvas() {
        // Check if image exists
        if (!image.src) return

        // Load image to canvas
        displayImage()

        // Experimental: weighted color
        const weight = [1, 1, 1] // [0.299, 0.587, 0.114]

        // Retrieve the color palette from the document
        const palette = []
        for (colorInp of document.getElementsByClassName('palette-color')) palette.push(hexToRgb(colorInp.value))

        // Get array of pixels from the canvas
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data } = imgData

        // Loop over every pixel, each pixel is 3 adjacent array element representing r, g, b
        for (let i = 0; i < data.length; i += 4) {
            const red = data[i]
            const green = data[i + 1]
            const blue = data[i + 2]

            let newColor = { r: 0, g: 0, b: 0 }

            // A.K.A the value dimension of the HSV color model
            const brightness = Math.max(red, green, blue)

            let minDiff = Infinity

            for (const { r, g, b } of palette) {
                // Find the differnce between two color using the Euclidean distance
                const diffR = (r - red) * weight[0]
                const diffG = (g - green) * weight[1]
                const diffB = (b - blue) * weight[2]
                const diff = diffR * diffR + diffG * diffG + diffB * diffB

                if (diff < minDiff) {
                    newColor = { r, g, b }
                    minDiff = diff
                }
            }

            const scale = brightness / Math.max(newColor.r, newColor.g, newColor.b)
            data[i] = newColor.r * scale
            data[i + 1] = newColor.g * scale
            data[i + 2] = newColor.b * scale
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
    fetch('themes.json')
        .then(res => res.json())
        .then(data => {
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
})()
