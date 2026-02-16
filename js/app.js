// Глобальные переменные
let uploadedImage = null;
let processedPixels = [];
let scene, camera, renderer, controls, mesh;

// DOM элементы
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewCanvas = document.getElementById('previewCanvas');
const settingsSection = document.getElementById('settingsSection');
const previewSection = document.getElementById('previewSection');
const advancedToggle = document.getElementById('advancedToggle');
const advancedSettings = document.getElementById('advancedSettings');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const printSize = document.getElementById('printSize');
const colorPalette = document.getElementById('colorPalette');
const addColorBtn = document.getElementById('addColorBtn');
const generateBtn = document.getElementById('generateBtn');
const downloadSTL = document.getElementById('downloadSTL');
const resetCamera = document.getElementById('resetCamera');

// Advanced settings
const variableHeight = document.getElementById('variableHeight');
const blockHeight = document.getElementById('blockHeight');
const blockHeightValue = document.getElementById('blockHeightValue');
const baseThickness = document.getElementById('baseThickness');
const baseThicknessValue = document.getElementById('baseThicknessValue');
const blockGap = document.getElementById('blockGap');
const blockGapValue = document.getElementById('blockGapValue');

// Инициализация
init();

function init() {
    setupUpload();
    setupSettings();
    setupColorPalette();
}

// ===== ЗАГРУЗКА ИЗОБРАЖЕНИЯ =====
function setupUpload() {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, загрузите изображение');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            showImagePreview(img);
            settingsSection.style.display = 'block';
            uploadArea.style.display = 'none';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showImagePreview(img) {
    const ctx = previewCanvas.getContext('2d');
    const maxSize = 400;
    let width = img.width;
    let height = img.height;
    
    if (width > height && width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
    } else if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
    }
    
    previewCanvas.width = width;
    previewCanvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    previewCanvas.style.display = 'block';
}

// ===== НАСТРОЙКИ =====
function setupSettings() {
    advancedToggle.addEventListener('change', (e) => {
        advancedSettings.style.display = e.target.checked ? 'block' : 'none';
    });
    
    widthInput.addEventListener('input', updatePrintSize);
    heightInput.addEventListener('input', updatePrintSize);
    
    blockHeight.addEventListener('input', (e) => {
        blockHeightValue.textContent = e.target.value + ' мм';
    });
    
    baseThickness.addEventListener('input', (e) => {
        baseThicknessValue.textContent = e.target.value + ' мм';
    });
    
    blockGap.addEventListener('input', (e) => {
        blockGapValue.textContent = e.target.value + ' мм';
    });
    
    generateBtn.addEventListener('click', generatePreview);
}

function updatePrintSize() {
    const width = parseInt(widthInput.value) || 48;
    const height = parseInt(heightInput.value) || 48;
    printSize.textContent = `256×${Math.round(256 * height / width)} мм`;
}

// ===== ПАЛИТРА ЦВЕТОВ =====
function setupColorPalette() {
    addColorBtn.addEventListener('click', addColor);
    
    colorPalette.addEventListener('input', (e) => {
        if (e.target.type === 'color') {
            const textInput = e.target.nextElementSibling;
            textInput.value = e.target.value;
        } else if (e.target.type === 'text') {
            const colorInput = e.target.previousElementSibling;
            const value = e.target.value.trim();
            if (value.startsWith('#') && /^#[0-9A-F]{6}$/i.test(value)) {
                colorInput.value = value;
            } else if (/^RAL\s*\d{4}$/i.test(value)) {
                // Упрощенная конвертация RAL (можно добавить полную таблицу)
                const ralColors = {
                    '1000': '#BEBD7F', '3000': '#AF2B1E', '5010': '#0E4C8A',
                    '6019': '#BDECB6', '7035': '#D7D7D7', '9005': '#0A0A0A'
                };
                const ral = value.replace(/\s/g, '').toUpperCase();
                const ralNum = ral.replace('RAL', '');
                if (ralColors[ralNum]) {
                    colorInput.value = ralColors[ralNum];
                }
            }
        }
    });
    
    colorPalette.addEventListener('click', (e) => {
        if (e.target.closest('.remove-color')) {
            e.target.closest('.color-item').remove();
            updateRemoveButtons();
        }
    });
}

function addColor() {
    const colors = colorPalette.querySelectorAll('.color-item');
    if (colors.length >= 4) {
        alert('Максимум 4 цвета');
        return;
    }
    
    const colorItem = document.createElement('div');
    colorItem.className = 'color-item';
    colorItem.innerHTML = `
        <input type="color" value="#FFFFFF" data-index="${colors.length}">
        <input type="text" placeholder="HEX/RAL" value="#FFFFFF">
        <button class="remove-color"><i class="fas fa-times"></i></button>
    `;
    colorPalette.appendChild(colorItem);
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const colors = colorPalette.querySelectorAll('.color-item');
    colors.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-color');
        removeBtn.style.display = colors.length > 1 ? 'block' : 'none';
    });
}

