// ventas.js
// Este archivo gestiona las operaciones de ventas, incluyendo la creación de nuevas ventas
// y la visualización de cierres diarios.
// Ahora permite seleccionar un camión para la venta, muestra el stock disponible de ese camión,
// valida la cantidad a vender y genera un archivo CSV detallado de la venta.
// Se añade la funcionalidad de "Cierre de Ventas Diarias" para consolidar y exportar ventas por día y usuario.

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
 * Convierte los datos de la venta a formato CSV con un formato específico.
 * @param {object} ventaData - Los datos completos de la venta.
 * @returns {string} La cadena de texto en formato CSV.
 */
function convertToCsvVenta(ventaData) {
    const csvRows = [];

    // Fila 1: Información del camión
    // Formato: "Camion: Marca Modelo, Placa: XXX-YYY"
    const vehicleInfo = `Camion: ${ventaData.vehiculo.marca} ${ventaData.vehiculo.modelo}, Placa: ${ventaData.vehiculo.placa}`;
    csvRows.push(`"${vehicleInfo.replace(/"/g, '""')}"`); // Escapar comillas dobles y encerrar en comillas

    // Fila 2: Información del cliente
    // Formato: "Cliente: Nombre Comercial, Rif: XXXXXXX-X"
    const clientInfo = `Cliente: ${ventaData.cliente.NombreComercial}, Rif: ${ventaData.cliente.Rif}`;
    csvRows.push(`"${clientInfo.replace(/"/g, '""')}"`); // Escapar comillas dobles y encerrar en comillas

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
    csvRows.push(productHeaders.map(header => `"${header}"`).join(','));

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
        // Escapar comillas dobles y encerrar el valor en comillas si contiene comas o comillas
        csvRows.push(row.map(value => {
            if (value === undefined || value === null) {
                return '';
            }
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        }).join(','));
    });

    // Última fila: Total de la venta
    csvRows.push(`Total Venta USD:,"${ventaData.totalVentaUSD.toFixed(2)}"`);

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

            <div id="ventas-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-nueva-venta" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Nueva Venta
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
                if (Object.keys(consolidatedSalesData).length === 0) {
                    showCustomAlert('No hay ventas para consolidar en el día de hoy.');
                    return;
                }

                const { auth } = await getFirestoreInstances();
                const currentUserDisplayName = auth.currentUser?.email || auth.currentUser?.uid; // Usar email o UID

                const csvRows = [];

                // Línea 1: Camión (general para el reporte diario)
                csvRows.push(`"Camion: Todos los Camiones"`);
                // Línea 2: Usuario
                csvRows.push(`"Usuario: ${currentUserDisplayName}"`);

                // Línea 3: Cabecera de las columnas
                const productHeaders = Array.from(allUniqueProductIds).sort((a, b) => {
                    const nameA = productDetailsMap[a]?.Producto || '';
                    const nameB = productDetailsMap[b]?.Producto || '';
                    return nameA.localeCompare(nameB);
                }).map(id => `${productDetailsMap[id]?.Producto} (${productDetailsMap[id]?.Presentacion})`);
                csvRows.push(`"Nombre Comercial",${productHeaders.map(h => `"${h}"`).join(',')}`);

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
                    csvRows.push(rowValues.map(value => {
                        if (value === undefined || value === null) return '';
                        return `"${String(value).replace(/"/g, '""')}"`;
                    }).join(','));
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
                csvRows.push(totalRowValues.map(value => {
                    if (value === undefined || value === null) return '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(','));

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
                        ventasRef,
                        where('userId', '==', currentUserId),
                        where('fechaVenta', '>=', startOfDayISO),
                        where('fechaVenta', '<=', endOfDayISO)
                    );
                    const salesToDeleteSnapshot = await getDocs(salesToDeleteQuery);

                    if (!salesToDeleteSnapshot.empty) {
                        const deletePromises = [];
                        salesToDeleteSnapshot.forEach(docToDelete => {
                            deletePromises.push(deleteDoc(doc(db, 'datosVentas', docToDelete.id)));
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
