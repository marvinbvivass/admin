// archivos.js
// Este archivo gestiona la visualización y descarga de archivos generados.

// Importa las funciones necesarias de Firebase Storage.
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Función auxiliar para obtener la instancia de Firebase Storage y el ID de usuario/appId
async function getStorageInstances() {
    while (!window.firebaseApp || !window.currentUserId || !window.currentAppId) {
        console.log('Esperando inicialización de Firebase en archivos.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        storage: getStorage(window.firebaseApp),
        userId: window.currentUserId,
        appId: window.currentAppId
    };
}

/**
 * Lista los archivos en una ruta específica de Firebase Storage.
 * @param {string} path - La ruta dentro del bucket (ej. 'clientes/', 'inventario_diario/2023-07-23/').
 * @returns {Promise<Array<object>>} Un array de objetos con nombre y URL de descarga de los archivos.
 */
export async function listarArchivos(path) {
    try {
        const { storage, userId, appId } = await getStorageInstances();
        // Construye la ruta completa en Storage
        const storagePath = `files/${appId}/users/${userId}/${path}`;
        const listRef = ref(storage, storagePath);
        const res = await listAll(listRef);

        const files = [];
        for (const itemRef of res.items) {
            // itemRef.name es el nombre del archivo (ej. 'clientes.csv')
            // itemRef.fullPath es la ruta completa (ej. 'files/appId/users/userId/clientes/clientes.csv')
            const downloadURL = await getDownloadURL(itemRef);
            files.push({ name: itemRef.name, url: downloadURL, fullPath: itemRef.fullPath });
        }
        console.log(`Archivos listados en ${storagePath}:`, files);
        return files;
    } catch (error) {
        console.error(`Error al listar archivos en ${path}:`, error);
        return [];
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-show-clientes-files" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Archivos de Clientes
                </button>
                <button id="btn-show-inventario-files" class="bg-indigo-600 text-white p-4 rounded-md font-semibold hover:bg-indigo-700 transition duration-200">
                    Archivos de Inventario
                </button>
                <button id="btn-show-inventario-diario-files" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200">
                    Inventario Diario
                </button>
                <button id="btn-show-ventas-cierre-files" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Cierre de Ventas Diario
                </button>
                <button id="btn-show-ventas-consolidadas-files" class="bg-teal-600 text-white p-4 rounded-md font-semibold hover:bg-teal-700 transition duration-200">
                    Ventas Consolidadas
                </button>
                <button id="btn-show-ventas-por-cliente-files" class="bg-orange-600 text-white p-4 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                    Ventas por Cliente
                </button>
            </div>

            <!-- Contenedor para la lista de archivos de la sub-sección seleccionada -->
            <div id="files-list-container" class="mt-8 bg-white p-4 rounded-lg shadow-inner max-h-96 overflow-y-auto">
                <p class="text-gray-500 text-center">Selecciona una categoría para ver los archivos.</p>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-archivos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const filesListContainer = container.querySelector('#files-list-container');
    const closeArchivosModalBtn = container.querySelector('#close-archivos-modal');

    // Función para renderizar la lista de archivos en el contenedor
    const renderFilesList = (files, title) => {
        filesListContainer.innerHTML = `
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">${title}</h3>
            <ul class="divide-y divide-gray-200"></ul>
        `;
        const ul = filesListContainer.querySelector('ul');
        if (files.length === 0) {
            ul.innerHTML = '<li class="py-2 text-gray-500">No hay archivos disponibles en esta categoría.</li>';
            return;
        }

        files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'py-2 flex justify-between items-center';
            li.innerHTML = `
                <span class="text-gray-700">${file.name}</span>
                <a href="${file.url}" download="${file.name}" class="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition duration-200">Descargar</a>
            `;
            ul.appendChild(li);
        });
    };

    // Event Listeners para los botones de categoría de archivos
    container.querySelector('#btn-show-clientes-files').addEventListener('click', async () => {
        const files = await listarArchivos('clientes');
        renderFilesList(files, 'Archivos de Clientes');
    });

    container.querySelector('#btn-show-inventario-files').addEventListener('click', async () => {
        const files = await listarArchivos('inventario');
        renderFilesList(files, 'Archivos de Inventario (Actual)');
    });

    container.querySelector('#btn-show-inventario-diario-files').addEventListener('click', async () => {
        // Para inventario diario, podríamos añadir un selector de fecha o listar subcarpetas
        // Por ahora, listaremos todos los archivos directamente bajo 'inventario_diario'
        const files = await listarArchivos('inventario_diario');
        renderFilesList(files, 'Registros de Inventario Diario');
    });

    container.querySelector('#btn-show-ventas-cierre-files').addEventListener('click', async () => {
        const files = await listarArchivos('ventas_cierre');
        renderFilesList(files, 'Cierre de Ventas Diario');
    });

    container.querySelector('#btn-show-ventas-consolidadas-files').addEventListener('click', async () => {
        const files = await listarArchivos('ventas_consolidadas');
        renderFilesList(files, 'Ventas Consolidadas');
    });

    container.querySelector('#btn-show-ventas-por-cliente-files').addEventListener('click', async () => {
        const files = await listarArchivos('ventas_por_cliente');
        renderFilesList(files, 'Ventas por Cliente');
    });


    // Lógica para cerrar el modal
    closeArchivosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });
}