// ===== ОБРАБОТКА ИЗОБРАЖЕНИЯ =====
function generatePreview() {
    if (!uploadedImage) return;
    
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const palette = getPalette();
    
    processedPixels = processImage(uploadedImage, width, height, palette);
    
    create3DPreview();
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

function getPalette() {
    const colors = colorPalette.querySelectorAll('.color-item input[type="color"]');
    return Array.from(colors).map(input => hexToRgb(input.value));
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function processImage(img, targetWidth, targetHeight, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    // Масштабирование изображения
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;
    
    const pixels = [];
    
    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const i = (y * targetWidth + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Находим ближайший цвет из палитры
            const closestColor = findClosestColor({ r, g, b }, palette);
            
            // Яркость для переменной высоты
            const brightness = (r + g + b) / 3 / 255;
            
            pixels.push({
                x,
                y,
                color: closestColor,
                brightness
            });
        }
    }
    
    return pixels;
}

function findClosestColor(color, palette) {
    let minDistance = Infinity;
    let closest = palette[0];
    
    palette.forEach(paletteColor => {
        const distance = Math.sqrt(
            Math.pow(color.r - paletteColor.r, 2) +
            Math.pow(color.g - paletteColor.g, 2) +
            Math.pow(color.b - paletteColor.b, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closest = paletteColor;
        }
    });
    
    return closest;
}

// ===== 3D PREVIEW =====
function create3DPreview() {
    const container = document.getElementById('viewer3D');
    container.innerHTML = '';
    
    // Настройка сцены
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Камера
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(width * 0.8, height * 0.8, width * 1.2);
    camera.lookAt(width / 2, 0, height / 2);
    
    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(width, height * 2, width);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Создание мозаики
    createMosaic();
    
    // Управление
    setupControls();
    
    // Анимация
    animate();
    
    // Настройка кнопок
    resetCamera.onclick = () => {
        camera.position.set(width * 0.8, height * 0.8, width * 1.2);
        camera.lookAt(width / 2, 0, height / 2);
    };
    
    downloadSTL.onclick = exportSTL;
}

function createMosaic() {
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const pixelSize = 256 / width;
    const baseThick = parseFloat(baseThickness.value);
    const blockHeightVal = parseFloat(blockHeight.value);
    const gap = parseFloat(blockGap.value);
    const useVariableHeight = variableHeight.checked;
    
    // Группа для всей мозаики
    const mosaicGroup = new THREE.Group();
    
    // Основание
    const baseGeometry = new THREE.BoxGeometry(
        width * pixelSize + gap,
        baseThick,
        height * pixelSize + gap
    );
    const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(width * pixelSize / 2, -baseThick / 2, height * pixelSize / 2);
    mosaicGroup.add(baseMesh);
    
    // Блоки
    processedPixels.forEach(pixel => {
        const heightMult = useVariableHeight ? pixel.brightness : 1;
        const blockH = blockHeightVal * heightMult;
        
        const geometry = new THREE.BoxGeometry(
            pixelSize - gap,
            blockH,
            pixelSize - gap
        );
        
        const color = new THREE.Color(
            `rgb(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b})`
        );
        const material = new THREE.MeshPhongMaterial({ color });
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(
            pixel.x * pixelSize + pixelSize / 2,
            blockH / 2,
            pixel.y * pixelSize + pixelSize / 2
        );
        
        mosaicGroup.add(block);
    });
    
    scene.add(mosaicGroup);
    mesh = mosaicGroup;
}

function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    renderer.domElement.addEventListener('mousedown', () => isDragging = true);
    renderer.domElement.addEventListener('mouseup', () => isDragging = false);
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.offsetX - previousMousePosition.x;
            const deltaY = e.offsetY - previousMousePosition.y;
            
            mesh.rotation.y += deltaX * 0.01;
            mesh.rotation.x += deltaY * 0.01;
        }
        
        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });
    
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.1;
    });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// ===== ЭКСПОРТ 3MF =====
