;(() => {
    document.getElementById('file-input').addEventListener('change', loadImage)
    document.getElementById('add-color').addEventListener('click', addColor)
    document.getElementById('process-image').addEventListener('click', updateCanvas)

    const canvas = document.getElementsByTagName('canvas')[0]
    const ctx = canvas.getContext('2d')
    let image = new Image()

    canvas.width = 800
    canvas.height = 450
    ctx.font = 'lighter 40px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ccc'
    ctx.fillText('Upload image', canvas.width / 2, 150)

    function displayImage() {
        canvas.width = image.width
        canvas.height = image.height
        canvas.style.width = '800px'
        canvas.style.height = (800 / image.width) * image.height + 'px'
        ctx.drawImage(image, 0, 0)
    }

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

    function updateCanvas() {
        if (!image.src) return
        displayImage()

        const weight = [1, 1, 1] // [0.299, 0.587, 0.114]

        const palette = []
        for (colorInp of document.getElementsByClassName('palette-color')) palette.push(hexToRgb(colorInp.value))

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {
            const red = data[i]
            const green = data[i + 1]
            const blue = data[i + 2]
            const brightness = Math.max(red, green, blue)

            let minDiff = Infinity

            for (const { r, g, b } of palette) {
                const diffR = Math.abs(r - red) * weight[0]
                const diffG = Math.abs(g - green) * weight[1]
                const diffB = Math.abs(b - blue) * weight[2]
                const diff = diffR * diffR + diffG * diffG + diffB * diffB
                if (diff < minDiff) {
                    minDiff = diff
                    const scale = brightness / Math.max(r, g, b)
                    data[i] = r * scale
                    data[i + 1] = g * scale
                    data[i + 2] = b * scale
                }
            }
        }
        ctx.putImageData(imgData, 0, 0)
    }

    function addColor() {
        const elem = document.createElement('div')
        const inp = document.createElement('input')
        const rem = document.createElement('button')
        inp.className = 'palette-color'
        inp.type = 'color'
        rem.addEventListener('click', () => document.getElementById('palette').removeChild(elem))
        rem.innerHTML = '×'
        elem.appendChild(inp)
        elem.appendChild(rem)
        document.getElementById('palette').appendChild(elem)
    }

    function loadpalette(palette) {
        const paletteContainer = document.getElementById('palette')
        const paletteInp = paletteContainer.getElementsByClassName('palette-color')
        while (paletteInp.length > palette.length) paletteContainer.removeChild(paletteContainer.lastChild)
        while (paletteInp.length < palette.length) addColor()
        for (let i = 0; i < palette.length; i++) paletteInp[i].value = palette[i]
    }

    fetch('themes.json')
        .then(res => res.json())
        .then(data => {
            let first = true
            for (const theme of Object.keys(data)) {
                const opt = document.createElement('option')
                opt.value = opt.innerHTML = theme
                if (first) opt.selected = true
                document.getElementById('select-palette').appendChild(opt)
                if (first) {
                    opt.selected = true
                    loadpalette(data[theme])
                    first = false
                }
            }
            document.getElementById('select-palette').addEventListener('change', e => loadpalette(data[e.target.value]))
        })
})()
