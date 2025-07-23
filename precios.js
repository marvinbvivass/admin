// precios.js
// Este archivo gestiona la visualización y cálculo de precios de los productos del inventario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore y el ID de usuario/appId
async function getFirestoreInstances() {
    // Espera hasta que window.firebaseDb y window.currentUserId estén definidos
    while (!window.firebaseDb || !window.currentUserId || !window.currentAppId) {
        console.log('Esperando inicialización de Firebase en precios.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
        userId: window.currentUserId,
        appId: window.currentAppId
    };
}

/**
 * Obtiene todos los productos del inventario del sistema de Firestore para el usuario actual.
 * @returns {Promise<Array<object>>} Un array de objetos de producto.
 */
async function obtenerTodosLosProductosInventario() {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/datosInventario`);
        const querySnapshot = await getDocs(inventarioCollectionRef);
        const productos = [];
        querySnapshot.forEach((doc) => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los productos de inventario obtenidos para Precios:', productos);
        return productos;
    } catch (error) {
        console.error('Error al obtener productos de inventario para Precios:', error);
        return [];
    }
}

/**
 * Intenta obtener el valor de BS de la página del BCV.
 * NOTA: La extracción directa de datos de sitios web puede ser inestable
 * debido a bloqueos de CORS, contenido dinámico o cambios en la estructura del sitio.
 * La solución ideal sería una API oficial o de terceros.
 * @returns {Promise<number|null>} El valor de BS o null si falla.
 */
async function fetchBsValueFromWeb() {
    try {
        // Intentar obtener el contenido de la página del BCV
        const response = await fetch('https://www.bcv.org.ve/');

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            console.error(`Error HTTP: ${response.status} al intentar obtener el valor BS del BCV.`);
            return null;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Selector basado en el HTML proporcionado: <div class="col-sm-6 col-xs-6 centrado"><strong> 120,42390000 </strong> </div>
        // Buscamos el elemento <strong> dentro de un div con la clase 'centrado'
        const usdElement = doc.querySelector('div.centrado strong');

        if (usdElement) {
            // Extraer el texto, reemplazar la coma por punto y convertir a número flotante
            const value = parseFloat(usdElement.textContent.replace(',', '.'));
            if (!isNaN(value)) {
                console.log('Valor BS obtenido del BCV:', value);
                return value;
            } else {
                console.warn('El valor extraído no es un número válido:', usdElement.textContent);
                return null;
            }
        } else {
            console.warn('No se encontró el elemento del valor BS con el selector "div.centrado strong" en la página del BCV.');
            return null;
        }
    } catch (error) {
        console.error('Error al intentar obtener el valor BS del BCV (posiblemente CORS o red):', error);
        return null;
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de precios dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de precios.
 */
export async function renderPreciosSection(container) {
    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Precios</h2>

            <!-- Controles de filtro y valores de conversión -->
            <div class="mb-4 p-3 bg-gray-50 rounded-lg shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                    <label for="filter-rubro" class="block text-sm font-medium text-gray-700 mb-0.5">Filtrar por Rubro:</label>
                    <select id="filter-rubro" class="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option value="">Todos los Rubros</option>
                        <!-- Opciones de rubro se cargarán dinámicamente -->
                    </select>
                </div>
                <div>
                    <label for="filter-segmento" class="block text-sm font-medium text-gray-700 mb-0.5">Filtrar por Segmento:</label>
                    <select id="filter-segmento" class="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option value="">Todos los Segmentos</option>
                        <!-- Opciones de segmento se cargarán dinámicamente -->
                    </select>
                </div>
                <div>
                    <label for="input-cop" class="block text-sm font-medium text-gray-700 mb-0.5">Valor COP:</label>
                    <input type="number" step="0.01" id="input-cop" placeholder="Ej: 4000" class="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                </div>
                <div>
                    <label for="input-bs" class="block text-sm font-medium text-gray-700 mb-0.5">Valor BS:</label>
                    <input type="number" step="0.01" id="input-bs" placeholder="Cargando..." class="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                    <p id="bs-status" class="text-xs text-gray-500 mt-1">Intentando obtener valor del BCV...</p>
                </div>
            </div>

            <!-- Tabla de productos y precios -->
            <div class="bg-white p-1 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rubro</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pres.</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Original</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio COP</th>
                            <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio BS</th>
                        </tr>
                    </thead>
                    <tbody id="precios-table-body" class="bg-white divide-y divide-gray-200">
                        <!-- Filas de productos se cargarán aquí -->
                        <tr><td colspan="6" class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 text-center">Cargando productos...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-precios-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const closePreciosModalBtn = container.querySelector('#close-precios-modal');
    const filterRubroSelect = container.querySelector('#filter-rubro');
    const filterSegmentoSelect = container.querySelector('#filter-segmento');
    const inputCop = container.querySelector('#input-cop');
    const inputBs = container.querySelector('#input-bs');
    const bsStatusText = container.querySelector('#bs-status'); // Nuevo elemento para el estado
    const preciosTableBody = container.querySelector('#precios-table-body');

    let allProducts = []; // Almacenará todos los productos del inventario
    let currentCopValue = 1; // Valor predeterminado
    let currentBsValue = 1; // Valor predeterminado

    // Función para cargar los productos y rellenar los filtros
    const loadProductsAndFilters = async () => {
        allProducts = await obtenerTodosLosProductosInventario();
        renderPreciosTable(allProducts); // Renderiza la tabla inicial

        // Rellenar opciones de filtro
        const rubros = [...new Set(allProducts.map(p => p.Rubro).filter(Boolean))];
        rubros.forEach(rubro => {
            const option = document.createElement('option');
            option.value = rubro;
            option.textContent = rubro;
            filterRubroSelect.appendChild(option);
        });

        const segmentos = [...new Set(allProducts.map(p => p.Segmento).filter(Boolean))];
        segmentos.forEach(segmento => {
            const option = document.createElement('option');
            option.value = segmento;
            option.textContent = segmento;
            filterSegmentoSelect.appendChild(option);
        });

        // Intentar obtener el valor de BS al cargar la sección
        bsStatusText.textContent = 'Obteniendo valor BS...';
        const fetchedBs = await fetchBsValueFromWeb();
        if (fetchedBs !== null) {
            currentBsValue = fetchedBs;
            inputBs.value = fetchedBs;
            bsStatusText.textContent = 'Valor BS obtenido.';
        } else {
            bsStatusText.textContent = 'No se pudo obtener valor BS. Ingrese manualmente.';
            inputBs.placeholder = 'Ej: 36'; // Restaura el placeholder si falla la carga
        }
        applyFiltersAndRender(); // Re-renderiza con el valor de BS obtenido (o el predeterminado)
    };

    // Función para aplicar filtros y actualizar la tabla
    const applyFiltersAndRender = () => {
        let filteredProducts = [...allProducts];

        const selectedRubro = filterRubroSelect.value;
        const selectedSegmento = filterSegmentoSelect.value;

        if (selectedRubro) {
            filteredProducts = filteredProducts.filter(p => p.Rubro === selectedRubro);
        }
        if (selectedSegmento) {
            filteredProducts = filteredProducts.filter(p => p.Segmento === selectedSegmento);
        }

        renderPreciosTable(filteredProducts);
    };

    // Función para renderizar la tabla de precios
    const renderPreciosTable = (productsToRender) => {
        preciosTableBody.innerHTML = ''; // Limpiar tabla

        if (productsToRender.length === 0) {
            preciosTableBody.innerHTML = `<tr><td colspan="6" class="px-2 py-1 whitespace-nowrap text-xs text-gray-500 text-center">No hay productos que coincidan con los filtros.</td></tr>`;
            return;
        }

        productsToRender.forEach(producto => {
            const precioCop = (producto.Precio * currentCopValue).toFixed(2);
            const precioBs = (producto.Precio * currentBsValue).toFixed(2);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100'; // Efecto hover para las filas
            row.innerHTML = `
                <td class="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">${producto.Rubro || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Segmento || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Presentacion || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(producto.Precio || 0).toFixed(2)}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">COP ${precioCop}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">BS ${precioBs}</td>
            `;
            preciosTableBody.appendChild(row);
        });
    };

    // Event Listeners
    closePreciosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
    });

    filterRubroSelect.addEventListener('change', applyFiltersAndRender);
    filterSegmentoSelect.addEventListener('change', applyFiltersAndRender);

    inputCop.addEventListener('input', () => {
        currentCopValue = parseFloat(inputCop.value) || 1; // Usa 1 si el valor no es un número válido
        applyFiltersAndRender(); // Re-renderiza para actualizar los precios
    });

    inputBs.addEventListener('input', () => {
        currentBsValue = parseFloat(inputBs.value) || 1; // Usa 1 si el valor no es un número válido
        applyFiltersAndRender(); // Re-renderiza para actualizar los precios
    });

    // Cargar productos y filtros al inicializar la sección
    loadProductsAndFilters();
}