function exportSTL() {
    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const pixelSize = 256 / width;
    const baseThick = parseFloat(baseThickness.value);
    const blockHeightVal = parseFloat(blockHeight.value);
    const gap = parseFloat(blockGap.value);
    const useVariableHeight = variableHeight.checked;
    
    // Создаем 3MF архив (упрощенный формат)
    let modelXML = '<?xml version="1.0" encoding="UTF-8"?>\n';
    modelXML += '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n';
    modelXML += '  <resources>\n';
    
    // Базовые цвета
    const palette = getPalette();
    palette.forEach((color, idx) => {
        const hex = rgbToHex(color.r, color.g, color.b).substring(1);
        modelXML += `    <basematerials id="${idx + 1}">\n`;
        modelXML += `      <base name="Color${idx}" displaycolor="#${hex}" />\n`;
        modelXML += `    </basematerials>\n`;
    });
    
    // Объекты (блоки)
    let objectId = 100;
    processedPixels.forEach((pixel, idx) => {
        const x = pixel.x * pixelSize;
        const z = pixel.y * pixelSize;
        const w = pixelSize - gap;
        const h = useVariableHeight ? blockHeightVal * pixel.brightness : blockHeightVal;
        
        const colorIndex = palette.findIndex(c => 
            c.r === pixel.color.r && c.g === pixel.color.g && c.b === pixel.color.b
        ) + 1;
        
        modelXML += `    <object id="${objectId}" type="model">\n`;
        modelXML += `      <mesh>\n`;
        modelXML += createBoxMesh(x + pixelSize / 2, h / 2, z + pixelSize / 2, w, h, w);
        modelXML += `      </mesh>\n`;
        modelXML += `    </object>\n`;
        
        objectId++;
    });
    
    // Основание
    const baseW = width * pixelSize;
    const baseH = height * pixelSize;
    modelXML += `    <object id="${objectId}" type="model">\n`;
    modelXML += `      <mesh>\n`;
    modelXML += createBoxMesh(baseW / 2, -baseThick / 2, baseH / 2, baseW, baseThick, baseH);
    modelXML += `      </mesh>\n`;
    modelXML += `    </object>\n`;
    
    // Build items
    modelXML += '  </resources>\n';
    modelXML += '  <build>\n';
    
    objectId = 100;
    processedPixels.forEach((pixel, idx) => {
        const colorIndex = palette.findIndex(c => 
            c.r === pixel.color.r && c.g === pixel.color.g && c.b === pixel.color.b
        ) + 1;
        
        modelXML += `    <item objectid="${objectId}" partnumber="block${idx}" pid="${colorIndex}" pindex="0" />\n`;
        objectId++;
    });
    
    modelXML += `    <item objectid="${objectId}" partnumber="base" />\n`;
    modelXML += '  </build>\n';
    modelXML += '</model>';
    
    // Скачиваем как 3MF (упрощенный вариант без ZIP)
    // Для полноценного 3MF нужна библиотека JSZip
    downloadFile('mosaic.3mf', modelXML);
}

function createBoxMesh(cx, cy, cz, w, h, d) {
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    
    const vertices = [
        [cx - hw, cy - hh, cz - hd],
        [cx + hw, cy - hh, cz - hd],
        [cx + hw, cy + hh, cz - hd],
        [cx - hw, cy + hh, cz - hd],
        [cx - hw, cy - hh, cz + hd],
        [cx + hw, cy - hh, cz + hd],
        [cx + hw, cy + hh, cz + hd],
        [cx - hw, cy + hh, cz + hd]
    ];
    
    let mesh = '        <vertices>\n';
    vertices.forEach(v => {
        mesh += `          <vertex x="${v[0].toFixed(3)}" y="${v[1].toFixed(3)}" z="${v[2].toFixed(3)}" />\n`;
    });
    mesh += '        </vertices>\n';
    
    mesh += '        <triangles>\n';
    const faces = [
        [0, 2, 1], [0, 3, 2], // front
        [4, 5, 6], [4, 6, 7], // back
        [0, 1, 5], [0, 5, 4], // bottom
        [3, 6, 2], [3, 7, 6], // top
        [0, 4, 7], [0, 7, 3], // left
        [1, 2, 6], [1, 6, 5]  // right
    ];
    
    faces.forEach(face => {
        mesh += `          <triangle v1="${face[0]}" v2="${face[1]}" v3="${face[2]}" />\n`;
    });
    mesh += '        </triangles>\n';
    
    return mesh;
}

function createBoxSTL(cx, cy, cz, w, h, d) {
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    
    const vertices = [
        [cx - hw, cy - hh, cz - hd],
        [cx + hw, cy - hh, cz - hd],
        [cx + hw, cy + hh, cz - hd],
        [cx - hw, cy + hh, cz - hd],
        [cx - hw, cy - hh, cz + hd],
        [cx + hw, cy - hh, cz + hd],
        [cx + hw, cy + hh, cz + hd],
        [cx - hw, cy + hh, cz + hd]
    ];
    
    const faces = [
        [0, 2, 1], [0, 3, 2], // front
        [4, 5, 6], [4, 6, 7], // back
        [0, 1, 5], [0, 5, 4], // bottom
        [3, 6, 2], [3, 7, 6], // top
        [0, 4, 7], [0, 7, 3], // left
        [1, 2, 6], [1, 6, 5]  // right
    ];
    
    let stl = '';
    faces.forEach(face => {
        const v0 = vertices[face[0]];
        const v1 = vertices[face[1]];
        const v2 = vertices[face[2]];
        
        const normal = calculateNormal(v0, v1, v2);
        
        stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
        stl += `    outer loop\n`;
        stl += `      vertex ${v0[0]} ${v0[1]} ${v0[2]}\n`;
        stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
        stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
        stl += `    endloop\n`;
        stl += `  endfacet\n`;
    });
    
    return stl;
}

function calculateNormal(v0, v1, v2) {
    const u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
    
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    return normal.map(n => (n / length).toFixed(6));
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
