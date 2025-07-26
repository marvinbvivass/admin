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

            <div id="precios-main-content" class="p-6 bg-red-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-red-800 mb-4">Actualizar Precios de Productos</h3>

                <button id="btn-show-exchange-rates" class="bg-purple-600 text-white p-3 rounded-md font-semibold hover:bg-purple-700 transition duration-200 mb-4 w-full">
                    Configurar Valores de Cambio (COP, BS)
                </button>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select id="filter-rubro-select" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option value="">Todos los Rubros</option>
                        <!-- Opciones de rubro se cargarán aquí -->
                    </select>
                    <input type="text" id="search-precios-input" placeholder="Buscar producto por Segmento, Producto, Presentación..." class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                </div>

                <div id="productos-precios-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                    <!-- Los productos con sus precios se mostrarán aquí -->
                    <p class="text-gray-500">Cargando productos...</p>
                </div>

                <button id="btn-back-precios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal
                </button>
            </div>

            <!-- Contenedor para la sub-sección de valores de cambio -->
            <div id="exchange-rates-sub-section" class="hidden">
                <!-- El formulario de valores de cambio se cargará aquí -->
            </div>

            <!-- Botón para cerrar el modal principal -->
            <button id="close-precios-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const preciosMainContent = container.querySelector('#precios-main-content');
    const exchangeRatesSubSection = container.querySelector('#exchange-rates-sub-section');
    const productosPreciosListDiv = container.querySelector('#productos-precios-list');
    const searchInput = container.querySelector('#search-precios-input');
    const filterRubroSelect = container.querySelector('#filter-rubro-select');
    const btnBack = container.querySelector('#btn-back-precios');
    const closePreciosModalBtn = container.querySelector('#close-precios-modal');
    const btnShowExchangeRates = container.querySelector('#btn-show-exchange-rates');

    let allProducts = []; // Para almacenar todos los productos y filtrar sobre ellos
    let currentExchangeRates = { cop: 1, bs: 1 }; // Valores de cambio actuales
    let rubroSegmentoMap = {}; // Mapa de rubros y segmentos

    // Función para mostrar el contenido principal de la sección de precios
    const showMainPreciosContent = async () => {
        preciosMainContent.classList.remove('hidden');
        exchangeRatesSubSection.classList.add('hidden');

        // Recargar datos y renderizar la tabla
        currentExchangeRates = await obtenerValoresDeCambio(); // Asegurarse de tener los últimos valores
        allProducts = await verInventarioCompleto();
        renderProductsForPrices(allProducts);
    };

    // Función para renderizar el formulario de valores de cambio
    const renderExchangeRatesForm = async () => {
        preciosMainContent.classList.add('hidden');
        exchangeRatesSubSection.classList.remove('hidden');

        currentExchangeRates = await obtenerValoresDeCambio(); // Cargar los valores actuales
        exchangeRatesSubSection.innerHTML = `
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

        const copRateInput = exchangeRatesSubSection.querySelector('#cop-rate-input');
        const bsRateInput = exchangeRatesSubSection.querySelector('#bs-rate-input');
        const btnSaveExchangeRates = exchangeRatesSubSection.querySelector('#btn-save-exchange-rates');
        const btnBackFromExchangeRates = exchangeRatesSubSection.querySelector('#btn-back-from-exchange-rates');

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
                showMainPreciosContent(); // Volver a la vista principal de precios
            } else {
                showCustomAlert('Fallo al guardar valores de cambio.');
            }
        });

        btnBackFromExchangeRates.addEventListener('click', showMainPreciosContent);
    };

    // Función para renderizar la lista de productos con campos de precio
    const renderProductsForPrices = (productsToRender) => {
        productosPreciosListDiv.innerHTML = ''; // Limpiar lista
        if (productsToRender.length === 0) {
            productosPreciosListDiv.innerHTML = '<p class="text-gray-500">No hay productos para mostrar.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200';
        table.innerHTML = `
            <thead class="bg-gray-50 sticky top-0">
                <tr>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COP</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bs.</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <!-- Filas de productos se cargarán aquí -->
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        productsToRender.forEach(product => {
            const precioUSD = product.Precio || 0;
            const precioCOP = (precioUSD * currentExchangeRates.cop).toFixed(2);
            const precioBS = (precioUSD * currentExchangeRates.bs).toFixed(2);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100';
            row.innerHTML = `
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Segmento || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${precioUSD.toFixed(2)}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">COP ${precioCOP}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">Bs. ${precioBS}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                    <input type="number" step="0.01" value="${precioUSD.toFixed(2)}" class="w-24 p-1 border border-gray-300 rounded-md text-center new-price-input" data-product-id="${product.id}">
                    <button class="bg-blue-500 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-600 transition duration-200 update-price-btn" data-product-id="${product.id}">Actualizar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        productosPreciosListDiv.appendChild(table);

        // Añadir event listeners a los botones de actualización
        productosPreciosListDiv.querySelectorAll('.update-price-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const productId = event.target.dataset.productId;
                const newPriceInput = productosPreciosListDiv.querySelector(`.new-price-input[data-product-id="${productId}"]`);
                const newPrice = parseFloat(newPriceInput.value);

                if (isNaN(newPrice) || newPrice < 0) {
                    showCustomAlert('Por favor, ingrese un precio válido.');
                    return;
                }

                const updated = await modificarProducto(productId, { Precio: newPrice });
                if (updated) {
                    showCustomAlert('Precio actualizado con éxito.');
                    // Actualizar el precio en la lista local para reflejar el cambio
                    const productToUpdate = allProducts.find(p => p.id === productId);
                    if (productToUpdate) {
                        productToUpdate.Precio = newPrice;
                    }
                    renderProductsForPrices(allProducts); // Re-renderizar la tabla para mostrar el precio actualizado
                } else {
                    showCustomAlert('Fallo al actualizar el precio.');
                }
            });
        });
    };

    // Lógica para poblar el filtro de rubros
    rubroSegmentoMap = await obtenerConfiguracionRubrosSegmentos();
    Object.keys(rubroSegmentoMap).forEach(rubro => {
        const option = document.createElement('option');
        option.value = rubro;
        option.textContent = rubro;
        filterRubroSelect.appendChild(option);
    });

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
        renderProductsForPrices(filteredProducts);
    };

    searchInput.addEventListener('input', applyFilters);
    filterRubroSelect.addEventListener('change', applyFilters);


    // Lógica para el botón "Configurar Valores de Cambio"
    btnShowExchangeRates.addEventListener('click', renderExchangeRatesForm);

    // Lógica para cerrar el modal principal de precios
    closePreciosModalBtn.addEventListener('click', () => {
        console.log('Cerrar modal de Precios clickeado. Volviendo al menú principal de la aplicación.');
        container.classList.add('hidden'); // Oculta el modal
        backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
    });

    // Lógica para el botón "Volver al Menú Principal"
    btnBack.addEventListener('click', () => {
        console.log('Botón "Volver al Menú Principal" clickeado en Precios. Volviendo al menú principal de la aplicación.');
        container.classList.add('hidden'); // Oculta el modal
        backToMainMenuCallback(); // Vuelve al menú principal de la aplicación
    });

    // Inicialmente, mostrar el contenido principal de precios
    showMainPreciosContent();
    console.log('renderPreciosSection: Función completada.');
}
