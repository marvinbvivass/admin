// ventas.js
// Este archivo gestiona las operaciones de venta y el cierre de caja diario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { obtenerTodosLosClientes } from './clientes.js';
import { verInventarioCompleto, modificarProducto } from './inventario.js';
// Importa las funciones de alerta y confirmación personalizadas desde clientes.js
import { showCustomAlert, showCustomConfirm } from './clientes.js';

// ID fijo para el documento de configuración de valores de cambio (copiado de precios.js)
const EXCHANGE_RATES_DOC_ID = 'exchangeRates';

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en ventas.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en ventas.js.');
        throw new Error('Firebase DB no disponible.');
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Obtiene los valores de cambio (COP y BS) desde Firestore.
 * (Copiado de precios.js para evitar dependencias complejas)
 * @returns {Promise<{cop: number, bs: number}>} Los valores de cambio o valores predeterminados.
 */
async function getExchangeRates() {
    console.log('getExchangeRates: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, EXCHANGE_RATES_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            const data = configSnap.data();
            console.log('Valores de cambio obtenidos:', data);
            return {
                cop: parseFloat(data.cop || 1),
                bs: parseFloat(data.bs || 1)
            };
        } else {
            console.log('No se encontraron valores de cambio. Usando predeterminados (1:1).');
            return { cop: 1, bs: 1 };
        }
    } catch (error) {
        console.error('Error al obtener valores de cambio:', error);
        return { cop: 1, bs: 1 };
    } finally {
        console.log('getExchangeRates: Finalizado.');
    }
}

/**
 * Agrega una nueva venta a Firestore.
 * Los datos se guardarán en una colección compartida en la raíz.
 * Ruta: /datosVentas
 * @param {object} venta - Objeto con los datos de la venta.
 * @returns {Promise<string|null>} El ID del documento de la venta agregada o null si hubo un error.
 */
export async function agregarVenta(venta) {
    console.log('agregarVenta: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const ventasCollectionRef = collection(db, `datosVentas`); // Ruta modificada
        const docRef = await addDoc(ventasCollectionRef, venta);
        console.log('Venta agregada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar venta:', error);
        return null;
    } finally {
        console.log('agregarVenta: Finalizado.');
    }
}

/**
 * Obtiene todas las ventas de Firestore.
 * @returns {Promise<Array<object>>} Un array de objetos de venta.
 */
