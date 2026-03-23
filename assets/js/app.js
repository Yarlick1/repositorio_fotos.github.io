// ======================================================================
// ⚠️ CONFIGURACIÓN
// ======================================================================
const CLOUDINARY_CLOUD_NAME = "daxothobr";
const CLOUDINARY_UPLOAD_PRESET = "boda_preset";
const SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyKTqJuXFLjZSdULXDcvthHsxOaL0ojwm-j2C2_StlR48M9cawyhJ71SlKQ5qTIRVs1Uw/exec";

// ======================================================================
// Referencias a los elementos del HTML
const photoContainer = document.getElementById("photo-container");
const loadingMessage = document.getElementById("loading-message");
const uploadModal = document.getElementById("upload-modal");
const lightboxModal = document.getElementById("lightbox-modal");
const lightboxImage = document.getElementById("lightbox-image");
const uploadBtn = document.getElementById("upload-trigger-btn");
const uploadForm = document.getElementById("upload-form");
const submitBtn = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status-message");

// Variables de estado
const MAX_FILES = 5;
let allPhotos = [];
let currentIndex = 0;
let lastPhotoCount = 0;
let selectedFiles = []; // Array para mantener los archivos seleccionados
let isUploading = false; // Bloquea cambios mientras se suben las fotos
let preferredMode = null; // Guardará si es 'camera' o 'gallery'

function setPreferredMode(mode) {
    const cameraInput = document.getElementById('camera-file');
    const galleryInput = document.getElementById('gallery-file');

    preferredMode = mode;

    if (mode === 'camera') {
        if (cameraInput) cameraInput.setAttribute('capture', 'environment');
        if (galleryInput) galleryInput.removeAttribute('capture');
    } else if (mode === 'gallery') {
        if (galleryInput) galleryInput.removeAttribute('capture');
        if (cameraInput) cameraInput.removeAttribute('capture');
    }
}

function openAddMore() {
    const cameraInput = document.getElementById('camera-file');
    const galleryInput = document.getElementById('gallery-file');

    let mode = preferredMode;
    if (!mode) {
        mode = 'gallery';
        setPreferredMode(mode);
    }

    if (mode === 'camera') {
        setPreferredMode('camera');
        if (cameraInput) cameraInput.click();
    } else {
        setPreferredMode('gallery');
        if (galleryInput) galleryInput.click();
    }
}


// --- 1. LÓGICA DE LA GALERÍA ---

async function fetchPhotos() {
    try {
        const response = await fetch(`${SCRIPT_WEB_APP_URL}?action=get`);
        if (!response.ok) throw new Error("Error de conexión");
        const data = await response.json();
        const photos = data.photos || [];

        // Si no hay fotos nuevas, no hacemos nada
        if (photos.length === lastPhotoCount && lastPhotoCount !== 0) return;

        // Actualizamos la lista global para el slider (más nuevas primero)
        allPhotos = photos.map(p => p.url).reverse();

        if (allPhotos.length > 0 && loadingMessage) {
            loadingMessage.style.display = "none";
        } else if (allPhotos.length === 0 && loadingMessage) {
            loadingMessage.textContent = "Sé el primero en subir una foto...";
        }

        // Si hay cambios, renderizamos el grid
        if (allPhotos.length !== lastPhotoCount) {
            photoContainer.innerHTML = "";

            allPhotos.forEach((url, index) => {
                const photoDiv = document.createElement("div");
                photoDiv.className = "photo-card"; // Usamos la clase para el CSS
                photoDiv.style.borderRadius = "4px";
                photoDiv.style.overflow = "hidden";
                photoDiv.style.cursor = "pointer";

                // Animación AOS
                photoDiv.setAttribute("data-aos", "fade-up");
                photoDiv.setAttribute("data-aos-duration", "1000");

                const thumbnail = url.replace("/upload/", "/upload/w_400,c_scale/");

                photoDiv.innerHTML = `<img src="${thumbnail}" loading="lazy" style="width: 100%; display: block;">`;

                // Al hacer clic, abrimos por ÍNDICE para que el slider funcione
                photoDiv.onclick = () => openLightbox(index);

                photoContainer.appendChild(photoDiv);
            });

            if (window.AOS) AOS.refresh();
        }

        lastPhotoCount = allPhotos.length;
    } catch (error) {
        console.error("Error cargando fotos:", error);
    }
}

