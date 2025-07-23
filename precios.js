// precios.js
// Este archivo gestiona la visualización y actualización de precios de productos
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { verInventarioCompleto, modificarProducto } from './inventario.js';

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    while (!window.firebaseDb) {
        console.log('Esperando inicialización de Firebase en precios.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Renderiza la interfaz de usuario de la sección de precios dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de precios.
 */
export async function renderPreciosSection(container) { // Aseguramos la exportación
    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Precios</h2>

            <div class="p-6 bg-red-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-red-800 mb-4">Actualizar Precios de Productos</h3>

                <input type="text" id="search-precios-input" placeholder="Buscar producto por SKU, nombre, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4">

                <div id="productos-precios-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                    <!-- Los productos con sus precios se mostrarán aquí -->
                    <p class="text-gray-500">Cargando productos...</p>
                </div>

                <button id="btn-back-precios" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-precios-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const productosPreciosListDiv = container.querySelector('#productos-precios-list');
    const searchInput = container.querySelector('#search-precios-input');
    const btnBack = container.querySelector('#btn-back-precios');
    const closePreciosModalBtn = container.querySelector('#close-precios-modal');

    let allProducts = []; // Para almacenar todos los productos y filtrar sobre ellos

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
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Actual ($)</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nuevo Precio ($)</th>
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <!-- Filas de productos se cargarán aquí -->
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        productsToRender.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100';
            row.innerHTML = `
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Sku || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Producto || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(product.Precio || 0).toFixed(2)}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                    <input type="number" step="0.01" value="${(product.Precio || 0).toFixed(2)}" class="w-24 p-1 border border-gray-300 rounded-md text-center new-price-input" data-product-id="${product.id}">
                </td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                    <button class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition duration-200 update-price-btn" data-product-id="${product.id}">Actualizar</button>
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
                    alert('Por favor, ingrese un precio válido.');
                    return;
                }

                const updated = await modificarProducto(productId, { Precio: newPrice });
                if (updated) {
                    alert('Precio actualizado con éxito.');
                    // Actualizar el precio en la lista local para reflejar el cambio
                    const productToUpdate = allProducts.find(p => p.id === productId);
                    if (productToUpdate) {
                        productToUpdate.Precio = newPrice;
                    }
                    renderProductsForPrices(allProducts); // Re-renderizar la tabla para mostrar el precio actualizado
                } else {
                    alert('Fallo al actualizar el precio.');
                }
            });
        });
    };

    // Cargar todos los productos al abrir la sección
    try {
        allProducts = await verInventarioCompleto();
        renderProductsForPrices(allProducts);
    } catch (error) {
        console.error('Error al obtener productos de inventario para Precios:', error);
        productosPreciosListDiv.innerHTML = '<p class="text-red-600">Error al cargar productos. Por favor, verifique los permisos.</p>';
    }


    // Lógica de filtrado en tiempo real
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => {
            return (product.Sku && product.Sku.toLowerCase().includes(searchTerm)) ||
                   (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                   (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm)) ||
                   (product.Rubro && product.Rubro.toLowerCase().includes(searchTerm)) ||
                   (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm));
        });
        renderProductsForPrices(filteredProducts);
    });

    // Lógica para cerrar el modal
    closePreciosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });

    // Lógica para el botón "Volver"
    btnBack.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        // No hay un menú principal dentro de Precios, así que simplemente lo cierra.
        // Si en el futuro hubiera sub-secciones, aquí se restauraría el menú principal de Precios.
    });
}

