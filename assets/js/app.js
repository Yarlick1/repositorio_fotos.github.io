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
let allPhotos = [];
let currentIndex = 0;
let lastPhotoCount = 0;

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
    const instructions = document.getElementById('upload-instructions');
    const fileLabel = document.getElementById('file-label');

    if (!previewContainer) return;
    previewContainer.innerHTML = '';

    if (input.files && input.files.length > 0) {
        if (input.files.length > 5) {
            alert("¡Ups! Por favor selecciona solo hasta 5 fotos.");
            input.value = "";
            return;
        }

        previewContainer.classList.remove('hidden');
        if (instructions) instructions.classList.add('hidden');
        fileLabel.textContent = `¡Excelente! ${input.files.length} fotos listas`;

        Array.from(input.files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = "aspect-ratio:1/1; overflow:hidden; border-radius:4px; border:1px solid #eee;";
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = "width:100%; height:100%; object-fit:cover;";
                wrapper.appendChild(img);
                previewContainer.appendChild(wrapper);
            }
            reader.readAsDataURL(file);
        });
    }
}

async function handleUpload(event) {
    event.preventDefault();
    const fileInput = document.getElementById('photo-file');
    const files = fileInput ? fileInput.files : [];
    if (files.length === 0) return;

    submitBtn.disabled = true;
    statusMessage.style.display = 'block';
    statusMessage.style.color = 'black';

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
        const currentNum = i + 1;
        statusMessage.textContent = `⏳ Subiendo ${currentNum} de ${files.length}...`;

        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            await fetch(SCRIPT_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', url: data.secure_url })
            });
            successCount++;
        } catch (e) {
            console.error(e);
        }
    }

    statusMessage.textContent = `✅ ¡${successCount} fotos compartidas!`;
    statusMessage.style.color = 'green';

    setTimeout(() => {
        closeModal();
        fetchPhotos();
    }, 2000);
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
    const pc = document.getElementById('preview-container');
    const ui = document.getElementById('upload-instructions');
    if (pc) pc.innerHTML = "";
    if (ui) ui.classList.remove('hidden');
    const fl = document.getElementById('file-label');
    if (fl) fl.textContent = "Toca para elegir fotos (Máx. 5)";
}

// --- 5. INICIALIZACIÓN ---

window.nextPhoto = nextPhoto;
window.prevPhoto = prevPhoto;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.openModal = openModal;
window.closeModal = closeModal;
window.previewImages = previewImages;

document.addEventListener("DOMContentLoaded", () => {
    if (uploadBtn) uploadBtn.onclick = openModal;
    if (uploadForm) uploadForm.onsubmit = handleUpload;

    fetchPhotos();
    setInterval(fetchPhotos, 8000); // Polling cada 8 seg para no saturar
});