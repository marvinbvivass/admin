// precios.js
// Este archivo gestiona la visualización y actualización de precios de productos
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { verInventarioCompleto, modificarProducto } from './inventario.js';

// ID fijo para el documento de configuración de valores de cambio
const EXCHANGE_RATES_DOC_ID = 'exchangeRates';
const RUBRO_SEGMENTO_CONFIG_DOC_ID = 'rubrosSegmentos'; // Para obtener los rubros

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en precios.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en precios.js.');
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
 * Obtiene los valores de cambio (COP y BS) desde Firestore.
 * @returns {Promise<{cop: number, bs: number}>} Los valores de cambio o valores predeterminados.
 */
async function obtenerValoresDeCambio() {
    console.log('obtenerValoresDeCambio: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, EXCHANGE_RATES_DOC_ID);
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
 * Guarda los valores de cambio (COP y BS) en Firestore.
 * @param {number} copRate - El valor de cambio para COP.
 * @param {number} bsRate - El valor de cambio para BS.
 * @returns {Promise<boolean>} True si se guardó con éxito, false en caso contrario.
 */
async function guardarValoresDeCambio(copRate, bsRate) {
    console.log('guardarValoresDeCambio: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, EXCHANGE_RATES_DOC_ID);
        await setDoc(configDocRef, { cop: copRate, bs: bsRate }, { merge: true }); // Usar merge para no sobrescribir otros campos si los hubiera
        console.log('Valores de cambio guardados con éxito.');
        return true;
    } catch (error) {
        console.error('Error al guardar valores de cambio:', error);
        return false;
    } finally {
        console.log('guardarValoresDeCambio: Finalizado.');
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
 * Renderiza la interfaz de usuario de la sección de precios dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de precios.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de la aplicación.
 */
export async function renderPreciosSection(container, backToMainMenuCallback) {
    console.log('renderPreciosSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderPreciosSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Precios</h2>

            <div id="precios-main-buttons-container" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button id="btn-lista-precios" class="bg-red-600 text-white p-4 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                    Lista de Precios
                </button>
                <button id="btn-actualizar-precios" class="bg-orange-600 text-white p-4 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                    Actualizar Precios
                </button>
                <button id="btn-show-exchange-rates" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200">
                    Configurar Valores de Cambio
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="precios-sub-section" class="mt-8">
                <!-- El contenido de las sub-secciones se cargará aquí -->
            </div>

            <button id="btn-back-precios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                Volver al Menú Principal
            </button>

            <!-- Botón para cerrar el modal -->
            <button id="close-precios-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const preciosMainButtonsContainer = container.querySelector('#precios-main-buttons-container');
    const preciosSubSection = container.querySelector('#precios-sub-section');
    const btnBack = container.querySelector('#btn-back-precios');
    const closePreciosModalBtn = container.querySelector('#close-precios-modal');

    const btnListaPrecios = container.querySelector('#btn-lista-precios');
    const btnActualizarPrecios = container.querySelector('#btn-actualizar-precios');
    const btnShowExchangeRates = container.querySelector('#btn-show-exchange-rates');

    let rubroSegmentoMap = await obtenerConfiguracionRubrosSegmentos(); // Cargar mapa de rubros/segmentos
    let currentExchangeRates = await obtenerValoresDeCambio(); // Cargar valores de cambio

    // Función para mostrar los botones principales y limpiar la sub-sección
    function showPreciosMainButtons() {
        preciosSubSection.innerHTML = '';
        preciosMainButtonsContainer.classList.remove('hidden');
    }

    // Lógica para cerrar el modal
    if (closePreciosModalBtn) {
        closePreciosModalBtn.addEventListener('click', () => {
            console.log('Cerrar modal de Precios clickeado. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Lógica para el botón "Volver al Menú Principal"
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            console.log('Botón "Volver al Menú Principal" clickeado en Precios. Volviendo al menú principal de la aplicación.');
            container.classList.add('hidden');
            backToMainMenuCallback();
        });
    }

    // Event Listeners para los botones del menú de precios
    if (btnListaPrecios) {
        btnListaPrecios.addEventListener('click', async () => {
            console.log('Botón "Lista de Precios" clickeado.');
            preciosMainButtonsContainer.classList.add('hidden');
            await renderListaDePrecios(preciosSubSection, showPreciosMainButtons, rubroSegmentoMap, currentExchangeRates);
        });
    }

    if (btnActualizarPrecios) {
        btnActualizarPrecios.addEventListener('click', async () => {
            console.log('Botón "Actualizar Precios" clickeado.');
            preciosMainButtonsContainer.classList.add('hidden');
            await renderActualizarPrecios(preciosSubSection, showPreciosMainButtons, rubroSegmentoMap);
        });
    }

    if (btnShowExchangeRates) {
        btnShowExchangeRates.addEventListener('click', async () => {
            console.log('Botón "Configurar Valores de Cambio" clickeado.');
            preciosMainButtonsContainer.classList.add('hidden');
            await renderExchangeRatesForm(preciosSubSection, showPreciosMainButtons);
        });
    }

    // --- Funciones para el formulario de Valores de Cambio ---
    /**
     * Renderiza el formulario para configurar los valores de cambio.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de precios.
     */
    async function renderExchangeRatesForm(parentContainer, backToMainMenuCallback) {
        console.log('renderExchangeRatesForm: Iniciando...');
        currentExchangeRates = await obtenerValoresDeCambio(); // Asegurarse de tener los últimos valores
        parentContainer.innerHTML = `
            <div class="p-4 bg-purple-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-purple-800 mb-3">Configurar Valores de Cambio</h4>

                <div class="mb-4">
                    <label for="cop-rate-input" class="block text-sm font-medium text-gray-700 mb-1">Valor de 1 USD a COP:</label>
                    <input type="number" step="0.01" id="cop-rate-input" value="${currentExchangeRates.cop}" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                </div>

                <div class="mb-4">
                    <label for="bs-rate-input" class="block text-sm font-medium text-gray-700 mb-1">Valor de 1 USD a BS:</label>
                    <input type="number" step="0.01" id="bs-rate-input" value="${currentExchangeRates.bs}" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                </div>

                <button id="btn-save-exchange-rates" class="w-full bg-purple-600 text-white p-3 rounded-md font-semibold hover:bg-purple-700 transition duration-200 mb-3">
                    Guardar Valores de Cambio
                </button>

                <button id="btn-back-from-exchange-rates" class="w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const copRateInput = parentContainer.querySelector('#cop-rate-input');
        const bsRateInput = parentContainer.querySelector('#bs-rate-input');
        const btnSaveExchangeRates = parentContainer.querySelector('#btn-save-exchange-rates');
        const btnBackFromExchangeRates = parentContainer.querySelector('#btn-back-from-exchange-rates');

        btnSaveExchangeRates.addEventListener('click', async () => {
            const newCopRate = parseFloat(copRateInput.value);
            const newBsRate = parseFloat(bsRateInput.value);

            if (isNaN(newCopRate) || newCopRate <= 0 || isNaN(newBsRate) || newBsRate <= 0) {
                showCustomAlert('Por favor, ingrese valores numéricos válidos y mayores que cero para los valores de cambio.');
                return;
            }

            const saved = await guardarValoresDeCambio(newCopRate, newBsRate);
            if (saved) {
                showCustomAlert('Valores de cambio guardados con éxito.');
                currentExchangeRates = { cop: newCopRate, bs: newBsRate }; // Actualizar en memoria
                backToMainMenuCallback(); // Volver al menú principal de precios
            } else {
                showCustomAlert('Fallo al guardar valores de cambio.');
            }
        });

        btnBackFromExchangeRates.addEventListener('click', backToMainMenuCallback);
        console.log('renderExchangeRatesForm: Finalizado.');
    }


    // --- Funciones para la Lista de Precios ---
    /**
     * Renderiza la tabla de productos para la "Lista de Precios".
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará la tabla.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de precios.
     * @param {object} rubroMap - El mapa de rubros y segmentos.
     * @param {object} exchangeRates - Los valores de cambio actuales.
     */
    async function renderListaDePrecios(parentContainer, backToMainMenuCallback, rubroMap, exchangeRates) {
        console.log('renderListaDePrecios: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-red-100 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-red-900 mb-4">Lista de Precios</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select id="filter-rubro-select-lista" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option value="">Todos los Rubros</option>
                        ${Object.keys(rubroMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                    </select>
                    <input type="text" id="search-precios-lista-input" placeholder="Buscar producto por Segmento, Producto, Presentación..." class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                </div>

                <div id="productos-lista-precios-table" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                    <p class="text-gray-500">Cargando lista de precios...</p>
                </div>

                <button id="btn-back-lista-precios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const filterRubroSelect = parentContainer.querySelector('#filter-rubro-select-lista');
        const searchInput = parentContainer.querySelector('#search-precios-lista-input');
        const tableContainer = parentContainer.querySelector('#productos-lista-precios-table');
        const btnBack = parentContainer.querySelector('#btn-back-lista-precios');

        let allProducts = await verInventarioCompleto();

        const renderTable = (productsToRender) => {
            tableContainer.innerHTML = '';
            if (productsToRender.length === 0) {
                tableContainer.innerHTML = '<p class="text-gray-500">No hay productos para mostrar.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COP</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bs.</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;

            productsToRender.forEach(product => {
                const precioUSD = product.Precio || 0;
                const precioCOP = (precioUSD * exchangeRates.cop).toFixed(2);
                const precioBS = (precioUSD * exchangeRates.bs).toFixed(2);

                tableHTML += `
                    <tr class="hover:bg-gray-100">
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Segmento || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${precioUSD.toFixed(2)}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">COP ${precioCOP}</td>
                        <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">Bs. ${precioBS}</td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            tableContainer.innerHTML = tableHTML;
        };

        // Lógica de filtrado en tiempo real por búsqueda y rubro
        const applyFilters = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedRubro = filterRubroSelect.value;

            const filteredProducts = allProducts.filter(product => {
                const matchesSearch = (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm)) ||
                                      (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                                      (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm));
                const matchesRubro = !selectedRubro || (product.Rubro === selectedRubro);
                return matchesSearch && matchesRubro;
            });
            renderTable(filteredProducts);
        };

        searchInput.addEventListener('input', applyFilters);
        filterRubroSelect.addEventListener('change', applyFilters);

        renderTable(allProducts); // Renderizado inicial

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderListaDePrecios: Finalizado.');
    }


    // --- Funciones para Actualizar Precios ---
    /**
     * Renderiza el formulario para actualizar precios de productos.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará el formulario.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de precios.
     * @param {object} rubroMap - El mapa de rubros y segmentos.
     */
    async function renderActualizarPrecios(parentContainer, backToMainMenuCallback, rubroMap) {
        console.log('renderActualizarPrecios: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-orange-100 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-orange-900 mb-4">Actualizar Precios por Producto</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select id="filter-rubro-select-update" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">Todos los Rubros</option>
                        ${Object.keys(rubroMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                    </select>
                    <input type="text" id="search-productos-update-input" placeholder="Buscar producto por Segmento, Producto, Presentación..." class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                </div>

                <div class="mb-4">
                    <label for="select-producto-to-update" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Producto:</label>
                    <select id="select-producto-to-update" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">-- Selecciona un Producto --</option>
                    </select>
                </div>

                <div id="product-details-for-update" class="hidden p-4 bg-white rounded-md border border-gray-200 shadow-sm mb-4">
                    <p class="text-sm text-gray-700 mb-2">Producto Seleccionado: <span id="selected-product-info" class="font-semibold"></span></p>
                    <p class="text-sm text-gray-700 mb-4">Precio Actual (USD): $<span id="current-price-usd" class="font-semibold"></span></p>

                    <label for="new-price-input" class="block text-sm font-medium text-gray-700 mb-1">Nuevo Precio (USD):</label>
                    <input type="number" step="0.01" id="new-price-input" placeholder="Ingresa el nuevo precio en USD" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">

                    <button id="btn-confirm-update-price" class="mt-4 w-full bg-orange-600 text-white p-3 rounded-md font-semibold hover:bg-orange-700 transition duration-200">
                        Actualizar Precio
                    </button>
                </div>

                <button id="btn-back-actualizar-precios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const filterRubroSelect = parentContainer.querySelector('#filter-rubro-select-update');
        const searchInput = parentContainer.querySelector('#search-productos-update-input');
        const selectProductoToUpdate = parentContainer.querySelector('#select-producto-to-update');
        const productDetailsDiv = parentContainer.querySelector('#product-details-for-update');
        const selectedProductInfoSpan = parentContainer.querySelector('#selected-product-info');
        const currentPriceUSDSpan = parentContainer.querySelector('#current-price-usd');
        const newPriceInput = parentContainer.querySelector('#new-price-input');
        const btnConfirmUpdatePrice = parentContainer.querySelector('#btn-confirm-update-price');
        const btnBack = parentContainer.querySelector('#btn-back-actualizar-precios');

        let allProducts = await verInventarioCompleto();
        let filteredProducts = [...allProducts]; // Para mantener el estado de los productos filtrados
        let selectedProductId = null;

        const populateProductSelect = (products) => {
            selectProductoToUpdate.innerHTML = '<option value="">-- Selecciona un Producto --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.Producto} (${product.Presentacion}) - ${product.Segmento}`;
                selectProductoToUpdate.appendChild(option);
            });
            productDetailsDiv.classList.add('hidden'); // Ocultar detalles al repoblar
        };

        const applyFilters = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedRubro = filterRubroSelect.value;

            filteredProducts = allProducts.filter(product => {
                const matchesSearch = (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm)) ||
                                      (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                                      (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm));
                const matchesRubro = !selectedRubro || (product.Rubro === selectedRubro);
                return matchesSearch && matchesRubro;
            });
            populateProductSelect(filteredProducts);
        };

        // Inicializar el select de productos y filtros
        applyFilters();

        filterRubroSelect.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);

        selectProductoToUpdate.addEventListener('change', () => {
            selectedProductId = selectProductoToUpdate.value;
            if (selectedProductId) {
                const product = allProducts.find(p => p.id === selectedProductId);
                if (product) {
                    selectedProductInfoSpan.textContent = `${product.Producto} (${product.Presentacion}) - ${product.Segmento}`;
                    currentPriceUSDSpan.textContent = product.Precio.toFixed(2);
                    newPriceInput.value = product.Precio.toFixed(2); // Precargar con el precio actual
                    productDetailsDiv.classList.remove('hidden');
                }
            } else {
                productDetailsDiv.classList.add('hidden');
            }
        });

        if (btnConfirmUpdatePrice) {
            btnConfirmUpdatePrice.addEventListener('click', async () => {
                if (!selectedProductId) {
                    showCustomAlert('Por favor, selecciona un producto para actualizar.');
                    return;
                }
                const newPrice = parseFloat(newPriceInput.value);

                if (isNaN(newPrice) || newPrice < 0) {
                    showCustomAlert('Por favor, ingresa un precio válido y mayor o igual a cero.');
                    return;
                }

                const confirmed = confirm(`¿Estás seguro de que quieres actualizar el precio de este producto a $${newPrice.toFixed(2)} USD?`);
                if (confirmed) {
                    const updated = await modificarProducto(selectedProductId, { Precio: newPrice });
                    if (updated) {
                        showCustomAlert('Precio actualizado con éxito.');
                        // Actualizar el producto en la lista local y re-renderizar
                        const productIndex = allProducts.findIndex(p => p.id === selectedProductId);
                        if (productIndex !== -1) {
                            allProducts[productIndex].Precio = newPrice;
                        }
                        // Limpiar y volver a cargar el formulario para reflejar los cambios
                        selectedProductId = null;
                        populateProductSelect(allProducts); // Repoblar con todos los productos (o filtrados si hay filtros activos)
                        applyFilters(); // Re-aplicar filtros para que la lista desplegable se actualice
                        productDetailsDiv.classList.add('hidden'); // Ocultar detalles
                    } else {
                        showCustomAlert('Fallo al actualizar el precio.');
                    }
                }
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        }
        console.log('renderActualizarPrecios: Finalizado.');
    }

    console.log('renderPreciosSection: Función completada.');
}
