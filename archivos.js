// archivos.js
// Este archivo gestiona la visualización y posible gestión de metadatos de archivos
// utilizando Firebase Firestore.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, getDocs, doc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    while (!window.firebaseDb) {
        console.log('Esperando inicialización de Firebase en archivos.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Agrega un nuevo registro de metadatos de archivo a Firestore.
 * Ruta: /archivosMetadata
 * @param {object} fileMetadata - Objeto con los metadatos del archivo (ej. nombre, tipo, URL si aplica).
 * @returns {Promise<string|null>} El ID del documento agregado o null si hubo un error.
 */
export async function addFileMetadata(fileMetadata) {
    try {
        const { db } = await getFirestoreInstances();
        const filesCollectionRef = collection(db, `archivosMetadata`); // Ruta modificada
        const docRef = await addDoc(filesCollectionRef, fileMetadata);
        console.log('Metadatos de archivo agregados con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar metadatos de archivo:', error);
        return null;
    }
}

/**
 * Obtiene todos los metadatos de archivos de Firestore.
 * Ruta: /archivosMetadata
 * @returns {Promise<Array<object>>} Un array de objetos de metadatos de archivo.
 */
export async function getAllFileMetadata() {
    try {
        const { db } = await getFirestoreInstances();
        const filesCollectionRef = collection(db, `archivosMetadata`); // Ruta modificada
        const querySnapshot = await getDocs(filesCollectionRef);
        const files = [];
        querySnapshot.forEach((doc) => {
            files.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los metadatos de archivos obtenidos:', files);
        return files;
    } catch (error) {
        console.error('Error al obtener metadatos de archivos:', error);
        return [];
    }
}

/**
 * Elimina un registro de metadatos de archivo de Firestore.
 * Ruta: /archivosMetadata
 * @param {string} fileId - ID del documento de metadatos a eliminar.
 * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario.
 */
export async function deleteFileMetadata(fileId) {
    try {
        const { db } = await getFirestoreInstances();
        const fileDocRef = doc(db, `archivosMetadata`, fileId); // Ruta modificada
        await deleteDoc(fileDocRef);
        console.log('Metadatos de archivo eliminados con éxito. ID:', fileId);
        return true;
    } catch (error) {
        console.error('Error al eliminar metadatos de archivo:', error);
        return false;
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de archivos dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de archivos.
 */
export async function renderArchivosSection(container) {
    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Archivos</h2>

            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Listado de Archivos (Metadatos en Firestore)</h3>

                <div class="mb-4">
                    <input type="text" id="file-name-input" placeholder="Nombre del archivo (ej. Informe Mensual)" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-2">
                    <input type="text" id="file-url-input" placeholder="URL del archivo (opcional)" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-2">
                    <textarea id="file-description-input" placeholder="Descripción (opcional)" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-2"></textarea>
                    <button id="btn-add-file-metadata" class="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Metadatos de Archivo
                    </button>
                </div>

                <div id="archivos-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md mt-6">
                    <!-- Los archivos se mostrarán aquí -->
                    <p class="text-gray-500">Cargando metadatos de archivos...</p>
                </div>

                <button id="btn-back-archivos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-archivos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const archivosListDiv = container.querySelector('#archivos-list');
    const fileNameInput = container.querySelector('#file-name-input');
    const fileUrlInput = container.querySelector('#file-url-input');
    const fileDescriptionInput = container.querySelector('#file-description-input');
    const btnAddFileMetadata = container.querySelector('#btn-add-file-metadata');
    const btnBack = container.querySelector('#btn-back-archivos');
    const closeArchivosModalBtn = container.querySelector('#close-archivos-modal');

    let currentFiles = []; // Para almacenar los metadatos de archivos actuales

    // Función para renderizar la lista de metadatos de archivos
    const renderFilesList = (filesToRender) => {
        archivosListDiv.innerHTML = ''; // Limpiar lista
        if (filesToRender.length === 0) {
            archivosListDiv.innerHTML = '<p class="text-gray-500">No hay metadatos de archivos para mostrar aún.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-200';
        filesToRender.forEach(file => {
            const li = document.createElement('li');
            li.className = 'py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center';
            li.innerHTML = `
                <div>
                    <p class="font-semibold">${file.name || 'Sin Nombre'}</p>
                    <p class="text-sm text-gray-600">Descripción: ${file.description || 'N/A'}</p>
                    ${file.url ? `<p class="text-sm text-blue-600 hover:underline"><a href="${file.url}" target="_blank" rel="noopener noreferrer">Ver Archivo</a></p>` : ''}
                </div>
                <button class="mt-2 sm:mt-0 sm:ml-4 bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 transition duration-200 delete-file-btn" data-file-id="${file.id}">Eliminar</button>
            `;
            ul.appendChild(li);
        });
        archivosListDiv.appendChild(ul);

        // Añadir event listeners a los botones de eliminar
        archivosListDiv.querySelectorAll('.delete-file-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const fileId = event.target.dataset.fileId;
                if (confirm('¿Estás seguro de que quieres eliminar este registro de archivo?')) {
                    const deleted = await deleteFileMetadata(fileId);
                    if (deleted) {
                        alert('Registro de archivo eliminado con éxito.');
                        await loadFiles(); // Recargar la lista
                    } else {
                        alert('Fallo al eliminar el registro de archivo.');
                    }
                }
            });
        });
    };

    // Función para cargar y renderizar los archivos
    const loadFiles = async () => {
        archivosListDiv.innerHTML = '<p class="text-gray-500">Cargando metadatos de archivos...</p>';
        try {
            currentFiles = await getAllFileMetadata();
            renderFilesList(currentFiles);
        } catch (error) {
            console.error('Error al cargar metadatos de archivos:', error);
            archivosListDiv.innerHTML = '<p class="text-red-600">Error al cargar metadatos de archivos. Verifique los permisos.</p>';
        }
    };

    // Cargar archivos al abrir la sección
    loadFiles();

    // Lógica para añadir metadatos de archivo
    btnAddFileMetadata.addEventListener('click', async () => {
        const name = fileNameInput.value.trim();
        const url = fileUrlInput.value.trim();
        const description = fileDescriptionInput.value.trim();

        if (!name) {
            alert('Por favor, ingresa un nombre para el archivo.');
            return;
        }

        const newFile = {
            name: name,
            url: url,
            description: description,
            createdAt: new Date().toISOString()
        };

        const id = await addFileMetadata(newFile);
        if (id) {
            alert('Metadatos de archivo añadidos con éxito, ID: ' + id);
            fileNameInput.value = '';
            fileUrlInput.value = '';
            fileDescriptionInput.value = '';
            await loadFiles(); // Recargar la lista para mostrar el nuevo archivo
        } else {
            alert('Fallo al añadir metadatos de archivo.');
        }
    });

    // Lógica para cerrar el modal
    closeArchivosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });

    // Lógica para el botón "Volver"
    btnBack.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });
}
