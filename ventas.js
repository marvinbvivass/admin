// ventas.js
// Este archivo gestiona las operaciones de ventas, incluyendo la creación de nuevas ventas
// y la visualización de cierres diarios.
// Ahora permite seleccionar un camión para la venta, muestra el stock disponible de ese camión,
// valida la cantidad a vender y genera un archivo CSV detallado de la venta.
// Se añade la funcionalidad de "Cierre de Ventas Diarias" para consolidar y exportar ventas por día y usuario.
// ¡NUEVO! Se añade una sección para ver y gestionar archivos de ventas individuales (notas de entrega).

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { obtenerTodosLosClientes } from './clientes.js';
import { obtenerTodosLosVehiculos } from './CargasyVehiculos.js'; // Importa para obtener la lista de vehículos
import { verInventarioCompleto } from './inventario.js'; // Se mantiene para obtener la definición de todos los productos

// ID fijo para el documento de configuración de valores de cambio
const EXCHANGE_RATES_DOC_DOC_ID = 'exchangeRates';
const RUBRO_SEGMENTO_CONFIG_DOC_ID = 'rubrosSegmentos'; // Para obtener los rubros

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    // Esperar a que firebaseDb esté disponible, firebaseAuth esté cargado y haya un usuario autenticado
    while (!window.firebaseDb || !window.firebaseAuth || !window.firebaseAuth.currentUser && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase y autenticación en ventas.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb || !window.firebaseAuth || !window.firebaseAuth.currentUser) {
        console.error('ERROR: Firebase DB o autenticación no inicializados después de múltiples intentos en ventas.js.');
        throw new Error('Firebase DB o autenticación no disponibles.');
    }
    return {
        db: window.firebaseDb,
        auth: window.firebaseAuth, // También devolvemos la instancia de auth
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
 * Obtiene los valores de cambio (COP y BS) desde Firestore.
 * @returns {Promise<{cop: number, bs: number}>} Los valores de cambio o valores predeterminados.
 */
async function obtenerValoresDeCambio() {
    console.log('obtenerValoresDeCambio: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, EXCHANGE_RATES_DOC_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            const data = configSnap.data();
            console.log('Valores de cambio obtenidos:', data);
            return {
                cop: parseFloat(data.cop || 1), // Valor predeterminado 1 si no existe
                bs: parseFloat(data.bs || 1)   // Valor predeterminado 1 si no existe
            };
        } else {
            console.log('No se encontraron valores de cambio. Usando predeterminados (1:1).');
            return { cop: 1, bs: 1 };
        }
    } catch (error) {
        console.error('Error al obtener valores de cambio:', error);
        return { cop: 1, bs: 1 }; // Devuelve predeterminados en caso de error
    } finally {
        console.log('obtenerValoresDeCambio: Finalizado.');
    }
}

/**
 * Obtiene la configuración de rubros y segmentos desde Firebase.
 * @returns {Promise<object>} El mapa de rubros a segmentos.
 */
async function obtenerConfiguracionRubrosSegmentos() {
    console.log('obtenerConfiguracionRubrosSegmentos: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, RUBRO_SEGMENTO_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de rubros y segmentos obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de rubros y segmentos. Usando mapa vacío.');
            return {}; // Retorna un mapa vacío si no hay configuración
        }
    } catch (error) {
        console.error('Error al obtener configuración de rubros y segmentos:', error);
        return {};
    } finally {
        console.log('obtenerConfiguracionRubrosSegmentos: Finalizado.');
    }
}

/**
 * Guarda una nueva venta en Firestore.
 * @param {object} ventaData - Objeto con los datos de la venta.
 * @returns {Promise<string|null>} El ID del documento de la venta agregada o null si hubo un error.
 */
async function guardarVenta(ventaData) {
    console.log('guardarVenta: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const ventasCollectionRef = collection(db, `datosVentas`);
        // Añadir el ID del usuario actual a los datos de la venta
        ventaData.userId = window.currentUserId; 
        const docRef = await addDoc(ventasCollectionRef, ventaData);
        console.log('Venta guardada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al guardar venta:', error);
        return null;
    } finally {
        console.log('guardarVenta: Finalizado.');
    }
}

/**
 * Actualiza la cantidad de un producto en el inventario de un camión específico.
 * @param {string} vehiculoId - ID del vehículo cuyo inventario se va a actualizar.
 * @param {string} productId - ID del producto a actualizar.
 * @param {number} quantitySold - Cantidad vendida (se restará del inventario del camión).
 * @returns {Promise<boolean>} True si se actualizó con éxito, false en caso contrario.
 */
async function actualizarInventarioCamion(vehiculoId, productId, quantitySold) {
    console.log(`actualizarInventarioCamion: Actualizando producto ${productId} en camión ${vehiculoId} con cantidad vendida ${quantitySold}`);
    try {
        const { db } = await getFirestoreInstances();
        const productDocRef = doc(db, 'Vehiculos', vehiculoId, 'inventarioCamion', productId);
        const docSnap = await getDoc(productDocRef);

        if (docSnap.exists()) {
            const currentQuantity = docSnap.data().Cantidad || 0;
            const newQuantity = currentQuantity - quantitySold;
            
            if (newQuantity < 0) {
                console.warn(`Advertencia: La cantidad en inventario para ${productId} en el camión ${vehiculoId} sería negativa (${newQuantity}). No se actualizará a negativo.`);
                showCustomAlert(`Advertencia: No hay suficiente stock de "${docSnap.data().Producto} (${docSnap.data().Presentacion})" en el camión seleccionado. Cantidad disponible: ${currentQuantity}, Cantidad a vender: ${quantitySold}`);
                return false; // Indicar que no se pudo actualizar por stock insuficiente
            }

            await updateDoc(productDocRef, { Cantidad: newQuantity });
            console.log(`Inventario de producto ${productId} en camión ${vehiculoId} actualizado. Nueva cantidad: ${newQuantity}`);
            return true;
        } else {
            console.error(`Error: Producto ${productId} no encontrado en el inventario del camión ${vehiculoId} para actualizar.`);
            showCustomAlert(`Error: Producto no encontrado en el inventario del camión seleccionado para actualizar.`);
            return false;
        }
    } catch (error) {
        console.error('Error al actualizar inventario del camión:', error);
        return false;
    }
}

/**
 * Función auxiliar para escapar valores para CSV.
 * Solo envuelve en comillas si el valor contiene comas, comillas dobles o saltos de línea.
 * Escapa las comillas dobles dentro del valor.
 * @param {any} value - El valor a escapar.
 * @returns {string} El valor escapado para CSV.
 */
function escapeCsvValue(value) {
    if (value === undefined || value === null) {
        return '';
    }
    let stringValue = String(value);
    // Verificar si el valor contiene coma, comilla doble o salto de línea
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escapar comillas dobles dentro del valor con otra comilla doble
        stringValue = stringValue.replace(/"/g, '""');
        // Envolver el valor completo en comillas dobles
        return `"${stringValue}"`;
    }
    return stringValue; // No quoting needed
}

/**
 * Convierte los datos de la venta a formato CSV con un formato específico.
 * @param {object} ventaData - Los datos completos de la venta.
 * @returns {string} La cadena de texto en formato CSV.
 */