// --- 2. LÓGICA DEL LIGHTBOX (SLIDER) ---

function openLightbox(index) {
    currentIndex = index;
    updateLightboxImage();
    if (lightboxModal) lightboxModal.style.display = "flex";
}

function updateLightboxImage() {
    if (!lightboxImage) return;
    lightboxImage.style.opacity = "0";

    setTimeout(() => {
        lightboxImage.src = allPhotos[currentIndex];
        lightboxImage.style.opacity = "1";
    }, 150);
}

function nextPhoto(event) {
    if (event) event.stopPropagation();
    currentIndex = (currentIndex + 1) % allPhotos.length;
    updateLightboxImage();
}

function prevPhoto(event) {
    if (event) event.stopPropagation();
    currentIndex = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    updateLightboxImage();
}

function closeLightbox(event) {
    if (!event || event.target === lightboxModal || event.target.classList.contains("close-lightbox")) {
        if (lightboxModal) lightboxModal.style.display = "none";
        if (lightboxImage) lightboxImage.src = "";
    }
}

// Navegación por teclado
document.addEventListener('keydown', (e) => {
    if (lightboxModal && lightboxModal.style.display === 'flex') {
        if (e.key === "ArrowRight") nextPhoto();
        if (e.key === "ArrowLeft") prevPhoto();
        if (e.key === "Escape") closeLightbox();
    }
});

// --- 3. LÓGICA DE SUBIDA Y PREVISUALIZACIÓN ---

function previewImages(input) {
    const previewContainer = document.getElementById('preview-container');
    const uploadOptions = document.getElementById('upload-options');

    if (!previewContainer) return;

    if (isUploading) {
        Swal.fire({
            icon: 'info',
            title: 'Subida en curso',
            text: 'Espera a que termine la subida para agregar más fotos.'
        });
        input.value = "";
        return;
    }

    if (input.files && input.files.length > 0) {
        const totalFiles = selectedFiles.length + input.files.length;

        if (totalFiles > MAX_FILES) {
            Swal.fire({
                icon: 'warning',
                title: 'Máximo alcanzado',
                text: `Solo puedes seleccionar hasta ${MAX_FILES} fotos en total. Ya tienes ${selectedFiles.length}.`
            });
            input.value = "";
            return;
        }

        // Agregar los nuevos archivos al array
        selectedFiles = selectedFiles.concat(Array.from(input.files));
        input.value = ""; // Limpiar el input para permitir seleccionar el mismo archivo nuevamente

        renderPreviewPhotos();
    }
}

