// CargaProductos.js
// Este archivo gestiona la carga de productos en vehículos,
// permitiendo seleccionar un vehículo, un usuario, y añadir productos con sus cantidades.
// Al guardar, la información completa de la carga se guarda en Firestore y se exporta a un archivo JSON.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { obtenerTodosLosVehiculos, obtenerTodosLosUsuarios } from './CargasyVehiculos.js';
import { verInventarioCompleto } from './inventario.js';

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en CargaProductos.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en CargaProductos.js.');
        throw new Error('Firebase DB no disponible.');
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Muestra un modal de alerta personalizado.
 * @param {string} message - El mensaje a mostrar en el modal.
 */
function showCustomAlert(message) {
    const modalId = 'custom-alert-modal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[9999] p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto">
                <p class="text-lg font-semibold text-gray-800 mb-4" id="alert-message"></p>
                <div class="flex justify-end">
                    <button id="alert-ok-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.querySelector('#alert-message').textContent = message;
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 50);

    const okBtn = modal.querySelector('#alert-ok-btn');
    const oldOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(oldOkBtn, okBtn);
    const newOkBtn = document.getElementById('alert-ok-btn');

    const cleanup = () => {
        if (modal && modal.parentNode) {
            modal.remove();
        }
    };

    newOkBtn.addEventListener('click', cleanup);
}

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} message - El mensaje a mostrar en el modal.
 * @returns {Promise<boolean>} Resuelve a true si el usuario confirma, false si cancela.
 */
function showCustomConfirm(message) {
    return new Promise(resolve => {
        const modalId = 'custom-confirm-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[9999] p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-auto">
                    <p class="text-lg font-semibold text-gray-800 mb-4" id="confirm-message"></p>
                    <div class="flex justify-end space-x-3">
                        <button id="confirm-no-btn" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200">No</button>
                        <button id="confirm-yes-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200">Sí</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector('#confirm-message').textContent = message;
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 50);

        const yesBtn = modal.querySelector('#confirm-yes-btn');
        const noBtn = modal.querySelector('#confirm-no-btn');

        const oldYesBtn = yesBtn.cloneNode(true);
        const oldNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(oldYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(oldNoBtn, noBtn);

        const newYesBtn = document.getElementById('confirm-yes-btn');
        const newNoBtn = document.getElementById('confirm-no-btn');


        const cleanup = () => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
        };

        const onYesClick = () => {
            cleanup();
            resolve(true);
        };

        const onNoClick = () => {
            cleanup();
            resolve(false);
        };

        newYesBtn.addEventListener('click', onYesClick);
        newNoBtn.addEventListener('click', onNoClick);
    });
}

/**
 * Guarda la información de una carga de productos en Firestore.
 * @param {object} cargaData - Objeto con los detalles de la carga (vehículo, usuario, productos).
 * @returns {Promise<string|null>} El ID del documento de la carga agregada o null si hubo un error.
 */
async function guardarCarga(cargaData) {
    console.log('guardarCarga: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const cargasCollectionRef = collection(db, `CargasDeProductos`); // Nueva colección para las cargas
        const docRef = await addDoc(cargasCollectionRef, cargaData);
        console.log('Carga de productos guardada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al guardar la carga de productos:', error);
        return null;
    } finally {
        console.log('guardarCarga: Finalizado.');
    }
}

/**
 * Genera y descarga un archivo JSON con los datos de la carga.
 * @param {object} cargaData - Los datos completos de la carga.
 */