function convertToCsvVenta(ventaData) {
    const csvRows = [];

    // Fila 1: Información del camión
    // Formato: "Camion: Marca Modelo, Placa: XXX-YYY"
    const vehicleInfo = `Camion: ${ventaData.vehiculo.marca} ${ventaData.vehiculo.modelo}, Placa: ${ventaData.vehiculo.placa}`;
    csvRows.push(escapeCsvValue(vehicleInfo)); // Usar la función de escape

    // Fila 2: Información del cliente
    // Formato: "Cliente: Nombre Comercial, Rif: XXXXXXX-X"
    const clientInfo = `Cliente: ${ventaData.cliente.NombreComercial}, Rif: ${ventaData.cliente.Rif}`;
    csvRows.push(escapeCsvValue(clientInfo)); // Usar la función de escape

    // Fila 3: Cabecera de identificación de los productos
    const productHeaders = [
        "ProductoID",
        "ProductoNombre",
        "ProductoPresentacion",
        "ProductoRubro",
        "ProductoSegmento",
        "PrecioUnitarioUSD",
        "Cantidad",
        "SubtotalUSD"
    ];
    csvRows.push(productHeaders.map(header => escapeCsvValue(header)).join(',')); // Usar la función de escape

    // De la cuarta fila en adelante: Información de los productos y cantidades
    ventaData.productosVendidos.forEach(producto => {
        const row = [
            producto.idProducto,
            producto.Producto,
            producto.Presentacion,
            producto.Rubro,
            producto.Segmento,
            producto.PrecioUnitarioUSD,
            producto.Cantidad,
            producto.SubtotalUSD
        ];
        csvRows.push(row.map(value => escapeCsvValue(value)).join(',')); // Usar la función de escape
    });

    // Última fila: Total de la venta
    csvRows.push(`Total Venta USD:,${escapeCsvValue(ventaData.totalVentaUSD.toFixed(2))}`); // Usar la función de escape

    return csvRows.join('\n');
}

/**
 * Genera y descarga un archivo CSV con los datos de la venta.
 * @param {object} ventaData - Los datos completos de la venta.
 * @param {string} filenamePrefix - Prefijo para el nombre del archivo.
 */