function renderPreviewPhotos() {
    const previewContainer = document.getElementById('preview-container');
    const uploadOptions = document.getElementById('upload-options');

    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    if (selectedFiles.length > 0) {
        previewContainer.classList.remove('hidden');
        if (uploadOptions) uploadOptions.classList.add('hidden');

        selectedFiles.forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "position: relative; aspect-ratio:1/1; overflow:hidden; border-radius:4px; border:1px solid #eee;";
            wrapper.dataset.index = index;

            const img = document.createElement('img');
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            img.onload = () => URL.revokeObjectURL(objectUrl);
            img.style.cssText = "width:100%; height:100%; object-fit:cover;";
            wrapper.appendChild(img);

            // Botón de eliminar
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '×';
            deleteBtn.disabled = isUploading;
            deleteBtn.style.cssText = `
                position: absolute;
                top: 4px;
                right: 4px;
                width: 28px;
                height: 28px;
                padding: 0;
                background: ${isUploading ? 'rgba(150,150,150,0.6)' : 'rgba(255, 0, 0, 0.8)'};
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: ${isUploading ? 'not-allowed' : 'pointer'};
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            `;
            deleteBtn.onmouseover = () => { if (!isUploading) deleteBtn.style.background = 'rgba(255, 0, 0, 1)'; };
            deleteBtn.onmouseout = () => { if (!isUploading) deleteBtn.style.background = 'rgba(255, 0, 0, 0.8)'; };
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isUploading) {
                    Swal.fire({ icon: 'info', title: 'Subida en curso', text: 'No puedes eliminar fotos mientras se están subiendo.' });
                    return;
                }
                selectedFiles.splice(index, 1);
                renderPreviewPhotos(); // Re-renderizar
            };
            wrapper.appendChild(deleteBtn);

            // Progress UI (hidden until upload starts)
            const progressWrap = document.createElement('div');
            progressWrap.className = 'progress-wrap';
            progressWrap.innerHTML = `<div class="progress-bar" style="width:0%"></div><div class="progress-text">0%</div>`;
            progressWrap.style.display = 'none';
            wrapper.appendChild(progressWrap);
            previewContainer.appendChild(wrapper);
        });

        // Mostrar opción de agregar más si hay menos de MAX_FILES
        if (selectedFiles.length < MAX_FILES) {
            const addMoreContainer = document.createElement('div');
            addMoreContainer.style.cssText = `
                aspect-ratio: 1/1;
                border: 2px dashed var(--gold);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 8px;
                cursor: ${isUploading ? 'not-allowed' : 'pointer'};
                background: #fdfdfd;
                transition: all 0.3s ease;
                padding: 10px;
            `;
            addMoreContainer.onmouseover = () => {
                if (!isUploading) { addMoreContainer.style.background = '#f5f5f5'; addMoreContainer.style.borderColor = 'var(--gold-dark)'; }
            };
            addMoreContainer.onmouseout = () => {
                addMoreContainer.style.background = '#fdfdfd';
                addMoreContainer.style.borderColor = 'var(--gold)';
            };

            const addIcon = document.createElement('div');
            addIcon.style.cssText = 'font-size: 32px; color: var(--gold);';
            addIcon.textContent = '+';
            addMoreContainer.appendChild(addIcon);

            const addText = document.createElement('div');
            addText.style.cssText = 'font-size: 0.8rem; color: var(--text-gray); text-align: center; white-space: pre-line;';
            addText.textContent = `Agregar más\n(${selectedFiles.length}/${MAX_FILES})`;
            addMoreContainer.appendChild(addText);

            const cameraInput = document.getElementById('camera-file');
            const galleryInput = document.getElementById('gallery-file');

            addMoreContainer.addEventListener('click', (e) => {
                if (isUploading) {
                    Swal.fire({ icon: 'info', title: 'Subida en curso', text: 'No puedes agregar fotos mientras se están subiendo.' });
                    return;
                }

                openAddMore();
            });

            previewContainer.appendChild(addMoreContainer);
        }
    } else {
        previewContainer.classList.add('hidden');
        if (uploadOptions) uploadOptions.classList.remove('hidden');
    }
}

async function handleUpload(event) {
    event.preventDefault();
    if (selectedFiles.length === 0 || isUploading) return;

    isUploading = true;
    submitBtn.disabled = true;
    statusMessage.style.display = 'block';
    statusMessage.style.color = 'black';
    statusMessage.textContent = `⏳ Preparando ${selectedFiles.length} fotos para subir...`;

    // Deshabilitar botones de agregar
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    if (cameraBtn) cameraBtn.disabled = true;
    if (galleryBtn) galleryBtn.disabled = true;
    renderPreviewPhotos();

    // Comprimir/normalizar imágenes antes de subir para acelerar la subida
    const compressedFiles = await Promise.all(selectedFiles.map(f => compressImage(f)));

    statusMessage.textContent = `⏳ Subiendo ${compressedFiles.length} fotos...`;

    // Usar XMLHttpRequest para poder rastrear progreso por archivo
    const uploadPromises = compressedFiles.map((file, index) => {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            xhr.open('POST', url);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    updateProgressUI(index, pct);
                    statusMessage.textContent = `⏳ Subiendo ${index + 1}/${compressedFiles.length} — ${pct}%`;
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        // Fire-and-forget to script
                        fetch(SCRIPT_WEB_APP_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'add', url: data.secure_url })
                        }).catch(() => { });
                        updateProgressUI(index, 100);
                        resolve({ success: true, index, url: data.secure_url });
                    } catch (err) {
                        resolve({ success: false, index, error: 'Invalid JSON' });
                    }
                } else {
                    resolve({ success: false, index, error: `HTTP ${xhr.status}` });
                }
            };

            xhr.onerror = () => {
                resolve({ success: false, index, error: 'Network error' });
            };

            xhr.send(fd);
        });
    });

    const results = await Promise.allSettled(uploadPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length;

    if (successCount === compressedFiles.length) {
        statusMessage.textContent = `✅ ¡Todas las ${successCount} fotos compartidas exitosamente!`;
        statusMessage.style.color = 'green';
    } else if (successCount > 0) {
        statusMessage.textContent = `⚠️ ${successCount} de ${compressedFiles.length} fotos subidas. Algunas fallaron.`;
        statusMessage.style.color = 'orange';
    } else {
        statusMessage.textContent = `❌ Error al subir las fotos. Inténtalo de nuevo.`;
        statusMessage.style.color = 'red';
    }

    // Restaurar estado
    isUploading = false;
    if (cameraBtn) cameraBtn.disabled = false;
    if (galleryBtn) galleryBtn.disabled = false;
    renderPreviewPhotos();

    // Olvidar modo preferido cuando termina la subida
    preferredMode = null;

    setTimeout(() => {
        closeModal();
        fetchPhotos();
    }, 2000);
}