function generateCargaFile(cargaData) {
    const filename = `carga_${cargaData.vehiculoPlaca}_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonString = JSON.stringify(cargaData, null, 2); // Formato JSON legible
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showCustomAlert(`Archivo de carga "${filename}" generado y descargado.`);
    } else {
        showCustomAlert('Su navegador no soporta la descarga directa de archivos. Los datos de la carga se han copiado a la consola.');
        console.log(jsonString);
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de Carga de Productos.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal.
 */
export async function renderCargaProductosSection(container, backToMainMenuCallback) {
    console.log('renderCargaProductosSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderCargaProductosSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Carga de Productos</h2>

            <div class="p-6 bg-pink-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-pink-800 mb-4">Registrar Nueva Carga</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="select-vehiculo-carga" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Camión:</label>
                        <select id="select-vehiculo-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <option value="">-- Selecciona un Camión --</option>
                        </select>
                    </div>
                    <div>
                        <label for="select-usuario-carga" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Usuario:</label>
                        <select id="select-usuario-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <option value="">-- Selecciona un Usuario --</option>
                        </select>
                    </div>
                </div>

                <div class="mb-4">
                    <label for="search-productos-carga" class="block text-sm font-medium text-gray-700 mb-1">Buscar y Añadir Productos:</label>
                    <input type="text" id="search-productos-carga" placeholder="Buscar producto por nombre, presentación..." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                    <select id="select-producto-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mt-2" disabled>
                        <option value="">-- Selecciona un Producto --</option>
                    </select>
                    <input type="number" id="cantidad-producto-carga" placeholder="Cantidad" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mt-2" min="1" value="1">
                    <button id="btn-add-producto-to-carga" class="mt-2 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200" disabled>
                        Añadir Producto a la Carga
                    </button>
                </div>

                <div id="productos-en-carga-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto shadow-md mb-4">
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">Productos en la Carga:</h4>
                    <ul id="lista-productos-carga" class="divide-y divide-gray-100">
                        <li class="text-gray-500">No hay productos añadidos aún.</li>
                    </ul>
                </div>

                <button id="btn-guardar-carga" class="mt-6 w-full bg-pink-600 text-white p-3 rounded-md font-semibold hover:bg-pink-700 transition duration-200">
                    Guardar Carga y Generar Archivo
                </button>
                <button id="btn-back-carga-productos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal
                </button>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-carga-productos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const selectVehiculoCarga = container.querySelector('#select-vehiculo-carga');
    const selectUsuarioCarga = container.querySelector('#select-usuario-carga');
    const searchProductosCarga = container.querySelector('#search-productos-carga');
    const selectProductoCarga = container.querySelector('#select-producto-carga');
    const cantidadProductoCarga = container.querySelector('#cantidad-producto-carga');
    const btnAddProductoToCarga = container.querySelector('#btn-add-producto-to-carga');
    const listaProductosCarga = container.querySelector('#lista-productos-carga');
    const btnGuardarCarga = container.querySelector('#btn-guardar-carga');
    const btnBack = container.querySelector('#btn-back-carga-productos');
    const closeCargaProductosModalBtn = container.querySelector('#close-carga-productos-modal');

    let allVehiculos = [];
    let allUsuarios = [];
    let allProductsInventario = []; // Todos los productos del inventario
    let productosEnCarga = []; // Productos actualmente seleccionados para la carga

    let selectedVehiculo = null;
    let selectedUsuario = null;

    // --- Cargar datos iniciales ---
    try {
        allVehiculos = await obtenerTodosLosVehiculos();
        allVehiculos.forEach(vehiculo => {
            const option = document.createElement('option');
            option.value = vehiculo.id;
            option.textContent = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
            selectVehiculoCarga.appendChild(option);
        });

        allUsuarios = await obtenerTodosLosUsuarios();
        allUsuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = `${usuario.nombre} ${usuario.apellido}`;
            selectUsuarioCarga.appendChild(option);
        });

        allProductsInventario = await verInventarioCompleto();
        // Inicialmente no poblar selectProductoCarga, se hará con la búsqueda
        console.log('Datos iniciales cargados para Carga de Productos.');
    } catch (error) {
        console.error('Error al cargar datos iniciales para Carga de Productos:', error);
        showCustomAlert('Error al cargar datos necesarios. Por favor, intente de nuevo.');
    }

    // --- Event Listeners para selección principal ---
    selectVehiculoCarga.addEventListener('change', () => {
        selectedVehiculo = allVehiculos.find(v => v.id === selectVehiculoCarga.value);
        console.log('Vehículo seleccionado:', selectedVehiculo);
    });

    selectUsuarioCarga.addEventListener('change', () => {
        selectedUsuario = allUsuarios.find(u => u.id === selectUsuarioCarga.value);
        console.log('Usuario seleccionado:', selectedUsuario);
    });

    // --- Lógica de búsqueda y selección de productos ---
    searchProductosCarga.addEventListener('input', () => {
        const searchTerm = searchProductosCarga.value.toLowerCase();
        selectProductoCarga.innerHTML = '<option value="">-- Selecciona un Producto --</option>';
        selectProductoCarga.disabled = true;
        btnAddProductoToCarga.disabled = true;

        if (searchTerm.length > 2) { // Empezar a buscar después de 2 caracteres
            const filteredProducts = allProductsInventario.filter(product =>
                (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm)) ||
                (product.Rubro && product.Rubro.toLowerCase().includes(searchTerm)) ||
                (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm))
            );

            if (filteredProducts.length > 0) {
                filteredProducts.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.Producto} (${product.Presentacion}) - ${product.Rubro}/${product.Segmento}`;
                    selectProductoCarga.appendChild(option);
                });
                selectProductoCarga.disabled = false;
            }
        }
    });

    selectProductoCarga.addEventListener('change', () => {
        // Habilitar el botón de añadir si se selecciona un producto
        btnAddProductoToCarga.disabled = !selectProductoCarga.value;
    });

    // --- Lógica para añadir producto a la carga ---
    btnAddProductoToCarga.addEventListener('click', () => {
        const productId = selectProductoCarga.value;
        const cantidad = parseInt(cantidadProductoCarga.value);

        if (!productId || isNaN(cantidad) || cantidad <= 0) {
            showCustomAlert('Por favor, selecciona un producto e ingresa una cantidad válida (mayor a 0).');
            return;
        }

        const productToAdd = allProductsInventario.find(p => p.id === productId);
        if (productToAdd) {
            // Verificar si el producto ya está en la carga
            const existingProductIndex = productosEnCarga.findIndex(item => item.idProducto === productId);

            if (existingProductIndex !== -1) {
                // Si ya existe, actualizar la cantidad
                productosEnCarga[existingProductIndex].Cantidad += cantidad;
            } else {
                // Si no existe, añadirlo
                productosEnCarga.push({
                    idProducto: productToAdd.id,
                    Producto: productToAdd.Producto,
                    Presentacion: productToAdd.Presentacion,
                    Rubro: productToAdd.Rubro,
                    Segmento: productToAdd.Segmento,
                    Precio: productToAdd.Precio, // Incluir el precio actual del producto
                    Cantidad: cantidad
                });
            }
            renderProductosEnCarga();
            // Limpiar campos después de añadir
            searchProductosCarga.value = '';
            selectProductoCarga.innerHTML = '<option value="">-- Selecciona un Producto --</option>';
            selectProductoCarga.disabled = true;
            cantidadProductoCarga.value = '1';
            btnAddProductoToCarga.disabled = true;
        } else {
            showCustomAlert('Producto no encontrado en el inventario.');
        }
    });

    // --- Renderizar productos en la lista de carga ---
    function renderProductosEnCarga() {
        listaProductosCarga.innerHTML = '';
        if (productosEnCarga.length === 0) {
            listaProductosCarga.innerHTML = '<li class="text-gray-500">No hay productos añadidos aún.</li>';
            return;
        }

        productosEnCarga.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center py-2 px-1 hover:bg-gray-50 rounded-md';
            listItem.innerHTML = `
                <span>
                    ${item.Producto} (${item.Presentacion}) - Cantidad: <span class="font-semibold">${item.Cantidad}</span>
                </span>
                <button class="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600 remove-producto-carga-btn" data-index="${index}">
                    Eliminar
                </button>
            `;
            listaProductosCarga.appendChild(listItem);
        });

        // Añadir event listeners para eliminar productos de la carga
        listaProductosCarga.querySelectorAll('.remove-producto-carga-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index);
                productosEnCarga.splice(indexToRemove, 1); // Eliminar del array
                renderProductosEnCarga(); // Re-renderizar la lista
            });
        });
    }

    // --- Lógica para guardar la carga ---
    btnGuardarCarga.addEventListener('click', async () => {
        if (!selectedVehiculo) {
            showCustomAlert('Por favor, selecciona un camión para la carga.');
            return;
        }
        if (!selectedUsuario) {
            showCustomAlert('Por favor, selecciona un usuario para la carga.');
            return;
        }
        if (productosEnCarga.length === 0) {
            showCustomAlert('Por favor, añade al menos un producto a la carga.');
            return;
        }

        const confirmed = await showCustomConfirm('¿Estás seguro de que quieres guardar esta carga?');
        if (!confirmed) {
            return;
        }

        const cargaData = {
            fechaCarga: new Date().toISOString(),
            vehiculoId: selectedVehiculo.id,
            vehiculoMarca: selectedVehiculo.marca,
            vehiculoModelo: selectedVehiculo.modelo,
            vehiculoPlaca: selectedVehiculo.placa,
            usuarioId: selectedUsuario.id,
            usuarioNombre: selectedUsuario.nombre,
            usuarioApellido: selectedUsuario.apellido,
            productos: productosEnCarga // Array de objetos de producto con sus cantidades
        };

        const cargaId = await guardarCarga(cargaData);
        if (cargaId) {
            showCustomAlert('Carga guardada con éxito. Generando archivo...');
            generateCargaFile(cargaData); // Generar el archivo
            // Limpiar el formulario después de guardar
            selectVehiculoCarga.value = '';
            selectUsuarioCarga.value = '';
            selectedVehiculo = null;
            selectedUsuario = null;
            productosEnCarga = [];
            renderProductosEnCarga();
        } else {
            showCustomAlert('Fallo al guardar la carga.');
        }
    });

    // --- Lógica para cerrar el modal ---
    closeCargaProductosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden');
        backToMainMenuCallback();
    });

    // --- Lógica para el botón "Volver" ---
    btnBack.addEventListener('click', () => {
        container.classList.add('hidden');
        backToMainMenuCallback();
    });

    console.log('renderCargaProductosSection: Función completada.');
}