function generateCsvFile(data, filename) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });

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
        showCustomAlert(`Archivo "${filename}" generado y descargado.`);
    } else {
        showCustomAlert('Su navegador no soporta la descarga directa de archivos. Los datos se han copiado a la consola.');
        console.log(data);
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de ventas.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de ventas.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de la aplicación.
 */
export async function renderVentasSection(container, backToMainMenuCallback) {
    console.log('renderVentasSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderVentasSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Ventas</h2>

            <div id="ventas-main-buttons-container" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button id="btn-nueva-venta" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Nueva Venta
                </button>
                <button id="btn-archivos-ventas" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Archivos de Ventas
                </button>
                <button id="btn-cierre-ventas-diarias" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Cierre de Ventas Diarias
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="ventas-sub-section" class="mt-8">
                <!-- El contenido de las sub-secciones se cargará aquí -->
            </div>

            <button id="btn-back-ventas" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver al Menú Principal
            </button>

            <!-- Botón para cerrar el modal -->
            <button id="close-ventas-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    console.log('renderVentasSection: HTML inyectado en el contenedor.');
    const ventasMainButtonsContainer = container.querySelector('#ventas-main-buttons-container');
    const ventasSubSection = container.querySelector('#ventas-sub-section');
    const btnBack = container.querySelector('#btn-back-ventas');
    const closeVentasModalBtn = container.querySelector('#close-ventas-modal');

    const btnNuevaVenta = container.querySelector('#btn-nueva-venta');
    const btnArchivosVentas = container.querySelector('#btn-archivos-ventas'); // Nuevo botón
    const btnCierreVentasDiarias = container.querySelector('#btn-cierre-ventas-diarias');

    // Cargar datos necesarios una vez
    let allClients = await obtenerTodosLosClientes();
    let allVehiculos = await obtenerTodosLosVehiculos(); // Obtener todos los vehículos
    let allProductsInventarioGeneral = await verInventarioCompleto(); // Todos los productos definidos
    let exchangeRates = await obtenerValoresDeCambio();
    let rubroSegmentoMap = await obtenerConfiguracionRubrosSegmentos();


    // Función para mostrar los botones principales y limpiar la sub-sección
    function showVentasMainButtons() {
        ventasSubSection.innerHTML = '';
        ventasMainButtonsContainer.classList.remove('hidden');
    }

    // Lógica para cerrar el modal
    if (closeVentasModalBtn) {
        closeVentasModalBtn.addEventListener('click', () => {
            console.log('Cerrar modal de Ventas clickeado. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Lógica para el botón "Volver al Menú Principal"
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('Botón "Volver al Menú Principal" clickeado en Ventas. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Lógica para el botón "Nueva Venta"
    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener('click', async () => {
            console.log('Botón "Nueva Venta" clickeado.');
            ventasMainButtonsContainer.classList.add('hidden');
            await renderNuevaVentaForm(ventasSubSection, showVentasMainButtons, allClients, allVehiculos, allProductsInventarioGeneral, exchangeRates, rubroSegmentoMap);
        });
    }

    // Lógica para el nuevo botón "Archivos de Ventas"
    if (btnArchivosVentas) {
        btnArchivosVentas.addEventListener('click', async () => {
            console.log('Botón "Archivos de Ventas" clickeado.');
            ventasMainButtonsContainer.classList.add('hidden');
            await renderArchivosVentasSection(ventasSubSection, showVentasMainButtons);
        });
    }

    // Lógica para el botón "Cierre de Ventas Diarias"
    if (btnCierreVentasDiarias) {
        btnCierreVentasDiarias.addEventListener('click', async () => {
            console.log('Botón "Cierre de Ventas Diarias" clickeado.');
            ventasMainButtonsContainer.classList.add('hidden');
            await renderCierreVentasDiarias(ventasSubSection, showVentasMainButtons, allProductsInventarioGeneral);
        });
    }

    // --- Funciones para el formulario de Nueva Venta ---
    /**
     * Renderiza el formulario para registrar una nueva venta.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de ventas.
     * @param {Array<object>} clients - Lista de todos los clientes.
     * @param {Array<object>} vehiculos - Lista de todos los vehículos.
     * @param {Array<object>} allProductsGeneral - Lista de todos los productos definidos en el inventario general.
     * @param {object} rates - Valores de cambio actuales (USD, COP, Bs).
     * @param {object} rubroMap - Mapa de rubros y segmentos.
     */
    async function renderNuevaVentaForm(parentContainer, backToMainMenuCallback, clients, vehiculos, allProductsGeneral, rates, rubroMap) {
        console.log('renderNuevaVentaForm: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Registrar Nueva Venta</h3>

                <div class="mb-4">
                    <label for="select-cliente-venta" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Cliente:</label>
                    <input type="text" id="search-cliente-venta" placeholder="Buscar cliente por Nombre Comercial, Rif, Zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2">
                    <select id="select-cliente-venta" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">-- Selecciona un Cliente --</option>
                        ${clients.map(client => `<option value="${client.id}">${client.NombreComercial} (${client.Rif}) - ${client.Zona}, ${client.Sector}</option>`).join('')}
                    </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label for="select-camion-venta" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Camión:</label>
                        <select id="select-camion-venta" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">-- Selecciona un Camión --</option>
                            ${vehiculos.map(vehiculo => `<option value="${vehiculo.id}">${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="filter-rubro-venta" class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Rubro:</label>
                        <select id="filter-rubro-venta" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">Todos los Rubros</option>
                            ${Object.keys(rubroMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="currency-select" class="block text-sm font-medium text-gray-700 mb-1">Mostrar Precios en:</label>
                        <select id="currency-select" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="USD">USD</option>
                            <option value="COP">COP</option>
                            <option value="Bs">Bs.</option>
                        </select>
                    </div>
                </div>

                <div id="productos-venta-table-container" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md mb-4">
                    <p class="text-gray-500">Selecciona un camión para ver los productos disponibles para la venta.</p>
                </div>

                <div class="flex justify-between items-center bg-gray-100 p-4 rounded-md mb-4">
                    <span class="text-lg font-semibold text-gray-800">Total de la Venta:</span>
                    <span id="total-venta" class="text-2xl font-bold text-green-700">$0.00 USD</span>
                </div>

                <button id="btn-confirmar-venta" class="mt-6 w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Confirmar Venta
                </button>
                <button id="btn-back-nueva-venta" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchClienteInput = parentContainer.querySelector('#search-cliente-venta');
        const selectClienteVenta = parentContainer.querySelector('#select-cliente-venta');
        const selectCamionVenta = parentContainer.querySelector('#select-camion-venta'); // Nuevo selector de camión
        const filterRubroVenta = parentContainer.querySelector('#filter-rubro-venta');
        const currencySelect = parentContainer.querySelector('#currency-select');
        const productosVentaTableContainer = parentContainer.querySelector('#productos-venta-table-container');
        const totalVentaSpan = parentContainer.querySelector('#total-venta');
        const btnConfirmarVenta = parentContainer.querySelector('#btn-confirmar-venta');
        const btnBack = parentContainer.querySelector('#btn-back-nueva-venta');

        let selectedClient = null;
        let selectedTruck = null; // Nuevo: camión seleccionado
        let currentTruckInventory = []; // Inventario del camión actualmente seleccionado
        let displayedProductsForSale = []; // Productos actualmente mostrados en la tabla (filtrados)

        // Función para filtrar clientes en el select
        const filterClientSelect = () => {
            const searchTerm = searchClienteInput.value.toLowerCase();
            selectClienteVenta.innerHTML = '<option value="">-- Selecciona un Cliente --</option>';
            const filteredClients = clients.filter(client =>
                (client.NombreComercial && client.NombreComercial.toLowerCase().includes(searchTerm)) ||
                (client.Rif && client.Rif.toLowerCase().includes(searchTerm)) ||
                (client.Zona && client.Zona.toLowerCase().includes(searchTerm)) ||
                (client.Sector && client.Sector.toLowerCase().includes(searchTerm))
            );
            filteredClients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.NombreComercial} (${client.Rif}) - ${client.Zona}, ${client.Sector}`;
                selectClienteVenta.appendChild(option);
            });
        };

        // Inicializar el filtro de clientes
        filterClientSelect();
        searchClienteInput.addEventListener('input', filterClientSelect);

        // Lógica para seleccionar cliente
        selectClienteVenta.addEventListener('change', () => {
            selectedClient = clients.find(c => c.id === selectClienteVenta.value);
            console.log('Cliente seleccionado:', selectedClient);
        });

        // Lógica para seleccionar camión y cargar su inventario
        selectCamionVenta.addEventListener('change', async () => {
            selectedTruck = vehiculos.find(v => v.id === selectCamionVenta.value);
            console.log('Camión seleccionado:', selectedTruck);
            if (selectedTruck) {
                const { db } = await getFirestoreInstances();
                const inventarioCamionSnapshot = await getDocs(collection(db, 'Vehiculos', selectedTruck.id, 'inventarioCamion'));
                currentTruckInventory = [];
                inventarioCamionSnapshot.forEach(doc => {
                    currentTruckInventory.push({ id: doc.id, ...doc.data() });
                });
                console.log('Inventario del camión cargado:', currentTruckInventory);
            } else {
                currentTruckInventory = [];
            }
            applyProductFilters(); // Aplicar filtros para mostrar productos del camión
        });

        // Lógica de filtrado de productos por rubro y búsqueda
        const applyProductFilters = () => {
            const selectedRubro = filterRubroVenta.value;
            
            // Si no hay camión seleccionado, no mostrar productos
            if (!selectedTruck) {
                productosVentaTableContainer.innerHTML = '<p class="text-gray-500">Selecciona un camión para ver los productos disponibles para la venta.</p>';
                displayedProductsForSale = [];
            } else {
                displayedProductsForSale = currentTruckInventory.filter(product => {
                    const matchesRubro = !selectedRubro || (product.Rubro === selectedRubro);
                    // Aquí podrías añadir un filtro por texto si tuvieras un input de búsqueda de productos
                    // const matchesSearch = (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) || ...
                    return matchesRubro;
                });
            }
            renderProductsForSaleTable(displayedProductsForSale);
            calculateTotal(); // Recalcular total al cambiar productos
        };

        filterRubroVenta.addEventListener('change', applyProductFilters);
        currencySelect.addEventListener('change', () => {
            renderProductsForSaleTable(displayedProductsForSale); // Re-renderizar tabla con nueva moneda
            calculateTotal(); // Recalcular total con nueva moneda
        });


        // Renderizar la tabla de productos para la venta
        const renderProductsForSaleTable = (productsToRender) => {
            productosVentaTableContainer.innerHTML = '';
            if (!selectedTruck) {
                productosVentaTableContainer.innerHTML = '<p class="text-gray-500">Selecciona un camión para ver los productos disponibles para la venta.</p>';
                return;
            }
            if (productsToRender.length === 0) {
                productosVentaTableContainer.innerHTML = '<p class="text-gray-500">No hay productos disponibles en este camión o no coinciden con los filtros.</p>';
                return;
            }

            const selectedCurrency = currencySelect.value;
            const copRate = rates.cop;
            const bsRate = rates.bs;

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio (${selectedCurrency})</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disp.</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal (${selectedCurrency})</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            productsToRender.forEach(product => {
                const precioUSD = product.Precio || 0;
                let displayPrice = precioUSD;
                let currencySymbol = '$';

                if (selectedCurrency === 'COP') {
                    displayPrice = (precioUSD * copRate);
                    currencySymbol = 'COP ';
                } else if (selectedCurrency === 'Bs') {
                    displayPrice = (precioUSD * bsRate);
                    currencySymbol = 'Bs. ';
                }

                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Segmento || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${currencySymbol}${displayPrice.toFixed(2)}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Cantidad || 0}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <input type="number" min="0" max="${product.Cantidad || 0}" value="0" class="w-24 p-1 border border-gray-300 rounded-md text-center cantidad-venta-input" data-product-id="${product.id}" data-price-usd="${precioUSD}" data-available-quantity="${product.Cantidad || 0}">
                        </td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 subtotal-cell">${currencySymbol}0.00</td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            productosVentaTableContainer.innerHTML = tableHTML;

            // Añadir event listeners a los inputs de cantidad para calcular subtotales y total
            productosVentaTableContainer.querySelectorAll('.cantidad-venta-input').forEach(input => {
                input.addEventListener('input', (event) => {
                    let quantity = parseInt(event.target.value) || 0;
                    const availableQuantity = parseInt(event.target.dataset.availableQuantity) || 0;

                    // Validar que la cantidad no exceda la disponible
                    if (quantity > availableQuantity) {
                        showCustomAlert(`La cantidad no puede ser mayor que la disponible (${availableQuantity}).`);
                        quantity = availableQuantity; // Ajustar la cantidad al máximo disponible
                        event.target.value = quantity; // Actualizar el input
                    }
                    if (quantity < 0) {
                        quantity = 0;
                        event.target.value = quantity;
                    }

                    const priceUSD = parseFloat(event.target.dataset.priceUsd);
                    
                    let subtotalUSD = quantity * priceUSD;
                    let displaySubtotal = subtotalUSD;
                    let currencySymbol = '$';

                    if (selectedCurrency === 'COP') {
                        displaySubtotal = (subtotalUSD * copRate);
                        currencySymbol = 'COP ';
                    } else if (selectedCurrency === 'Bs') {
                        displaySubtotal = (subtotalUSD * bsRate);
                        currencySymbol = 'Bs. ';
                    }

                    const subtotalCell = event.target.closest('tr').querySelector('.subtotal-cell');
                    if (subtotalCell) {
                        subtotalCell.textContent = `${currencySymbol}${displaySubtotal.toFixed(2)}`;
                    }
                    calculateTotal();
                });
            });
        };

        // Función para calcular el total de la venta
        const calculateTotal = () => {
            let grandTotalUSD = 0;
            const cantidadInputs = productosVentaTableContainer.querySelectorAll('.cantidad-venta-input');
            cantidadInputs.forEach(input => {
                const quantity = parseInt(input.value) || 0;
                const priceUSD = parseFloat(input.dataset.priceUsd);
                grandTotalUSD += (quantity * priceUSD);
            });

            const selectedCurrency = currencySelect.value;
            const copRate = rates.cop;
            const bsRate = rates.bs;

            let displayTotal = grandTotalUSD;
            let currencySymbol = '$';

            if (selectedCurrency === 'COP') {
                displayTotal = (grandTotalUSD * copRate);
                currencySymbol = 'COP ';
            } else if (selectedCurrency === 'Bs') {
                displayTotal = (grandTotalUSD * bsRate);
                currencySymbol = 'Bs. ';
            }
            totalVentaSpan.textContent = `${currencySymbol}${displayTotal.toFixed(2)} ${selectedCurrency === 'USD' ? 'USD' : ''}`;
        };

        // Lógica para confirmar la venta
        if (btnConfirmarVenta) {
            btnConfirmarVenta.addEventListener('click', async () => {
                if (!selectedClient) {
                    showCustomAlert('Por favor, selecciona un cliente para la venta.');
                    return;
                }
                if (!selectedTruck) {
                    showCustomAlert('Por favor, selecciona un camión del cual se realizará la venta.');
                    return;
                }

                const productosVendidos = [];
                const cantidadInputs = productosVentaTableContainer.querySelectorAll('.cantidad-venta-input');
                let totalVentaUSD = 0;
                let hasInsufficientStock = false;

                // Primera pasada para validar stock antes de procesar la venta
                for (const input of cantidadInputs) {
                    const productId = input.dataset.productId;
                    const cantidad = parseInt(input.value) || 0;
                    const availableQuantity = parseInt(input.dataset.availableQuantity) || 0;

                    if (cantidad > 0) {
                        const product = currentTruckInventory.find(p => p.id === productId);
                        if (product) {
                            if (cantidad > availableQuantity) {
                                showCustomAlert(`No hay suficiente stock de "${product.Producto} (${product.Presentacion})" en el camión. Cantidad disponible: ${availableQuantity}, Cantidad a vender: ${cantidad}.`);
                                hasInsufficientStock = true;
                                break; // Detener el proceso si hay stock insuficiente
                            }
                        }
                    }
                }

                if (hasInsufficientStock) {
                    return; // No continuar con la venta si hay stock insuficiente
                }

                // Segunda pasada para construir la lista de productos vendidos y calcular el total
                for (const input of cantidadInputs) {
                    const productId = input.dataset.productId;
                    const cantidad = parseInt(input.value) || 0;

                    if (cantidad > 0) {
                        const product = currentTruckInventory.find(p => p.id === productId);
                        if (product) {
                            productosVendidos.push({
                                idProducto: product.id,
                                Producto: product.Producto,
                                Presentacion: product.Presentacion,
                                Rubro: product.Rubro,
                                Segmento: product.Segmento,
                                PrecioUnitarioUSD: product.Precio, // Siempre en USD para el registro
                                Cantidad: cantidad,
                                SubtotalUSD: cantidad * product.Precio
                            });
                            totalVentaUSD += (cantidad * product.Precio);
                        }
                    }
                }

                if (productosVendidos.length === 0) {
                    showCustomAlert('Por favor, añade al menos un producto a la venta con una cantidad mayor a 0.');
                    return;
                }

                const confirmed = await showCustomConfirm(`¿Estás seguro de que quieres registrar esta venta por ${totalVentaSpan.textContent}?`);
                if (!confirmed) {
                    return;
                }

                const ventaData = {
                    fechaVenta: new Date().toISOString(),
                    cliente: {
                        id: selectedClient.id,
                        NombreComercial: selectedClient.NombreComercial,
                        Rif: selectedClient.Rif,
                        Zona: selectedClient.Zona,
                        Sector: selectedClient.Sector,
                    },
                    vehiculo: { // Incluir información del vehículo en la venta
                        id: selectedTruck.id,
                        marca: selectedTruck.marca,
                        modelo: selectedTruck.modelo,
                        placa: selectedTruck.placa,
                    },
                    productosVendidos: productosVendidos,
                    totalVentaUSD: totalVentaUSD,
                    exchangeRatesAtSale: rates // Guardar los valores de cambio al momento de la venta
                };

                const ventaId = await guardarVenta(ventaData);
                if (ventaId) {
                    let inventoryUpdateSuccess = true;
                    // Actualizar el inventario del camión (restar las cantidades vendidas)
                    for (const item of productosVendidos) {
                        const updated = await actualizarInventarioCamion(selectedTruck.id, item.idProducto, item.Cantidad);
                        if (!updated) {
                            inventoryUpdateSuccess = false;
                            // Si falla la actualización de un producto, ya se mostró una alerta.
                            // Podrías añadir lógica adicional aquí si necesitas revertir la venta o manejar el error de otra forma.
                        }
                    }

                    if (inventoryUpdateSuccess) {
                        showCustomAlert('Venta registrada y inventario del camión actualizado con éxito. Generando archivo de venta...');
                    } else {
                        showCustomAlert('Venta registrada, pero hubo problemas al actualizar el inventario del camión. Verifique la consola para más detalles.');
                    }
                    
                    generateCsvFile(convertToCsvVenta(ventaData), `venta_${selectedClient.Rif}_${new Date().toISOString().slice(0, 10)}.csv`);

                    // Limpiar el formulario y resetear la tabla después de guardar
                    selectClienteVenta.value = '';
                    selectedClient = null;
                    searchClienteInput.value = '';
                    filterClientSelect(); // Re-filtrar el select de clientes

                    selectCamionVenta.value = ''; // Resetear el selector de camión
                    selectedTruck = null;
                    currentTruckInventory = []; // Limpiar inventario del camión

                    filterRubroVenta.value = ''; // Resetear filtro de rubro
                    applyProductFilters(); // Re-renderizar la tabla de productos (vacía o con mensaje)
                    calculateTotal(); // Resetear el total
                } else {
                    showCustomAlert('Fallo al registrar la venta.');
                }
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderNuevaVentaForm: Finalizado.');
    }

    /**
     * Renderiza la interfaz para ver archivos de ventas individuales (notas de entrega).
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará la sección.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de ventas.
     */
    async function renderArchivosVentasSection(parentContainer, backToMainMenuCallback) {
        console.log('renderArchivosVentasSection: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Archivos de Ventas (Notas de Entrega)</h3>
                <p class="text-gray-700 mb-4">Aquí puedes ver y gestionar las notas de entrega de ventas individuales.</p>
                
                <input type="text" id="search-archivos-ventas-input" placeholder="Buscar venta por cliente, fecha, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="archivos-ventas-table-container" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md mb-4">
                    <p class="text-gray-500">Cargando archivos de ventas...</p>
                </div>

                <button id="btn-back-archivos-ventas" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>

            <!-- Modal para mostrar la nota de entrega real -->
            <div id="nota-entrega-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[9999] p-4 hidden">
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full mx-auto relative"> <!-- max-w-xs para simular 80mm -->
                    <h4 class="text-xl font-semibold text-gray-800 mb-4 text-center">Nota de Entrega</h4>
                    <div id="nota-entrega-content" class="bg-gray-50 p-2 rounded-md border border-gray-200 mb-4 overflow-auto max-h-[70vh]">
                        <!-- Contenido de la nota de entrega se cargará aquí -->
                        Cargando nota de entrega...
                    </div>
                    <div class="flex justify-around space-x-2 mt-4 no-print"> <!-- no-print class added -->
                        <button id="print-nota-modal-btn" class="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition duration-200">Imprimir Nota</button>
                        <button id="share-nota-modal-btn" class="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 transition duration-200">Compartir (Imagen)</button>
                        <button id="close-nota-entrega-modal" class="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition duration-200">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-archivos-ventas-input');
        const tableContainer = parentContainer.querySelector('#archivos-ventas-table-container');
        const btnBack = parentContainer.querySelector('#btn-back-archivos-ventas');
        const notaEntregaModal = parentContainer.querySelector('#nota-entrega-modal');
        const notaEntregaContentDiv = parentContainer.querySelector('#nota-entrega-content');
        const closeNotaEntregaModalBtn = parentContainer.querySelector('#close-nota-entrega-modal');
        const printNotaModalBtn = parentContainer.querySelector('#print-nota-modal-btn');
        const shareNotaModalBtn = parentContainer.querySelector('#share-nota-modal-btn');

        let allSales = []; // Para almacenar todas las ventas y filtrar sobre ellas

        /**
         * Genera el HTML para la nota de entrega.
         * @param {object} saleData - Los datos de la venta.
         * @returns {string} HTML de la nota de entrega.
         */
        function generateDeliveryNoteHtml(saleData) {
            if (!saleData) return '<p class="text-red-500">No se encontraron datos para esta nota de entrega.</p>';

            const saleDate = new Date(saleData.fechaVenta).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const companyInfo = {
                name: "Distribuidora XYZ C.A.",
                rif: "J-12345678-9",
                address: "Calle Principal, Centro, Ciudad, Estado",
                phone: "+58 412 1234567"
            };

            let productsTableHtml = `
                <table class="min-w-full border-collapse border border-gray-300 mb-2" style="font-size: 0.6rem;">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border border-gray-300 px-1 py-0.5 text-left font-semibold">Producto</th>
                            <th class="border border-gray-300 px-1 py-0.5 text-center font-semibold">Cant.</th>
                            <th class="border border-gray-300 px-1 py-0.5 text-right font-semibold">P. Unit.</th>
                            <th class="border border-gray-300 px-1 py-0.5 text-right font-semibold">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            saleData.productosVendidos.forEach(p => {
                productsTableHtml += `
                    <tr>
                        <td class="border border-gray-300 px-1 py-0.5">${p.Producto || 'N/A'} (${p.Presentacion || 'N/A'})</td>
                        <td class="border border-gray-300 px-1 py-0.5 text-center">${p.Cantidad || 0}</td>
                        <td class="border border-gray-300 px-1 py-0.5 text-right">$${(p.PrecioUnitarioUSD || 0).toFixed(2)}</td>
                        <td class="border border-gray-300 px-1 py-0.5 text-right">$${(p.SubtotalUSD || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
            productsTableHtml += `
                    </tbody>
                    <tfoot>
                        <tr class="bg-gray-100 font-semibold">
                            <td colspan="3" class="border border-gray-300 px-1 py-0.5 text-right">TOTAL USD:</td>
                            <td class="border border-gray-300 px-1 py-0.5 text-right">$${(saleData.totalVentaUSD || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            let exchangeRatesHtml = '';
            if (saleData.exchangeRatesAtSale) {
                exchangeRatesHtml = `
                    <p class="text-xs text-gray-600 mt-1" style="font-size: 0.6rem;">
                        Tasas de Cambio: 
                        1 USD = COP ${saleData.exchangeRatesAtSale.cop.toFixed(2)} | 
                        1 USD = Bs. ${saleData.exchangeRatesAtSale.bs.toFixed(2)}
                    </p>
                `;
            }

            return `
                <div class="p-2 bg-white rounded-lg shadow-md print-area" style="width: 80mm; max-width: 300px; margin: auto; box-sizing: border-box;">
                    <style>
                        /* Estilos específicos para la nota de entrega de 80mm */
                        .print-area {
                            font-family: 'monospace', sans-serif; /* Fuente tipo recibo */
                            line-height: 1.2;
                            color: #333;
                        }
                        .print-area h1, .print-area h2, .print-area h3, .print-area p, .print-area table {
                            margin-bottom: 0.2rem; /* Reduce espacio entre elementos */
                        }
                        .print-area .text-center { text-align: center; }
                        .print-area .text-sm { font-size: 0.7rem; }
                        .print-area .text-xs { font-size: 0.6rem; }
                        .print-area .text-2xl { font-size: 1.2rem; } /* Ajustar tamaños de encabezado */
                        .print-area .text-xl { font-size: 1rem; }
                        .print-area .font-bold { font-weight: bold; }
                        .print-area table { width: 100%; border-collapse: collapse; }
                        .print-area th, .print-area td { border: 1px dashed #eee; padding: 2px 4px; } /* Bordes más ligeros */
                        .print-area thead { background-color: #f5f5f5; }
                        .print-area .border-t, .print-area .border-b { border-color: #ddd; }
                        .print-area .mb-6 { margin-bottom: 0.5rem; } /* Reducir márgenes */
                        .print-area .mt-4 { margin-top: 0.5rem; }
                        .print-area .py-3 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                        .print-area .px-2 { padding-left: 0.2rem; padding-right: 0.2rem; }
                        .print-area .py-1 { padding-top: 0.1rem; padding-bottom: 0.1rem; }
                        .print-area .text-right { text-align: right; }
                        .print-area .text-left { text-align: left; }
                        .print-area .text-center { text-align: center; }
                        .print-area .flex { display: flex; }
                        .print-area .justify-around { justify-content: space-around; }
                        .print-area .pt-4 { padding-top: 0.5rem; }
                        .print-area .border-t { border-top-width: 1px; }
                        .print-area .border-b { border-bottom-width: 1px; }
                        /* Ocultar elementos específicos en la impresión real si es necesario */
                        @media print {
                            body { margin: 0; padding: 0; }
                            .modal-content, .modal-content * { visibility: visible !important; }
                            .modal-content {
                                position: static !important;
                                width: auto !important;
                                max-width: none !important;
                                box-shadow: none !important;
                                border: none !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                overflow: visible !important;
                                height: auto !important;
                            }
                            .modal-content .no-print {
                                display: none !important;
                            }
                            .print-area {
                                width: 80mm !important; /* Forzar el ancho de 80mm en la impresión */
                                max-width: none !important;
                                border: none !important;
                                box-shadow: none !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                font-size: 0.7rem !important; /* Ajustar el tamaño de fuente para impresión */
                            }
                            .print-area table { font-size: 0.6rem !important; }
                            .print-area th, .print-area td { padding: 1px 2px !important; }
                        }
                    </style>
                    <div class="text-center mb-2">
                        <h1 class="text-2xl font-bold text-gray-900">${companyInfo.name}</h1>
                        <p class="text-sm text-gray-600">RIF: ${companyInfo.rif}</p>
                        <p class="text-sm text-gray-600">${companyInfo.address}</p>
                        <p class="text-sm text-gray-600">Tlf: ${companyInfo.phone}</p>
                        <h2 class="text-xl font-semibold text-gray-800 mt-2">NOTA DE ENTREGA</h2>
                        <p class="text-sm text-gray-700">No. Venta: ${saleData.id}</p>
                        <p class="text-sm text-gray-700">Fecha: ${saleDate}</p>
                    </div>

                    <div class="mb-2 border-t border-b border-gray-200 py-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">Datos del Cliente:</h3>
                        <p class="text-sm text-gray-700"><strong>Nombre:</strong> ${saleData.cliente.NombreComercial || 'N/A'}</p>
                        <p class="text-sm text-gray-700"><strong>RIF:</strong> ${saleData.cliente.Rif || 'N/A'}</p>
                        <p class="text-sm text-gray-700"><strong>Zona/Sector:</strong> ${saleData.cliente.Zona || 'N/A'}, ${saleData.cliente.Sector || 'N/A'}</p>
                    </div>

                    <div class="mb-2 border-b border-gray-200 py-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">Datos del Vehículo:</h3>
                        <p class="text-sm text-gray-700"><strong>Vehículo:</strong> ${saleData.vehiculo.marca || 'N/A'} ${saleData.vehiculo.modelo || 'N/A'}</p>
                        <p class="text-sm text-gray-700"><strong>Placa:</strong> ${saleData.vehiculo.placa || 'N/A'}</p>
                    </div>

                    <div class="mb-2">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">Productos Vendidos:</h3>
                        ${productsTableHtml}
                    </div>

                    ${exchangeRatesHtml}

                    <div class="flex justify-around mt-4 pt-2 border-t border-gray-200 text-xs text-gray-700">
                        <div class="text-center">
                            <p class="mb-2">_________________________</p>
                            <p>Firma del Cliente</p>
                        </div>
                        <div class="text-center">
                            <p class="mb-2">_________________________</p>
                            <p>Firma del Vendedor</p>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Muestra el modal de nota de entrega con los datos de la venta.
         * @param {object} saleData - Los datos completos de la venta.
         */
        async function showNotaDeEntregaModal(saleData) {
            notaEntregaContentDiv.innerHTML = generateDeliveryNoteHtml(saleData);
            notaEntregaModal.classList.remove('hidden');

            // Asegurarse de que el botón de imprimir y compartir estén habilitados
            printNotaModalBtn.disabled = false;
            shareNotaModalBtn.disabled = false;
        }

        const renderSalesTable = (salesToRender) => {
            tableContainer.innerHTML = '';
            if (salesToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay ventas registradas.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total USD</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            salesToRender.forEach(sale => {
                const saleDate = new Date(sale.fechaVenta).toLocaleDateString('es-ES', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${saleDate}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${sale.cliente.NombreComercial || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(sale.totalVentaUSD || 0).toFixed(2)}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                            <button class="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600 transition duration-200 view-nota-btn" data-sale-id="${sale.id}">Ver Nota</button>
                            <button class="bg-purple-500 text-white px-2 py-1 rounded-md text-xs hover:bg-purple-600 transition duration-200 print-nota-btn" data-sale-id="${sale.id}">Imprimir</button>
                        </td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;

            // Add event listeners for view and print buttons
            tableContainer.querySelectorAll('.view-nota-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const saleId = event.target.dataset.saleId;
                    console.log('Ver Nota de Entrega para venta ID:', saleId);
                    const { db } = await getFirestoreInstances();
                    const saleDocRef = doc(db, 'datosVentas', saleId);
                    const saleSnap = await getDoc(saleDocRef);

                    if (saleSnap.exists()) {
                        showNotaDeEntregaModal({ id: saleSnap.id, ...saleSnap.data() });
                    } else {
                        showCustomAlert('Venta no encontrada.');
                    }
                });
            });

            tableContainer.querySelectorAll('.print-nota-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const saleId = event.target.dataset.saleId;
                    console.log('Imprimir Nota de Entrega para venta ID:', saleId);
                    const { db } = await getFirestoreInstances();
                    const saleDocRef = doc(db, 'datosVentas', saleId);
                    const saleSnap = await getDoc(saleDocRef);

                    if (saleSnap.exists()) {
                        // Generar el HTML de la nota de entrega para imprimir
                        const printContentHtml = generateDeliveryNoteHtml({ id: saleSnap.id, ...saleSnap.data() });
                        
                        // Crear un iframe temporal para la impresión
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(`
                            <html>
                            <head>
                                <title>Nota de Entrega</title>
                                <script src="https://cdn.tailwindcss.com"></script>
                                <style>
                                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; } /* Reset body margin/padding */
                                    .print-area {
                                        width: 80mm !important; /* Force 80mm width for printing */
                                        max-width: none !important; /* Override any max-width */
                                        margin: 0 auto; /* Center content */
                                        box-sizing: border-box;
                                        padding: 5mm; /* Small padding for edges */
                                        font-size: 0.7rem; /* Base font size for printer */
                                        line-height: 1.2;
                                        color: #000; /* Ensure black text for printing */
                                    }
                                    .print-area h1, .print-area h2, .print-area h3, .print-area p, .print-area table {
                                        margin-bottom: 0.2rem;
                                    }
                                    .print-area table { width: 100%; border-collapse: collapse; font-size: 0.6rem; }
                                    .print-area th, .print-area td { border: 1px dashed #eee; padding: 1px 2px; } /* Compact padding */
                                    .print-area .text-center { text-align: center; }
                                    .print-area .text-right { text-align: right; }
                                    .print-area .text-left { text-align: left; }
                                    /* Hide buttons/controls in print */
                                    .no-print { display: none !important; }
                                </style>
                            </head>
                            <body>
                                ${printContentHtml}
                            </body>
                            </html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                        // printWindow.close(); // Se podría cerrar automáticamente después de imprimir, pero a veces interfiere con el diálogo de impresión.
                    } else {
                        showCustomAlert('Venta no encontrada para imprimir.');
                    }
                });
            });
        };

        // Fetch sales data
        try {
            const { db } = await getFirestoreInstances();
            const ventasSnapshot = await getDocs(collection(db, 'datosVentas'));
            allSales = [];
            ventasSnapshot.forEach(doc => {
                allSales.push({ id: doc.id, ...doc.data() });
            });
            // Ordenar ventas por fecha, las más recientes primero
            allSales.sort((a, b) => new Date(b.fechaVenta) - new Date(a.fechaVenta));
            renderSalesTable(allSales);
        } catch (error) {
            console.error('Error al cargar archivos de ventas:', error);
            tableContainer.innerHTML = '<p class="text-red-600">Error al cargar archivos de ventas. Por favor, verifique los permisos.</p>';
        }

        // Search functionality
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredSales = allSales.filter(sale => {
                const clientName = sale.cliente?.NombreComercial?.toLowerCase() || '';
                const saleDate = new Date(sale.fechaVenta).toLocaleDateString('es-ES').toLowerCase();
                const total = (sale.totalVentaUSD || 0).toFixed(2).toLowerCase();
                return clientName.includes(searchTerm) || saleDate.includes(searchTerm) || total.includes(searchTerm);
            });
            renderSalesTable(filteredSales);
        });

        // Close nota de entrega modal
        if (closeNotaEntregaModalBtn) {
            closeNotaEntregaModalBtn.addEventListener('click', () => {
                notaEntregaModal.classList.add('hidden');
            });
        }

        // Print button inside modal
        if (printNotaModalBtn) {
            printNotaModalBtn.addEventListener('click', () => {
                const printContent = notaEntregaContentDiv;
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Nota de Entrega</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
                            .print-area {
                                width: 80mm !important; /* Force 80mm width for printing */
                                max-width: none !important;
                                margin: 0 auto;
                                box-sizing: border-box;
                                padding: 5mm;
                                font-size: 0.7rem;
                                line-height: 1.2;
                                color: #000;
                            }
                            .print-area h1, .print-area h2, .print-area h3, .print-area p, .print-area table {
                                margin-bottom: 0.2rem;
                            }
                            .print-area table { width: 100%; border-collapse: collapse; font-size: 0.6rem; }
                            .print-area th, .print-area td { border: 1px dashed #eee; padding: 1px 2px; }
                            .print-area .text-center { text-align: center; }
                            .print-area .text-right { text-align: right; }
                            .print-area .text-left { text-align: left; }
                            .no-print { display: none !important; }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            });
        }

        // Share (Image) button inside modal
        if (shareNotaModalBtn) {
            shareNotaModalBtn.addEventListener('click', async () => {
                showCustomAlert('Generando imagen de la nota de entrega. Esto puede tardar unos segundos...');
                try {
                    // Asegúrate de que html2canvas esté cargado.
                    // Si no está cargado globalmente, necesitarás importarlo o añadirlo a tu index.html.
                    // <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
                    if (typeof html2canvas === 'undefined') {
                        showCustomAlert('Error: La librería html2canvas no está cargada. Por favor, añádela a tu index.html.');
                        console.error('html2canvas no está definido. Asegúrate de que el script está cargado.');
                        return;
                    }

                    const element = notaEntregaContentDiv;
                    const canvas = await html2canvas(element, { scale: 2 }); // Aumentar escala para mejor calidad
                    const imageData = canvas.toDataURL('image/png');

                    // Crear un enlace de descarga
                    const link = document.createElement('a');
                    link.href = imageData;
                    link.download = `nota_entrega_${new Date().toISOString().slice(0, 10)}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showCustomAlert('Imagen de la nota de entrega generada y descargada con éxito.');

                } catch (error) {
                    console.error('Error al generar imagen de nota de entrega:', error);
                    showCustomAlert('Fallo al generar la imagen de la nota de entrega.');
                }
            });
        }

        // Back button
        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderArchivosVentasSection: Finalizado.');
    }


    /**
     * Renderiza la interfaz para el cierre de ventas diarias.
     * Consolida las ventas del día actual por el usuario logueado y permite descargar un CSV.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de ventas.
     * @param {Array<object>} allProductsGeneral - Lista de todos los productos definidos en el inventario general.
     */
    async function renderCierreVentasDiarias(parentContainer, backToMainMenuCallback, allProductsGeneral) {
        console.log('renderCierreVentasDiarias: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Cierre de Ventas Diarias</h3>
                <p class="text-gray-700 mb-4">Consolida todas las ventas realizadas por este usuario en el día de hoy.</p>
                
                <div id="cierre-ventas-info" class="mb-4">
                    <p class="text-lg font-semibold">Fecha: <span id="cierre-fecha"></span></p>
                    <p class="text-lg font-semibold">Usuario: <span id="cierre-usuario"></span></p>
                </div>

                <div id="cierre-ventas-table-container" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md mb-4">
                    <p class="text-gray-500">Cargando ventas del día...</p>
                </div>

                <button id="btn-generar-cierre-csv" class="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Generar y Descargar Cierre Diario CSV
                </button>
                <button id="btn-back-cierre-ventas" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const cierreFechaSpan = parentContainer.querySelector('#cierre-fecha');
        const cierreUsuarioSpan = parentContainer.querySelector('#cierre-usuario');
        const cierreVentasTableContainer = parentContainer.querySelector('#cierre-ventas-table-container');
        const btnGenerarCierreCsv = parentContainer.querySelector('#btn-generar-cierre-csv');
        const btnBack = parentContainer.querySelector('#btn-back-cierre-ventas');

        const { db, auth } = await getFirestoreInstances();
        const currentUserId = auth.currentUser?.uid;
        const currentUserEmail = auth.currentUser?.email || 'N/A';

        cierreFechaSpan.textContent = new Date().toLocaleDateString('es-ES');
        cierreUsuarioSpan.textContent = currentUserEmail;

        // Declarar estas variables en un ámbito más amplio para que sean accesibles en el event listener
        let consolidatedSalesData = {}; // Para almacenar los datos consolidados para el CSV y Firestore
        let allUniqueProductIds = new Set(); // Para recopilar todos los productos únicos vendidos
        let productDetailsMap = {}; // { productId: { Producto: "Nombre", Presentacion: "X" } }

        // Obtener la fecha de hoy al inicio y al final del día en formato ISO
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Inicio del día
        const startOfDayISO = today.toISOString();
        
        today.setHours(23, 59, 59, 999); // Fin del día
        const endOfDayISO = today.toISOString();

        console.log(`Buscando ventas para el usuario ${currentUserId} entre ${startOfDayISO} y ${endOfDayISO}`);

        /**
         * Función para renderizar la tabla de cierre de ventas.
         * @param {object} data - Datos consolidados de ventas por cliente.
         * @param {Array<string>} uniqueProductIds - IDs únicos de productos vendidos, ordenados.
         * @param {object} productDetails - Detalles de los productos (nombre, presentación, etc.).
         * @param {HTMLElement} tableContainer - El contenedor donde se renderizará la tabla.
         */
        const renderCierreVentasTable = (data, uniqueProductIds, productDetails, tableContainer) => {
            tableContainer.innerHTML = '';
            if (Object.keys(data).length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay ventas para mostrar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Comercial</th>
                            ${uniqueProductIds.map(id => `<th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${productDetails[id]?.Producto} (${productDetails[id]?.Presentacion})</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            let totalQuantities = {};
            uniqueProductIds.forEach(id => totalQuantities[id] = 0);

            for (const clientId in data) {
                const clientData = data[clientId];
                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${clientData.cliente.NombreComercial || 'N/A'}</td>
                        ${uniqueProductIds.map(id => {
                            const quantity = clientData.productos[id] || 0;
                            totalQuantities[id] += quantity;
                            return `<td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${quantity}</td>`;
                        }).join('')}
                    </tr>
                `;
            }

            // Fila de totales
            tableHTML += `
                    <tr class="bg-gray-200 font-bold">
                        <td class="px-2 py-1 whitespace-nowrap text-sm text-gray-900">Total:</td>
                        ${uniqueProductIds.map(id => `<td class="px-2 py-1 whitespace-nowrap text-sm text-gray-900">${totalQuantities[id]}</td>`).join('')}
                    </tr>
                </tbody></table>`;
            tableContainer.innerHTML = tableHTML;
        };

        try {
            const ventasRef = collection(db, 'datosVentas');
            // Filtrar por userId y por fecha de venta
            const q = query(
                ventasRef,
                where('userId', '==', currentUserId),
                where('fechaVenta', '>=', startOfDayISO),
                where('fechaVenta', '<=', endOfDayISO)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                cierreVentasTableContainer.innerHTML = '<p class="text-gray-500">No hay ventas registradas para este usuario en el día de hoy.</p>';
                btnGenerarCierreCsv.disabled = true;
                return;
            }

            // Consolidar ventas por cliente y por producto
            querySnapshot.forEach(docSnap => {
                const venta = docSnap.data();
                const clientId = venta.cliente.id;

                if (!consolidatedSalesData[clientId]) {
                    consolidatedSalesData[clientId] = {
                        cliente: venta.cliente,
                        productos: {} // { productId: quantitySold }
                    };
                }

                venta.productosVendidos.forEach(productoVendido => {
                    const productId = productoVendido.idProducto;
                    const cantidad = productoVendido.Cantidad;
                    allUniqueProductIds.add(productId); // Añadir a la lista de productos únicos

                    if (consolidatedSalesData[clientId].productos[productId]) {
                        consolidatedSalesData[clientId].productos[productId] += cantidad;
                    } else {
                        consolidatedSalesData[clientId].productos[productId] = cantidad;
                    }
                });
            });

            // Obtener detalles de todos los productos únicos para los encabezados
            allProductsGeneral.forEach(p => {
                if (allUniqueProductIds.has(p.id)) {
                    productDetailsMap[p.id] = {
                        Producto: p.Producto,
                        Presentacion: p.Presentacion,
                        Rubro: p.Rubro,
                        Segmento: p.Segmento,
                        Precio: p.Precio // Precio en USD
                    };
                }
            });

            // Ordenar los productos únicos para tener un orden consistente en el CSV
            const sortedUniqueProductIds = Array.from(allUniqueProductIds).sort((a, b) => {
                const nameA = productDetailsMap[a]?.Producto || '';
                const nameB = productDetailsMap[b]?.Producto || '';
                return nameA.localeCompare(nameB);
            });

            // Renderizar la tabla de cierre de ventas
            renderCierreVentasTable(consolidatedSalesData, sortedUniqueProductIds, productDetailsMap, cierreVentasTableContainer);

        } catch (error) {
            console.error('Error al obtener y consolidar ventas diarias:', error);
            cierreVentasTableContainer.innerHTML = '<p class="text-red-600">Error al cargar el cierre de ventas. Por favor, verifique los permisos.</p>';
            btnGenerarCierreCsv.disabled = true;
        }

        // Lógica para generar y descargar el CSV
        if (btnGenerarCierreCsv) {
            btnGenerarCierreCsv.addEventListener('click', async () => {
                // Añadir log para verificar el estado de autenticación justo antes de la operación
                console.log('Estado de autenticación al intentar cierre de ventas (btn click):', auth.currentUser);
                if (!currentUserId) {
                    showCustomAlert('Error: No se pudo obtener el ID de usuario. Por favor, intente iniciar sesión de nuevo.');
                    console.error('Error: currentUserId es nulo al intentar guardar/eliminar ventas. Esto indica que el usuario no está autenticado.');
                    return;
                }
                console.log(`Intentando guardar/eliminar ventas para userId: ${currentUserId}`);


                if (Object.keys(consolidatedSalesData).length === 0) {
                    showCustomAlert('No hay ventas para consolidar en el día de hoy.');
                    return;
                }

                const currentUserDisplayName = auth.currentUser?.email || auth.currentUser?.uid; // Usar auth del ámbito superior

                const csvRows = [];

                // Línea 1: Camión (general para el reporte diario)
                csvRows.push(escapeCsvValue(`Camion: Todos los Camiones`)); // Usar la función de escape
                // Línea 2: Usuario
                csvRows.push(escapeCsvValue(`Usuario: ${currentUserDisplayName}`)); // Usar la función de escape

                // Línea 3: Cabecera de las columnas
                const productHeaders = Array.from(allUniqueProductIds).sort((a, b) => {
                    const nameA = productDetailsMap[a]?.Producto || '';
                    const nameB = productDetailsMap[b]?.Producto || '';
                    return nameA.localeCompare(nameB);
                }).map(id => `${productDetailsMap[id]?.Producto} (${productDetailsMap[id]?.Presentacion})`);
                csvRows.push(escapeCsvValue("Nombre Comercial") + ',' + productHeaders.map(h => escapeCsvValue(h)).join(',')); // Usar la función de escape

                // Líneas de datos de cada venta consolidada por cliente
                let totalQuantities = {};
                Array.from(allUniqueProductIds).forEach(id => totalQuantities[id] = 0); // Inicializar totales

                for (const clientId in consolidatedSalesData) {
                    const clientData = consolidatedSalesData[clientId];
                    const rowValues = [clientData.cliente.NombreComercial];
                    Array.from(allUniqueProductIds).sort((a, b) => {
                        const nameA = productDetailsMap[a]?.Producto || '';
                        const nameB = productDetailsMap[b]?.Producto || '';
                        return nameA.localeCompare(nameB);
                    }).forEach(productId => {
                        const quantity = clientData.productos[productId] || 0;
                        rowValues.push(quantity);
                        totalQuantities[productId] += quantity; // Sumar al total
                    });
                    csvRows.push(rowValues.map(value => escapeCsvValue(value)).join(',')); // Usar la función de escape
                }

                // Última línea: Sumatoria por columna
                const totalRowValues = ["Total:"];
                Array.from(allUniqueProductIds).sort((a, b) => {
                    const nameA = productDetailsMap[a]?.Producto || '';
                    const nameB = productDetailsMap[b]?.Producto || '';
                    return nameA.localeCompare(nameB);
                }).forEach(productId => {
                    totalRowValues.push(totalQuantities[productId]);
                });
                csvRows.push(totalRowValues.map(value => escapeCsvValue(value)).join(',')); // Usar la función de escape

                const csvString = csvRows.join('\n');
                const filename = `cierre_ventas_diarias_${new Date().toISOString().slice(0, 10)}_${currentUserId}.csv`;
                
                // Guardar en Firestore
                const cierreData = {
                    fechaCierre: new Date().toISOString(),
                    userId: currentUserId,
                    userName: currentUserEmail,
                    consolidatedSales: consolidatedSalesData, // Guardar los datos consolidados
                    uniqueProducts: Array.from(allUniqueProductIds), // Guardar IDs de productos únicos
                    productDetailsAtClose: productDetailsMap, // Guardar detalles de productos al momento del cierre
                    csvContent: csvString // Opcional: guardar el contenido CSV directamente
                };
                try {
                    const cierreDocRef = doc(db, 'VentasConsolidadas', `${new Date().toISOString().slice(0, 10)}_${currentUserId}`);
                    await setDoc(cierreDocRef, cierreData, { merge: true }); // Usar setDoc con merge para evitar sobrescribir si ya existe
                    console.log('Cierre de ventas diario guardado en Firestore.');

                    // --- NUEVA LÓGICA: Eliminar ventas individuales después del cierre ---
                    console.log('Iniciando eliminación de ventas individuales del día...');
                    const salesToDeleteQuery = query(
                        collection(db, `datosVentas`),
                        where('userId', '==', currentUserId),
                        where('fechaVenta', '>=', startOfDayISO),
                        where('fechaVenta', '<=', endOfDayISO)
                    );
                    const salesToDeleteSnapshot = await getDocs(salesToDeleteQuery);

                    if (!salesToDeleteSnapshot.empty) {
                        const deletePromises = [];
                        salesToDeleteSnapshot.forEach(docToDelete => {
                            deletePromises.push(deleteDoc(doc(db, `datosVentas`, docToDelete.id)));
                        });
                        await Promise.all(deletePromises);
                        console.log(`Se eliminaron ${salesToDeleteSnapshot.size} ventas individuales del día.`);
                        showCustomAlert(`Cierre de ventas generado y ${salesToDeleteSnapshot.size} ventas individuales eliminadas con éxito.`);
                    } else {
                        console.log('No se encontraron ventas individuales para eliminar.');
                        showCustomAlert('Cierre de ventas generado. No se encontraron ventas individuales para eliminar.');
                    }
                    // --- FIN NUEVA LÓGICA ---

                } catch (firestoreError) {
                    console.error('Error al guardar el cierre de ventas en Firestore o al eliminar ventas individuales:', firestoreError);
                    showCustomAlert('Error al guardar el cierre de ventas en la base de datos o al eliminar ventas individuales.');
                }

                generateCsvFile(csvString, filename);
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderCierreVentasDiarias: Finalizado.');
    }

    console.log('renderVentasSection: Función completada.');
}