// Actualiza la barra de progreso para el índice de preview dado
function updateProgressUI(index, percent) {
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) return;
    const wrapper = previewContainer.children[index];
    if (!wrapper) return;
    const progressWrap = wrapper.querySelector('.progress-wrap');
    if (!progressWrap) return;
    progressWrap.style.display = 'flex';
    const bar = progressWrap.querySelector('.progress-bar');
    const text = progressWrap.querySelector('.progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
}

// Comprime imagen en cliente usando canvas, devuelve File (JPEG)
async function compressImage(file, maxDim = 1600, quality = 0.8) {
    try {
        if (!file.type.startsWith('image/') || file.size < 200 * 1024) return file;

        return await new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                let scale = 1;
                if (Math.max(w, h) > maxDim) scale = maxDim / Math.max(w, h);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob) return resolve(file);
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
                    resolve(newFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });
    } catch (e) {
        console.error('compressImage error', e);
        return file;
    }
}

// --- 4. MODALES Y CIERRE ---

function openModal() {
    if (uploadModal) uploadModal.style.display = "flex";
    if (statusMessage) statusMessage.style.display = "none";
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "ENVIAR RECUERDO";
    }
}

function closeModal() {
    if (uploadModal) uploadModal.style.display = "none";
    if (uploadForm) uploadForm.reset();

    // Limpiar inputs file
    const cameraInput = document.getElementById('camera-file');
    const galleryInput = document.getElementById('gallery-file');
    if (cameraInput) cameraInput.value = "";
    if (galleryInput) galleryInput.value = "";

    // Limpiar archivos seleccionados
    selectedFiles = [];

    // Limpiar vista previa
    const pc = document.getElementById('preview-container');
    const uo = document.getElementById('upload-options');
    if (pc) {
        pc.innerHTML = "";
        pc.classList.add('hidden');
    }
    if (uo) uo.classList.remove('hidden');
}

// --- 5. INICIALIZACIÓN ---

window.nextPhoto = nextPhoto;
window.prevPhoto = prevPhoto;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.openModal = openModal;
window.closeModal = closeModal;
window.previewImages = previewImages;
window.renderPreviewPhotos = renderPreviewPhotos;

document.addEventListener("DOMContentLoaded", () => {
    if (uploadBtn) uploadBtn.onclick = openModal;
    if (uploadForm) uploadForm.onsubmit = handleUpload;

    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const cameraInput = document.getElementById('camera-file');
    const galleryInput = document.getElementById('gallery-file');

    if (cameraBtn) {
        cameraBtn.onclick = () => {
            setPreferredMode('camera');
            if (cameraInput) cameraInput.click();
        };
    }

    if (galleryBtn) {
        galleryBtn.onclick = () => {
            setPreferredMode('gallery');
            if (galleryInput) galleryInput.click();
        };
    }

    fetchPhotos();
    setInterval(fetchPhotos, 8000); // Polling cada 8 seg para no saturar
});