export async function obtenerTodasLasVentas() {
    console.log('obtenerTodasLasVentas: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const ventasCollectionRef = collection(db, `datosVentas`); // Ruta modificada
        const querySnapshot = await getDocs(ventasCollectionRef);
        const ventas = [];
        querySnapshot.forEach((doc) => {
            ventas.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todas las ventas obtenidas:', ventas);
        return ventas;
    } catch (error) {
        console.error('Error al obtener todas las ventas:', error);
        return [];
    } finally {
        console.log('obtenerTodasLasVentas: Finalizado.');
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de ventas dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de ventas.
 */
export async function renderVentasSection(container) {
    console.log('renderVentasSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderVentasSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Ventas</h2>

            <div id="ventas-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-show-realizar-venta" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Realizar Venta
                </button>
                <button id="btn-show-cierre-venta-diaria" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Cierre de Venta Diaria
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="ventas-sub-section" class="mt-8">
                <!-- El contenido de realizar venta o cierre de venta se cargará aquí -->
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-ventas-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const ventasMainButtonsContainer = container.querySelector('#ventas-main-buttons-container');
    const ventasSubSection = container.querySelector('#ventas-sub-section');
    const closeVentasModalBtn = container.querySelector('#close-ventas-modal');

    // Función para mostrar los botones principales y limpiar la sub-sección
    function showVentasMainButtons() { // Cambiado a function declaration
        ventasSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        ventasMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    }

    // Lógica para cerrar el modal
    if (closeVentasModalBtn) {
        closeVentasModalBtn.addEventListener('click', () => {
            container.classList.add('hidden'); // Oculta el modal
            showVentasMainButtons(); // Vuelve a la vista de botones principales al cerrar
        });
    } else {
        console.error('renderVentasSection: Botón #close-ventas-modal no encontrado.');
    }


    // Lógica para mostrar la sección de realizar venta
    const btnShowRealizarVenta = container.querySelector('#btn-show-realizar-venta');
    if (btnShowRealizarVenta) {
        btnShowRealizarVenta.addEventListener('click', async () => {
            ventasMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderRealizarVentaForm(ventasSubSection, showVentasMainButtons);
        });
    } else {
        console.error('renderVentasSection: Botón #btn-show-realizar-venta no encontrado.');
    }


    // Lógica para mostrar la sección de cierre de venta diaria
    const btnShowCierreVentaDiaria = container.querySelector('#btn-show-cierre-venta-diaria');
    if (btnShowCierreVentaDiaria) {
        btnShowCierreVentaDiaria.addEventListener('click', async () => {
            ventasMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
            await renderCierreVentaDiariaSection(ventasSubSection, showVentasMainButtons);
        });
    } else {
        console.error('renderVentasSection: Botón #btn-show-cierre-venta-diaria no encontrado.');
    }


    // --- Funciones para Realizar Venta (Modificadas) ---
    async function renderRealizarVentaForm(parentContainer, backToMainMenuCallback) { // Cambiado a function declaration
        console.log('renderRealizarVentaForm: Iniciando...');
        let selectedClient = null;
        let allClients = await obtenerTodosLosClientes();
        let allProducts = await verInventarioCompleto();
        let rubroSegmentoMap = {}; // Se cargará si es necesario para el filtro de rubro
        let currentExchangeRates = { cop: 1, bs: 1 }; // Valores de cambio

        // Obtener la configuración de rubros y segmentos (similar a inventario.js)
        console.log('renderRealizarVentaForm: Obteniendo configuración de rubros y segmentos...');
        try {
            const { db } = await getFirestoreInstances();
            const configDocRef = doc(db, `configuracion`, 'rubrosSegmentos'); // Ruta modificada
            const configSnap = await getDoc(configDocRef);
            if (configSnap.exists()) {
                rubroSegmentoMap = configSnap.data().mapa || {};
            }
            // Obtener valores de cambio
            currentExchangeRates = await getExchangeRates();
            console.log('renderRealizarVentaForm: Valores de cambio obtenidos:', currentExchangeRates);
        } catch (error) {
            console.error('renderRealizarVentaForm: Error al obtener configuración para ventas:', error);
        }

        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Realizar Nueva Venta</h3>

                <!-- Sección de Selección de Cliente (más compacta) -->
                <div class="mb-3 p-2 border border-blue-200 rounded-md">
                    <h4 class="text-base font-semibold text-blue-700 mb-1">1. Seleccionar Cliente</h4>
                    <input type="text" id="search-cliente-venta-input" placeholder="Buscar cliente por nombre o CEP" class="w-full p-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1">
                    <div id="clientes-venta-list" class="bg-white p-1 rounded-md border border-gray-200 max-h-24 overflow-y-auto mb-1 text-xs">
                        <p class="text-gray-500">Busque un cliente para seleccionarlo.</p>
                    </div>
                    <p id="selected-client-display" class="font-medium text-gray-800 text-xs">Cliente Seleccionado: Ninguno</p>
                </div>

                <!-- Sección de Productos Disponibles (Tabla Grande) -->
                <div class="mb-4 p-4 border border-blue-200 rounded-md" id="productos-para-venta-section">
                    <h4 class="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
                        <span>2. Productos Disponibles</span>
                        <span class="text-lg font-bold text-gray-900">Total: $<span id="total-venta-display">0.00</span></span>
                    </h4>
                    <div class="mb-3">
                        <label for="filter-rubro-venta" class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Rubro:</label>
                        <select id="filter-rubro-venta" class="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Todos los Rubros</option>
                            ${Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                        </select>
                    </div>
                    <div class="bg-white p-1 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50 sticky top-0">
                                <tr>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio ($)</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal ($)</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COP</th>
                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BS</th>
                                </tr>
                            </thead>
                            <tbody id="productos-venta-table-body" class="bg-white divide-y divide-gray-200">
                                <!-- Filas de productos se cargarán aquí -->
                                <tr><td colspan="8" class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 text-center">Seleccione un cliente para ver los productos.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <button id="btn-finalizar-venta" class="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200" disabled>
                    Finalizar Venta
                </button>

                <button id="btn-back-from-realizar-venta" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        // Referencias a elementos del DOM
        const searchClienteInput = parentContainer.querySelector('#search-cliente-venta-input');
        const clientesVentaListDiv = parentContainer.querySelector('#clientes-venta-list');
        const selectedClientDisplay = parentContainer.querySelector('#selected-client-display');
        const productosParaVentaSection = parentContainer.querySelector('#productos-para-venta-section');
        const totalVentaDisplay = parentContainer.querySelector('#total-venta-display');
        const filterRubroVentaSelect = parentContainer.querySelector('#filter-rubro-venta');
        const productosVentaTableBody = parentContainer.querySelector('#productos-venta-table-body');
        const btnFinalizarVenta = parentContainer.querySelector('#btn-finalizar-venta');
        const btnBack = parentContainer.querySelector('#btn-back-from-realizar-venta');

        // Inicialmente ocultar la sección de productos y deshabilitar el botón de finalizar venta
        productosParaVentaSection.classList.add('hidden');
        btnFinalizarVenta.disabled = true;

        // --- Lógica de Selección de Cliente ---
        const renderClientList = (clientsToRender) => {
            clientesVentaListDiv.innerHTML = '';
            if (clientsToRender.length === 0) {
                clientesVentaListDiv.innerHTML = '<p class="text-gray-500">No se encontraron clientes.</p>';
                return;
            }
            clientsToRender.forEach(client => {
                const clientDiv = document.createElement('div');
                clientDiv.className = 'p-1 hover:bg-blue-100 cursor-pointer rounded-md'; // Reduced padding
                clientDiv.textContent = `${client.NombreComercial} (${client.NombrePersonal}) - ${client.Zona}, ${client.Sector}`;
                clientDiv.addEventListener('click', () => {
                    selectedClient = client;
                    selectedClientDisplay.textContent = `Cliente Seleccionado: ${client.NombreComercial} (${client.NombrePersonal})`;
                    clientesVentaListDiv.innerHTML = ''; // Limpiar lista después de seleccionar
                    searchClienteInput.value = ''; // Limpiar input de búsqueda
                    productosParaVentaSection.classList.remove('hidden'); // Mostrar la sección de productos
                    renderProductTable(allProducts); // Renderizar todos los productos inicialmente
                    checkFinalizarVentaButtonStatus(); // Actualizar estado del botón y total
                });
                clientesVentaListDiv.appendChild(clientDiv);
            });
        };

        if (searchClienteInput) {
            searchClienteInput.addEventListener('input', () => {
                const searchTerm = searchClienteInput.value.toLowerCase();
                const filteredClients = allClients.filter(client =>
                    (client.NombreComercial && client.NombreComercial.toLowerCase().includes(searchTerm)) ||
                    (client.NombrePersonal && client.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                    (client.CEP && client.CEP.toLowerCase().includes(searchTerm))
                );
                renderClientList(filteredClients);
            });
        } else {
            console.error('renderRealizarVentaForm: Input #search-cliente-venta-input no encontrado.');
        }


        // --- Lógica de Tabla de Productos y Cantidades ---
        const renderProductTable = (productsToRender) => {
            productosVentaTableBody.innerHTML = ''; // Limpiar tabla

            if (productsToRender.length === 0) {
                productosVentaTableBody.innerHTML = `<tr><td colspan="8" class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 text-center">No hay productos disponibles.</td></tr>`;
                return;
            }

            productsToRender.forEach(product => {
                const precioUSD = product.Precio || 0;
                const precioCOP = (precioUSD * currentExchangeRates.cop).toFixed(2);
                const precioBS = (precioUSD * currentExchangeRates.bs).toFixed(2);

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-100';
                row.innerHTML = `
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${precioUSD.toFixed(2)}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500" data-stock="${product.Cantidad || 0}">${product.Cantidad || 0}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        <input type="number" min="0" value="0" class="w-20 p-1 border border-gray-300 rounded-md text-center quantity-input" data-product-id="${product.id}" data-product-price="${precioUSD}">
                    </td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 subtotal-display">$0.00</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">COP ${precioCOP}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">BS ${precioBS}</td>
                `;
                productosVentaTableBody.appendChild(row);
            });

            // Añadir event listeners para los inputs de cantidad para actualizar el estado del botón Finalizar Venta y el subtotal/total
            productosVentaTableBody.querySelectorAll('.quantity-input').forEach(input => {
                input.addEventListener('input', (event) => {
                    const quantity = parseInt(event.target.value) || 0;
                    const price = parseFloat(event.target.dataset.productPrice);
                    const subtotal = quantity * price;
                    event.target.closest('tr').querySelector('.subtotal-display').textContent = `$${subtotal.toFixed(2)}`;
                    checkFinalizarVentaButtonStatus(); // Recalcular total y habilitar/deshabilitar botón
                });
            });
        };

        if (filterRubroVentaSelect) {
            filterRubroVentaSelect.addEventListener('change', () => {
                const selectedRubro = filterRubroVentaSelect.value;
                let filteredProducts = allProducts;
                if (selectedRubro) {
                    filteredProducts = allProducts.filter(p => p.Rubro === selectedRubro);
                }
                renderProductTable(filteredProducts);
            });
        } else {
            console.error('renderRealizarVentaForm: Select #filter-rubro-venta no encontrado.');
        }


        // --- Lógica de Finalizar Venta ---
        const checkFinalizarVentaButtonStatus = () => {
            const hasClient = selectedClient !== null;
            let totalCurrentSale = 0;
            let hasAnyQuantity = false;

            productosVentaTableBody.querySelectorAll('.quantity-input').forEach(input => {
                const quantity = parseInt(input.value) || 0;
                const price = parseFloat(input.dataset.productPrice);
                totalCurrentSale += (quantity * price);
                if (quantity > 0) {
                    hasAnyQuantity = true;
                }
            });

            totalVentaDisplay.textContent = totalCurrentSale.toFixed(2);
            btnFinalizarVenta.disabled = !(hasClient && hasAnyQuantity);
        };

        if (btnFinalizarVenta) {
            btnFinalizarVenta.addEventListener('click', async () => {
                if (!selectedClient) {
                    showCustomAlert('Por favor, seleccione un cliente.');
                    return;
                }

                const productsToProcess = [];
                let totalVentaCalculado = 0;
                let validationError = false;

                // Recopilar productos y cantidades de la tabla
                productosVentaTableBody.querySelectorAll('tr').forEach(row => {
                    const quantityInput = row.querySelector('.quantity-input');
                    if (!quantityInput) return; // Skip header row or empty message rows

                    const productId = quantityInput.dataset.productId;
                    const cantidad = parseInt(quantityInput.value);
                    const stockElement = row.querySelector('td[data-stock]');
                    const availableStock = parseInt(stockElement.dataset.stock);
                    const productPrice = parseFloat(quantityInput.dataset.productPrice);


                    if (cantidad > 0) {
                        const productData = allProducts.find(p => p.id === productId);
                        if (!productData) {
                            showCustomAlert(`Error: Producto con ID ${productId} no encontrado.`);
                            validationError = true;
                            return;
                        }
                        if (isNaN(cantidad) || cantidad <= 0) {
                            showCustomAlert(`Error: Cantidad inválida para ${productData.Producto}.`);
                            validationError = true;
                            return;
                        }
                        if (cantidad > availableStock) {
                            showCustomAlert(`Error: Cantidad de ${productData.Producto} (${cantidad}) excede el stock disponible (${availableStock}).`);
                            validationError = true;
                            return;
                        }

                        const subtotal = cantidad * productPrice;
                        totalVentaCalculado += subtotal;

                        productsToProcess.push({
                            productId: productData.id,
                            nombre: productData.Producto,
                            presentacion: productData.Presentacion,
                            sku: productData.Sku,
                            cantidad: cantidad,
                            precioUnitario: productPrice,
                            subtotal: subtotal
                        });
                    }
                });

                if (validationError) {
                    return; // Detener si hubo errores de validación
                }
                if (productsToProcess.length === 0) {
                    showCustomAlert('No hay productos con cantidad seleccionada para la venta.');
                    return;
                }

                // No hay método de pago ni observaciones en esta versión simplificada
                const ventaData = {
                    clienteId: selectedClient.id,
                    nombreCliente: selectedClient.NombreComercial,
                    fecha: new Date().toISOString(), // Fecha y hora actual
                    productos: productsToProcess,
                    totalVenta: totalVentaCalculado,
                };

                // 1. Actualizar el stock en inventario para cada producto vendido
                for (const item of productsToProcess) {
                    const productInDb = allProducts.find(p => p.id === item.productId);
                    if (productInDb) {
                        const newCantidad = productInDb.Cantidad - item.cantidad;
                        await modificarProducto(item.productId, { Cantidad: newCantidad });
                    }
                }

                // 2. Registrar la venta
                const ventaId = await agregarVenta(ventaData);

                if (ventaId) {
                    showCustomAlert('Venta realizada con éxito! ID: ' + ventaId);
                    // Resetear el formulario
                    selectedClient = null;
                    selectedClientDisplay.textContent = 'Cliente Seleccionado: Ninguno';
                    searchClienteInput.value = '';
                    productosParaVentaSection.classList.add('hidden'); // Ocultar sección de productos
                    btnFinalizarVenta.disabled = true;
                    totalVentaDisplay.textContent = '0.00'; // Resetear el total

                    // Recargar todos los productos para reflejar el stock actualizado
                    allProducts = await verInventarioCompleto();
                    // Recargar clientes (si fuera necesario por cambios de deuda, etc., aunque aquí no se gestiona)
                    allClients = await obtenerTodosLosClientes();
                } else {
                    showCustomAlert('Fallo al finalizar la venta.');
                }
            });
        } else {
            console.error('renderRealizarVentaForm: Botón #btn-finalizar-venta no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderRealizarVentaForm: Botón #btn-back-from-realizar-venta no encontrado.');
        }
        console.log('renderRealizarVentaForm: Finalizado.');
    }

    // --- Funciones para Cierre de Venta Diaria (Sin cambios) ---
    async function renderCierreVentaDiariaSection(parentContainer, backToMainMenuCallback) { // Cambiado a function declaration
        console.log('renderCierreVentaDiariaSection: Iniciando...');
        parentContainer.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Cierre de Venta Diaria</h3>

                <div class="mb-4">
                    <label for="cierre-fecha-input" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Fecha:</label>
                    <input type="date" id="cierre-fecha-input" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>

                <button id="btn-generar-cierre" class="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200 mb-4">
                    Generar Cierre
                </button>

                <div id="cierre-resultados" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                    <p class="text-gray-500">Seleccione una fecha y genere el cierre.</p>
                </div>

                <button id="btn-back-from-cierre" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const cierreFechaInput = parentContainer.querySelector('#cierre-fecha-input');
        const btnGenerarCierre = parentContainer.querySelector('#btn-generar-cierre');
        const cierreResultadosDiv = parentContainer.querySelector('#cierre-resultados');
        const btnBack = parentContainer.querySelector('#btn-back-from-cierre');

        // Establecer la fecha actual por defecto
        if (cierreFechaInput) {
            cierreFechaInput.valueAsDate = new Date();
        } else {
            console.error('renderCierreVentaDiariaSection: Input #cierre-fecha-input no encontrado.');
        }


        if (btnGenerarCierre) {
            btnGenerarCierre.addEventListener('click', async () => {
                const selectedDate = cierreFechaInput?.value;
                if (!selectedDate) {
                    showCustomAlert('Por favor, seleccione una fecha.');
                    return;
                }

                if (cierreResultadosDiv) {
                    cierreResultadosDiv.innerHTML = '<p class="text-gray-500">Generando cierre...</p>';
                }


                try {
                    const { db } = await getFirestoreInstances();
                    const ventasCollectionRef = collection(db, `datosVentas`); // Ruta modificada

                    // Rango de fechas para el día seleccionado
                    const startOfDay = new Date(selectedDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(selectedDate);
                    endOfDay.setHours(23, 59, 59, 999);

                    // Consulta para ventas en el rango de fecha
                    const q = query(
                        ventasCollectionRef,
                        where('fecha', '>=', startOfDay.toISOString()),
                        where('fecha', '<=', endOfDay.toISOString())
                    );
                    const querySnapshot = await getDocs(q);

                    let totalVentasDia = 0;
                    const ventasPorMetodoPago = {}; // Aún se mantiene para el reporte de cierre si existieran datos previos
                    const productosVendidos = {};

                    querySnapshot.forEach(docSnap => {
                        const venta = docSnap.data();
                        totalVentasDia += venta.totalVenta || 0;

                        // Sumar por método de pago (si existiera en ventas antiguas)
                        const metodo = venta.metodoPago || 'No Especificado'; // Podría ser undefined si no se registra
                        if (venta.metodoPago) { // Solo si el campo existe en la venta
                            ventasPorMetodoPago[metodo] = (ventasPorMetodoPago[metodo] || 0) + venta.totalVenta;
                        } else {
                            // Si no hay método de pago, se puede agrupar como "Venta Directa" o similar
                            ventasPorMetodoPago['Venta Directa'] = (ventasPorMetodoPago['Venta Directa'] || 0) + venta.totalVenta;
                        }


                        // Sumar productos vendidos
                        venta.productos.forEach(item => {
                            const key = `${item.nombre} (${item.presentacion}) - ${item.sku}`;
                            productosVendidos[key] = (productosVendidos[key] || 0) + item.cantidad;
                        });
                    });

                    let resultadosHTML = `
                        <h4 class="text-xl font-semibold text-gray-800 mb-3">Resumen del Día: ${selectedDate}</h4>
                        <p class="text-lg font-bold text-gray-900 mb-3">Total de Ventas: $${totalVentasDia.toFixed(2)}</p>

                        <h5 class="font-semibold text-gray-700 mb-2">Ventas por Método de Pago:</h5>
                        <ul class="list-disc pl-5 mb-3">
                    `;
                    if (Object.keys(ventasPorMetodoPago).length > 0) {
                        for (const metodo in ventasPorMetodoPago) {
                            resultadosHTML += `<li>${metodo}: $${ventasPorMetodoPago[metodo].toFixed(2)}</li>`;
                        }
                    } else {
                        resultadosHTML += `<li>No hay ventas registradas con método de pago para esta fecha.</li>`;
                    }
                    resultadosHTML += `</ul>`;

                    resultadosHTML += `
                        <h5 class="font-semibold text-gray-700 mb-2">Productos Vendidos:</h5>
                        <ul class="list-disc pl-5">
                    `;
                    if (Object.keys(productosVendidos).length > 0) {
                        for (const producto in productosVendidos) {
                            resultadosHTML += `<li>${producto}: ${productosVendidos[producto]} unidades</li>`;
                        }
                    } else {
                        resultadosHTML += `<li>No hay productos vendidos para esta fecha.</li>`;
                    }
                    resultadosHTML += `</ul>`;

                    if (cierreResultadosDiv) {
                        cierreResultadosDiv.innerHTML = resultadosHTML;
                    }

                } catch (error) {
                    console.error('Error al generar cierre de venta:', error);
                    if (cierreResultadosDiv) {
                        cierreResultadosDiv.innerHTML = '<p class="text-red-600">Error al generar el cierre. Verifique la consola para más detalles.</p>';
                    }
                }
            });
        } else {
            console.error('renderCierreVentaDiariaSection: Botón #btn-generar-cierre no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderCierreVentaDiariaSection: Botón #btn-back-from-cierre no encontrado.');
        }
        console.log('renderCierreVentaDiariaSection: Finalizado.');
    }
    console.log('renderVentasSection: Función completada.');
}

