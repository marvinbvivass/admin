// ventas.js
// Este archivo gestiona las operaciones de venta y el cierre de caja diario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { obtenerTodosLosClientes } from './clientes.js';
import { verInventarioCompleto, modificarProducto } from './inventario.js';

// Función auxiliar para obtener la instancia de Firestore y el ID de usuario/appId
async function getFirestoreInstances() {
    while (!window.firebaseDb || !window.currentUserId || !window.currentAppId) {
        console.log('Esperando inicialización de Firebase en ventas.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
        userId: window.currentUserId,
        appId: window.currentAppId
    };
}

/**
 * Agrega una nueva venta a Firestore.
 * @param {object} venta - Objeto con los datos de la venta.
 * @returns {Promise<string|null>} El ID del documento de la venta agregada o null si hubo un error.
 */
export async function agregarVenta(venta) {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const ventasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/datosVentas`);
        const docRef = await addDoc(ventasCollectionRef, venta);
        console.log('Venta agregada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar venta:', error);
        return null;
    }
}

/**
 * Obtiene todas las ventas de Firestore para el usuario actual.
 * @returns {Promise<Array<object>>} Un array de objetos de venta.
 */
export async function obtenerTodasLasVentas() {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const ventasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/datosVentas`);
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
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de ventas dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de ventas.
 */
export async function renderVentasSection(container) {
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
    const showVentasMainButtons = () => {
        ventasSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        ventasMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    };

    // Lógica para cerrar el modal
    closeVentasModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        showVentasMainButtons(); // Vuelve a la vista de botones principales al cerrar
    });

    // Lógica para mostrar la sección de realizar venta
    container.querySelector('#btn-show-realizar-venta').addEventListener('click', async () => {
        ventasMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        await renderRealizarVentaForm(ventasSubSection, showVentasMainButtons);
    });

    // Lógica para mostrar la sección de cierre de venta diaria
    container.querySelector('#btn-show-cierre-venta-diaria').addEventListener('click', async () => {
        ventasMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        await renderCierreVentaDiariaSection(ventasSubSection, showVentasMainButtons);
    });

    // --- Funciones para Realizar Venta ---
    async function renderRealizarVentaForm(parentContainer, backToMainMenuCallback) {
        let selectedClient = null;
        let cart = []; // Array para almacenar productos en el carrito

        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Realizar Nueva Venta</h3>

                <!-- Selección de Cliente -->
                <div class="mb-6 p-4 border border-blue-200 rounded-md">
                    <h4 class="text-xl font-semibold text-blue-700 mb-3">1. Seleccionar Cliente</h4>
                    <input type="text" id="search-cliente-venta-input" placeholder="Buscar cliente por nombre o CEP" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3">
                    <div id="clientes-venta-list" class="bg-white p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto mb-3">
                        <p class="text-gray-500">Busque un cliente para seleccionarlo.</p>
                    </div>
                    <p id="selected-client-display" class="font-medium text-gray-800">Cliente Seleccionado: Ninguno</p>
                </div>

                <!-- Añadir Productos a la Venta -->
                <div class="mb-6 p-4 border border-blue-200 rounded-md">
                    <h4 class="text-xl font-semibold text-blue-700 mb-3">2. Añadir Productos</h4>
                    <input type="text" id="search-producto-venta-input" placeholder="Buscar producto por SKU o nombre" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3">
                    <div id="productos-venta-list" class="bg-white p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto mb-3">
                        <p class="text-gray-500">Busque un producto para añadirlo al carrito.</p>
                    </div>
                    <div class="flex items-center gap-2 mt-3">
                        <input type="number" id="cantidad-producto-input" placeholder="Cantidad" class="w-24 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button id="btn-add-to-cart" class="bg-blue-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-600 transition duration-200" disabled>
                            Añadir al Carrito
                        </button>
                    </div>
                </div>

                <!-- Carrito de Compras -->
                <div class="mb-6 p-4 border border-blue-200 rounded-md">
                    <h4 class="text-xl font-semibold text-blue-700 mb-3">3. Carrito de Compras</h4>
                    <div id="cart-items-list" class="bg-white p-3 rounded-md border border-gray-200 max-h-40 overflow-y-auto mb-3">
                        <p class="text-gray-500">El carrito está vacío.</p>
                    </div>
                    <p class="text-lg font-bold text-gray-900">Total Venta: $<span id="total-venta-display">0.00</span></p>
                </div>

                <!-- Detalles Finales de la Venta -->
                <div class="mb-6 p-4 border border-blue-200 rounded-md">
                    <h4 class="text-xl font-semibold text-blue-700 mb-3">4. Detalles y Confirmación</h4>
                    <select id="metodo-pago-select" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3">
                        <option value="">-- Selecciona Método de Pago --</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Punto de Venta">Punto de Venta</option>
                        <option value="Credito">Crédito</option>
                    </select>
                    <textarea id="observaciones-venta-input" placeholder="Observaciones de la venta (opcional)" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"></textarea>
                    <button id="btn-confirmar-venta" class="w-full bg-green-600 text-white p-3 rounded-md font-semibold hover:bg-green-700 transition duration-200" disabled>
                        Confirmar Venta
                    </button>
                </div>

                <button id="btn-back-from-realizar-venta" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        // Referencias a elementos del DOM
        const searchClienteInput = parentContainer.querySelector('#search-cliente-venta-input');
        const clientesVentaListDiv = parentContainer.querySelector('#clientes-venta-list');
        const selectedClientDisplay = parentContainer.querySelector('#selected-client-display');

        const searchProductoInput = parentContainer.querySelector('#search-producto-venta-input');
        const productosVentaListDiv = parentContainer.querySelector('#productos-venta-list');
        const cantidadProductoInput = parentContainer.querySelector('#cantidad-producto-input');
        const btnAddToCart = parentContainer.querySelector('#btn-add-to-cart');

        const cartItemsListDiv = parentContainer.querySelector('#cart-items-list');
        const totalVentaDisplay = parentContainer.querySelector('#total-venta-display');

        const metodoPagoSelect = parentContainer.querySelector('#metodo-pago-select');
        const observacionesVentaInput = parentContainer.querySelector('#observaciones-venta-input');
        const btnConfirmarVenta = parentContainer.querySelector('#btn-confirmar-venta');
        const btnBack = parentContainer.querySelector('#btn-back-from-realizar-venta');

        let allClients = await obtenerTodosLosClientes();
        let allProducts = await verInventarioCompleto();
        let selectedProductForCart = null;

        // --- Lógica de Selección de Cliente ---
        const renderClientList = (clientsToRender) => {
            clientesVentaListDiv.innerHTML = '';
            if (clientsToRender.length === 0) {
                clientesVentaListDiv.innerHTML = '<p class="text-gray-500">No se encontraron clientes.</p>';
                return;
            }
            clientsToRender.forEach(client => {
                const clientDiv = document.createElement('div');
                clientDiv.className = 'p-2 hover:bg-blue-100 cursor-pointer rounded-md';
                clientDiv.textContent = `${client.NombreComercial} (${client.NombrePersonal}) - ${client.Zona}, ${client.Sector}`;
                clientDiv.addEventListener('click', () => {
                    selectedClient = client;
                    selectedClientDisplay.textContent = `Cliente Seleccionado: ${client.NombreComercial} (${client.NombrePersonal})`;
                    clientesVentaListDiv.innerHTML = ''; // Limpiar lista después de seleccionar
                    searchClienteInput.value = ''; // Limpiar input de búsqueda
                    checkConfirmButtonStatus();
                });
                clientesVentaListDiv.appendChild(clientDiv);
            });
        };

        searchClienteInput.addEventListener('input', () => {
            const searchTerm = searchClienteInput.value.toLowerCase();
            const filteredClients = allClients.filter(client =>
                (client.NombreComercial && client.NombreComercial.toLowerCase().includes(searchTerm)) ||
                (client.NombrePersonal && client.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                (client.CEP && client.CEP.toLowerCase().includes(searchTerm))
            );
            renderClientList(filteredClients);
        });

        // --- Lógica de Selección de Producto y Carrito ---
        const renderProductList = (productsToRender) => {
            productosVentaListDiv.innerHTML = '';
            if (productsToRender.length === 0) {
                productosVentaListDiv.innerHTML = '<p class="text-gray-500">No se encontraron productos.</p>';
                return;
            }
            productsToRender.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'p-2 hover:bg-blue-100 cursor-pointer rounded-md';
                productDiv.textContent = `${product.Producto} (${product.Presentacion}) - SKU: ${product.Sku} - Precio: $${(product.Precio || 0).toFixed(2)} - Stock: ${product.Cantidad}`;
                productDiv.addEventListener('click', () => {
                    selectedProductForCart = product;
                    searchProductoInput.value = `${product.Producto} - ${product.Sku}`; // Muestra el producto seleccionado
                    btnAddToCart.disabled = false; // Habilitar añadir al carrito
                });
                productosVentaListDiv.appendChild(productDiv);
            });
        };

        searchProductoInput.addEventListener('input', () => {
            const searchTerm = searchProductoInput.value.toLowerCase();
            const filteredProducts = allProducts.filter(product =>
                (product.Sku && product.Sku.toLowerCase().includes(searchTerm)) ||
                (product.Producto && product.Producto.toLowerCase().includes(searchTerm))
            );
            renderProductList(filteredProducts);
        });

        btnAddToCart.addEventListener('click', () => {
            const cantidad = parseInt(cantidadProductoInput.value);
            if (!selectedProductForCart) {
                alert('Por favor, seleccione un producto.');
                return;
            }
            if (isNaN(cantidad) || cantidad <= 0) {
                alert('Por favor, ingrese una cantidad válida.');
                return;
            }
            if (cantidad > selectedProductForCart.Cantidad) {
                alert(`No hay suficiente stock. Disponible: ${selectedProductForCart.Cantidad}`);
                return;
            }

            // Verificar si el producto ya está en el carrito
            const existingItemIndex = cart.findIndex(item => item.productId === selectedProductForCart.id);

            if (existingItemIndex > -1) {
                // Si ya existe, actualizar la cantidad
                cart[existingItemIndex].cantidad += cantidad;
                cart[existingItemIndex].subtotal = cart[existingItemIndex].cantidad * cart[existingItemIndex].precioUnitario;
            } else {
                // Si no existe, añadirlo como nuevo
                cart.push({
                    productId: selectedProductForCart.id,
                    nombre: selectedProductForCart.Producto,
                    presentacion: selectedProductForCart.Presentacion,
                    sku: selectedProductForCart.Sku,
                    cantidad: cantidad,
                    precioUnitario: selectedProductForCart.Precio,
                    subtotal: cantidad * selectedProductForCart.Precio
                });
            }

            // Restar del stock "virtual" para la venta actual (no se guarda aún)
            selectedProductForCart.Cantidad -= cantidad;

            renderCart();
            cantidadProductoInput.value = ''; // Limpiar cantidad
            searchProductoInput.value = ''; // Limpiar búsqueda de producto
            selectedProductForCart = null; // Resetear producto seleccionado
            btnAddToCart.disabled = true; // Deshabilitar añadir al carrito
            checkConfirmButtonStatus();
        });

        const renderCart = () => {
            cartItemsListDiv.innerHTML = '';
            let totalVenta = 0;

            if (cart.length === 0) {
                cartItemsListDiv.innerHTML = '<p class="text-gray-500">El carrito está vacío.</p>';
            } else {
                cart.forEach((item, index) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'flex justify-between items-center p-1 border-b border-gray-100';
                    itemDiv.innerHTML = `
                        <span>${item.nombre} (${item.presentacion}) - ${item.cantidad} x $${item.precioUnitario.toFixed(2)}</span>
                        <button class="bg-red-400 text-white px-2 py-0.5 rounded-md text-xs hover:bg-red-500 remove-from-cart-btn" data-index="${index}">Eliminar</button>
                    `;
                    cartItemsListDiv.appendChild(itemDiv);
                    totalVenta += item.subtotal;
                });
            }
            totalVentaDisplay.textContent = totalVenta.toFixed(2);
            checkConfirmButtonStatus();

            // Añadir event listeners para eliminar del carrito
            cartItemsListDiv.querySelectorAll('.remove-from-cart-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const indexToRemove = parseInt(event.target.dataset.index);
                    const removedItem = cart.splice(indexToRemove, 1)[0];

                    // Devolver la cantidad al stock "virtual" del producto original
                    const originalProduct = allProducts.find(p => p.id === removedItem.productId);
                    if (originalProduct) {
                        originalProduct.Cantidad += removedItem.cantidad;
                    }
                    renderCart();
                });
            });
        };

        // --- Lógica de Confirmación de Venta ---
        const checkConfirmButtonStatus = () => {
            const hasClient = selectedClient !== null;
            const hasItemsInCart = cart.length > 0;
            const isPaymentMethodSelected = metodoPagoSelect.value !== '';
            btnConfirmarVenta.disabled = !(hasClient && hasItemsInCart && isPaymentMethodSelected);
        };

        metodoPagoSelect.addEventListener('change', checkConfirmButtonStatus);

        btnConfirmarVenta.addEventListener('click', async () => {
            if (!selectedClient) {
                alert('Por favor, seleccione un cliente.');
                return;
            }
            if (cart.length === 0) {
                alert('El carrito está vacío. Añada productos para realizar la venta.');
                return;
            }
            const metodoPago = metodoPagoSelect.value;
            if (!metodoPago) {
                alert('Por favor, seleccione un método de pago.');
                return;
            }

            const totalVenta = parseFloat(totalVentaDisplay.textContent);
            const observaciones = observacionesVentaInput.value.trim();

            const ventaData = {
                clienteId: selectedClient.id,
                nombreCliente: selectedClient.NombreComercial,
                fecha: new Date().toISOString(), // Fecha y hora actual
                productos: cart.map(item => ({
                    productId: item.productId,
                    nombre: item.nombre,
                    presentacion: item.presentacion,
                    sku: item.sku,
                    cantidad: item.cantidad,
                    precioUnitario: item.precioUnitario,
                    subtotal: item.subtotal
                })),
                totalVenta: totalVenta,
                metodoPago: metodoPago,
                observaciones: observaciones
            };

            // 1. Actualizar el stock en inventario
            for (const item of cart) {
                const productInDb = allProducts.find(p => p.id === item.productId);
                if (productInDb) {
                    const newCantidad = productInDb.Cantidad - item.cantidad;
                    await modificarProducto(item.productId, { Cantidad: newCantidad });
                }
            }

            // 2. Actualizar la deuda del cliente si el método de pago es "Crédito"
            if (metodoPago === 'Credito') {
                const nuevaDeuda = (selectedClient.Deuda || 0) + totalVenta;
                await updateDoc(doc(window.firebaseDb, `artifacts/${window.currentAppId}/users/${window.currentUserId}/datosClientes`, selectedClient.id), { Deuda: nuevaDeuda });
                selectedClient.Deuda = nuevaDeuda; // Actualizar el objeto cliente en memoria
            }

            // 3. Registrar la venta
            const ventaId = await agregarVenta(ventaData);

            if (ventaId) {
                alert('Venta realizada con éxito! ID: ' + ventaId);
                // Resetear el formulario
                selectedClient = null;
                cart = [];
                selectedClientDisplay.textContent = 'Cliente Seleccionado: Ninguno';
                searchClienteInput.value = '';
                searchProductoInput.value = '';
                cantidadProductoInput.value = '';
                metodoPagoSelect.value = '';
                observacionesVentaInput.value = '';
                renderCart(); // Limpiar el carrito visualmente
                btnConfirmarVenta.disabled = true;
                // Recargar todos los productos para reflejar el stock actualizado
                allProducts = await verInventarioCompleto();
                // Opcional: Recargar clientes si la deuda es visible en la lista de clientes
                allClients = await obtenerTodosLosClientes();
            } else {
                alert('Fallo al realizar la venta.');
            }
        });

        btnBack.addEventListener('click', backToMainMenuCallback);
    }

    // --- Funciones para Cierre de Venta Diaria ---
    async function renderCierreVentaDiariaSection(parentContainer, backToMainMenuCallback) {
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
        cierreFechaInput.valueAsDate = new Date();

        btnGenerarCierre.addEventListener('click', async () => {
            const selectedDate = cierreFechaInput.value;
            if (!selectedDate) {
                alert('Por favor, seleccione una fecha.');
                return;
            }

            cierreResultadosDiv.innerHTML = '<p class="text-gray-500">Generando cierre...</p>';

            try {
                const { db, userId, appId } = await getFirestoreInstances();
                const ventasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/datosVentas`);

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
                const ventasPorMetodoPago = {};
                const productosVendidos = {};

                querySnapshot.forEach(docSnap => {
                    const venta = docSnap.data();
                    totalVentasDia += venta.totalVenta || 0;

                    // Sumar por método de pago
                    const metodo = venta.metodoPago || 'Desconocido';
                    ventasPorMetodoPago[metodo] = (ventasPorMetodoPago[metodo] || 0) + venta.totalVenta;

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
                for (const metodo in ventasPorMetodoPago) {
                    resultadosHTML += `<li>${metodo}: $${ventasPorMetodoPago[metodo].toFixed(2)}</li>`;
                }
                resultadosHTML += `</ul>`;

                resultadosHTML += `
                    <h5 class="font-semibold text-gray-700 mb-2">Productos Vendidos:</h5>
                    <ul class="list-disc pl-5">
                `;
                for (const producto in productosVendidos) {
                    resultadosHTML += `<li>${producto}: ${productosVendidos[producto]} unidades</li>`;
                }
                resultadosHTML += `</ul>`;

                cierreResultadosDiv.innerHTML = resultadosHTML;

            } catch (error) {
                console.error('Error al generar cierre de venta:', error);
                cierreResultadosDiv.innerHTML = '<p class="text-red-600">Error al generar el cierre. Verifique la consola para más detalles.</p>';
            }
        });

        btnBack.addEventListener('click', backToMainMenuCallback);
    }
}
