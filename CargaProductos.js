// CargaProductos.js
// Este archivo gestiona la creación de nuevas cargas de productos,
// asignándolas a un vehículo específico y guardándolas en la colección 'Inventario'.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { verInventarioCompleto } from './inventario.js'; // Para obtener la lista de productos
import { obtenerTodosLosVehiculos } from './CargasyVehiculos.js'; // Para obtener la lista de vehículos

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
 * Guarda una nueva carga de productos en Firestore.
 * Los datos se guardarán en la colección 'Inventario' en la raíz.
 * @param {string} vehiculoId - El ID del vehículo al que se asigna la carga.
 * @param {string} vehiculoMarca - Marca del vehículo.
 * @param {string} vehiculoModelo - Modelo del vehículo.
 * @param {string} vehiculoPlaca - Placa del vehículo.
 * @param {Array<object>} productosCargados - Array de objetos de productos con sus cantidades.
 * @returns {Promise<string|null>} El ID del documento de la carga agregada o null si hubo un error.
 */
async function guardarNuevaCarga(vehiculoId, vehiculoMarca, vehiculoModelo, vehiculoPlaca, productosCargados) {
    console.log('guardarNuevaCarga: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        // La ruta de la colección es directamente 'Inventario'
        const inventarioCollectionRef = collection(db, `Inventario`);
        const cargaData = {
            fechaCarga: new Date().toISOString(), // Fecha y hora de la carga en formato ISO
            vehiculoId: vehiculoId,
            vehiculoMarca: vehiculoMarca,
            vehiculoModelo: vehiculoModelo,
            vehiculoPlaca: vehiculoPlaca,
            productos: productosCargados,
            estadoCarga: "Cargado" // Estado inicial de la carga
        };
        const docRef = await addDoc(inventarioCollectionRef, cargaData);
        console.log('Carga de productos agregada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al guardar carga de productos:', error);
        return null;
    } finally {
        console.log('guardarNuevaCarga: Finalizado.');
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de Carga de Productos.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de la aplicación.
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

            <div id="carga-productos-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-nueva-carga" class="bg-pink-600 text-white p-4 rounded-md font-semibold hover:bg-pink-700 transition duration-200">
                    Nueva Carga
                </button>
                <!-- Otros botones de Carga Productos se añadirán aquí en el futuro -->
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="carga-productos-sub-section" class="mt-8">
                <!-- El contenido de "Nueva Carga" se cargará aquí -->
            </div>

            <button id="btn-back-carga-productos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver al Menú Principal
            </button>

            <!-- Botón para cerrar el modal -->
            <button id="close-carga-productos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const cargaProductosMainButtonsContainer = container.querySelector('#carga-productos-main-buttons-container');
    const cargaProductosSubSection = container.querySelector('#carga-productos-sub-section');
    const btnBack = container.querySelector('#btn-back-carga-productos');
    const closeCargaProductosModalBtn = container.querySelector('#close-carga-productos-modal');

    const btnNuevaCarga = container.querySelector('#btn-nueva-carga');

    // Función para mostrar los botones principales y limpiar la sub-sección
    function showCargaProductosMainButtons() {
        cargaProductosSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        cargaProductosMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    }

    // Lógica para cerrar el modal
    if (closeCargaProductosModalBtn) {
        closeCargaProductosModalBtn.addEventListener('click', () => {
            console.log('Cerrar modal de Carga de Productos clickeado. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden'); // Oculta el modal
            backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
        });
    }

    // Lógica para el botón "Volver al Menú Principal"
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('Botón "Volver al Menú Principal" clickeado en Carga de Productos. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden'); // Oculta el modal
            backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
        });
    }

    // Lógica para mostrar la sección de "Nueva Carga"
    if (btnNuevaCarga) {
        btnNuevaCarga.addEventListener('click', async () => {
            console.log('Botón "Nueva Carga" clickeado.');
            cargaProductosMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderNuevaCargaForm(cargaProductosSubSection, showCargaProductosMainButtons);
        });
    }

    // --- Funciones para el formulario de "Nueva Carga" ---
    /**
     * Renderiza el formulario para una nueva carga de productos.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de Carga de Productos.
     */
    async function renderNuevaCargaForm(parentContainer, backToMainMenuCallback) {
        console.log('renderNuevaCargaForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-pink-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-pink-800 mb-4">Nueva Carga de Productos</h3>

                <div class="mb-4">
                    <label for="select-camion" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Camión:</label>
                    <select id="select-camion" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                        <option value="">-- Selecciona un Camión --</option>
                    </select>
                </div>

                <input type="text" id="search-productos-carga-input" placeholder="Buscar producto por Segmento, Producto, Presentación..." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4 mt-4">

                <div id="productos-carga-table-container" class="max-h-96 overflow-y-auto bg-white p-3 rounded-md border border-gray-200 shadow-md">
                    <p class="text-gray-500">Cargando productos disponibles...</p>
                </div>

                <button id="btn-guardar-carga" class="mt-6 w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Guardar Carga
                </button>
                <button id="btn-back-nueva-carga" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const selectCamion = parentContainer.querySelector('#select-camion');
        const searchInput = parentContainer.querySelector('#search-productos-carga-input');
        const tableContainer = parentContainer.querySelector('#productos-carga-table-container');
        const btnGuardarCarga = parentContainer.querySelector('#btn-guardar-carga');
        const btnBackNuevaCarga = parentContainer.querySelector('#btn-back-nueva-carga');

        let allProducts = await verInventarioCompleto(); // Obtener todos los productos del inventario
        let allVehiculos = await obtenerTodosLosVehiculos(); // Obtener todos los vehículos

        // Poblar el select de camiones
        if (selectCamion) {
            allVehiculos.forEach(vehiculo => {
                const option = document.createElement('option');
                option.value = vehiculo.id;
                option.textContent = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
                selectCamion.appendChild(option);
            });
        }

        const renderTable = (productsToRender) => {
            tableContainer.innerHTML = '';
            if (productsToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay productos disponibles para cargar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio ($)</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            productsToRender.forEach(product => {
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Segmento || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(product.Precio || 0).toFixed(2)}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <input type="number" step="1" min="0" value="0" class="w-20 p-1 border border-gray-300 rounded-md text-center cantidad-input" data-product-id="${product.id}">
                        </td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;
        };

        renderTable(allProducts);

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredProducts = allProducts.filter(product =>
                    (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm)) ||
                    (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                    (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm))
                );
                renderTable(filteredProducts);
            });
        }

        if (btnGuardarCarga) {
            btnGuardarCarga.addEventListener('click', async () => {
                const selectedVehiculoId = selectCamion?.value;
                if (!selectedVehiculoId) {
                    showCustomAlert('Por favor, selecciona un camión antes de guardar la carga.');
                    return;
                }

                const selectedVehiculo = allVehiculos.find(v => v.id === selectedVehiculoId);
                if (!selectedVehiculo) {
                    showCustomAlert('Error: Camión seleccionado no encontrado.');
                    return;
                }

                const cantidadInputs = tableContainer.querySelectorAll('.cantidad-input');
                const productosCargados = [];

                cantidadInputs.forEach(input => {
                    const productId = input.dataset.productId;
                    const cantidad = parseInt(input.value);

                    if (cantidad > 0) {
                        const product = allProducts.find(p => p.id === productId);
                        if (product) {
                            productosCargados.push({
                                idProducto: product.id, // Guardar el ID del producto
                                Rubro: product.Rubro,
                                Segmento: product.Segmento,
                                Producto: product.Producto,
                                Presentacion: product.Presentacion,
                                Precio: product.Precio,
                                Cantidad: cantidad
                            });
                        }
                    }
                });

                if (productosCargados.length > 0) {
                    const cargaId = await guardarNuevaCarga(
                        selectedVehiculo.id,
                        selectedVehiculo.marca,
                        selectedVehiculo.modelo,
                        selectedVehiculo.placa,
                        productosCargados
                    );
                    if (cargaId) {
                        showCustomAlert(`Carga guardada con éxito para el camión ${selectedVehiculo.marca} (${selectedVehiculo.placa}).`);
                        // Limpiar cantidades y volver a la vista principal de carga de productos
                        cantidadInputs.forEach(input => input.value = '0');
                        if (selectCamion) selectCamion.value = ''; // Limpiar selección de camión
                        backToMainMenuCallback();
                    } else {
                        showCustomAlert('Fallo al guardar la carga de productos.');
                    }
                } else {
                    showCustomAlert('Por favor, ingrese al menos una cantidad mayor a 0 para guardar la carga.');
                }
            });
        }

        if (btnBackNuevaCarga) {
            btnBackNuevaCarga.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderNuevaCargaForm: Finalizado.');
    }
    console.log('renderCargaProductosSection: Función completada.');
}
