// inventario.js
// Este archivo gestiona las operaciones CRUD para el inventario de productos
// y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Importa las funciones de alerta y confirmación personalizadas desde clientes.js
import { showCustomAlert, showCustomConfirm } from './clientes.js';


// Variable para almacenar el mapa de rubros a segmentos, cargado desde Firebase
let rubroSegmentoMap = {};
const RUBRO_SEGMENTO_CONFIG_DOC_ID = 'rubrosSegmentos'; // ID fijo para el documento de configuración

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    while (!window.firebaseDb) {
        console.log('Esperando inicialización de Firebase en inventario.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Obtiene la configuración de rubros y segmentos desde Firebase.
 * @returns {Promise<object>} El mapa de rubros a segmentos.
 */
async function obtenerConfiguracionRubrosSegmentos() {
    try {
        const { db } = await getFirestoreInstances();
        // Las configuraciones ahora están en la raíz
        const configDocRef = doc(db, `configuracion`, RUBRO_SEGMENTO_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de rubros y segmentos obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de rubros y segmentos. Usando mapa predeterminado.');
            // Si no existe, inicializa con un mapa predeterminado o vacío
            return {
                "Cervezas": ["Nacionales", "Importadas", "Artesanales"],
                "Licores": ["Ron", "Whisky", "Vodka", "Ginebra", "Tequila", "Vino", "Espumante"],
                "Refrescos": ["Gaseosas", "Jugos", "Agua Mineral"],
                "Snacks": ["Dulces", "Salados"]
            };
        }
    } catch (error) {
        console.error('Error al obtener configuración de rubros y segmentos:', error);
        // En caso de error, devuelve un mapa vacío para evitar que la app falle.
        return {};
    }
}

/**
 * Guarda la configuración de rubros y segmentos en Firebase.
 * @param {object} newMap - El nuevo mapa de rubros a segmentos a guardar.
 * @returns {Promise<boolean>} True si se guardó con éxito, false en caso contrario.
 */
async function guardarConfiguracionRubrosSegmentos(newMap) {
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, RUBRO_SEGMENTO_CONFIG_DOC_ID);
        await setDoc(configDocRef, { mapa: newMap }); // Usa setDoc para sobrescribir o crear
        console.log('Configuración de rubros y segmentos guardada con éxito.');
        rubroSegmentoMap = newMap; // Actualiza la variable global
        return true;
    } catch (error) {
        console.error('Error al guardar configuración de rubros y segmentos:', error);
        return false;
    }
}

/**
 * Agrega un nuevo producto al inventario en Firestore.
 * Los datos se guardarán en una colección compartida en la raíz.
 * Ruta: /datosInventario
 * @param {object} producto - Objeto con los datos del producto a agregar.
 * @returns {Promise<string|null>} El ID del documento del producto agregado o null si hubo un error.
 */
export async function agregarProducto(producto) {
    try {
        const { db } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `datosInventario`); // Ruta modificada
        const docRef = await addDoc(inventarioCollectionRef, producto);
        console.log('Producto agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar producto:', error);
        return null;
    }
}

/**
 * Modifica los datos de un producto existente en Firestore.
 * @param {string} idProducto - ID único del documento del producto a modificar.
 * @param {object} nuevosDatos - Objeto con los nuevos datos del producto.
 * @returns {Promise<boolean>} True si la modificación fue exitosa, false en caso contrario.
 */
export async function modificarProducto(idProducto, nuevosDatos) {
    try {
        const { db } = await getFirestoreInstances();
        const productoDocRef = doc(db, `datosInventario`, idProducto); // Ruta modificada
        await updateDoc(productoDocRef, nuevosDatos);
        console.log('Producto modificado con éxito. ID:', idProducto);
        return true;
    } catch (error) {
        console.error('Error al modificar producto:', error);
        return false;
    }
}

/**
 * Elimina un producto del inventario de Firestore.
 * @param {string} idProducto - ID único del documento del producto a eliminar.
 * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario.
 */
export async function eliminarProducto(idProducto) {
    try {
        const { db } = await getFirestoreInstances();
        const productoDocRef = doc(db, `datosInventario`, idProducto); // Ruta modificada
        await deleteDoc(productoDocRef);
        console.log('Producto eliminado con éxito. ID:', idProducto);
        return true;
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return false;
    }
}

/**
 * Obtiene los datos de un producto específico de Firestore.
 * @param {string} idProducto - ID único del documento del producto a obtener.
 * @returns {Promise<object|null>} Los datos del producto o null si no se encuentra o hay un error.
 */
export async function obtenerProducto(idProducto) {
    try {
        const { db } = await getFirestoreInstances();
        const productoDocRef = doc(db, `datosInventario`, idProducto); // Ruta modificada
        const productoSnap = await getDoc(productoDocRef);

        if (productoSnap.exists()) {
            console.log('Producto obtenido:', productoSnap.data());
            return { id: productoSnap.id, ...productoSnap.data() };
        } else {
            console.log('No se encontró el producto con ID:', idProducto);
            return null;
        }
    } catch (error) {
        console.error('Error al obtener producto:', error);
        return null;
    }
}

/**
 * Obtiene todos los productos del inventario de Firestore.
 * @returns {Promise<Array<object>>} Un array de objetos de producto.
 */
export async function verInventarioCompleto() {
    try {
        const { db } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `datosInventario`); // Ruta modificada
        const querySnapshot = await getDocs(inventarioCollectionRef);
        const productos = [];
        querySnapshot.forEach((doc) => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        console.log('Inventario completo obtenido:', productos);
        return productos;
    } catch (error) {
        console.error('Error al obtener inventario completo:', error);
        return [];
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de inventario dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de inventario.
 */
export async function renderInventarioSection(container) {
    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Inventario</h2>

            <div id="inventario-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button id="btn-show-add-producto" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Agregar Producto
                </button>
                <button id="btn-show-modify-delete-producto" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar/Eliminar Producto
                </button>
                <button id="btn-show-ver-inventario" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Ver Inventario Completo
                </button>
                <button id="btn-show-manage-rubros-segmentos" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200 col-span-full">
                    Gestionar Rubros y Segmentos
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="inventario-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar o ver inventario se cargará aquí -->
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-inventario-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const inventarioMainButtonsContainer = container.querySelector('#inventario-main-buttons-container');
    const inventarioSubSection = container.querySelector('#inventario-sub-section');
    const closeInventarioModalBtn = container.querySelector('#close-inventario-modal');

    // Cargar el mapa de rubros y segmentos al inicio de la sección de inventario
    rubroSegmentoMap = await obtenerConfiguracionRubrosSegmentos();

    // Función para mostrar los botones principales y limpiar la sub-sección
    const showInventarioMainButtons = () => {
        inventarioSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        inventarioMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    };

    // Lógica para cerrar el modal
    closeInventarioModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        showInventarioMainButtons(); // Vuelve a la vista de botones principales al cerrar
    });

    // Lógica para mostrar la sección de agregar producto
    container.querySelector('#btn-show-add-producto').addEventListener('click', () => {
        inventarioMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        renderAddProductoForm(inventarioSubSection, showInventarioMainButtons);
    });

    // Lógica para mostrar la sección de modificar/eliminar producto (ahora con búsqueda previa)
    container.querySelector('#btn-show-modify-delete-producto').addEventListener('click', showModifyDeleteSearch);

    // Lógica para mostrar la sección de ver inventario completo
    container.querySelector('#btn-show-ver-inventario').addEventListener('click', async () => {
        inventarioMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        await renderVerInventarioSection(inventarioSubSection, showInventarioMainButtons);
    });

    // Lógica para mostrar la sección de gestionar rubros y segmentos
    container.querySelector('#btn-show-manage-rubros-segmentos').addEventListener('click', async () => {
        inventarioMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        await renderGestionarRubrosSegmentosForm(); // Llama a la nueva función para gestionar rubros/segmentos
    });

    /**
     * Función auxiliar para renderizar la lista de productos.
     * Esta función se usa en "Buscar Producto" y "Modificar/Eliminar Producto".
     * @param {Array<object>} productos - Array de objetos de producto.
     * @param {HTMLElement} listContainer - El elemento DOM donde se renderizará la lista.
     * @param {function(object): void} [actionCallback] - Función a ejecutar cuando se selecciona un producto.
     */
    function renderProductosList(productos, listContainer, actionCallback = null) {
        listContainer.innerHTML = ''; // Limpiar lista
        if (productos.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500">No hay productos para mostrar aún.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-200';
        productos.forEach(producto => {
            const li = document.createElement('li');
            li.className = 'py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center';
            li.innerHTML = `
                <div>
                    <p class="font-semibold">${producto.Producto || 'N/A'}</p>
                    <p class="text-sm text-gray-600">SKU: ${producto.Sku || 'N/A'} | Presentación: ${producto.Presentacion || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Rubro: ${producto.Rubro || 'N/A'} | Segmento: ${producto.Segmento || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Precio: $${(producto.Precio || 0).toFixed(2)} | Cantidad: ${producto.Cantidad || 0}</p>
                </div>
                ${actionCallback ? `<button class="mt-2 sm:mt-0 sm:ml-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition duration-200 select-product-btn" data-product-id="${producto.id}">Seleccionar</button>` : ''}
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);

        // Adjuntar event listeners a los botones "Seleccionar" si existen
        if (actionCallback) {
            listContainer.querySelectorAll('.select-product-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const productId = event.target.dataset.productId;
                    const selectedProduct = productos.find(p => p.id === productId);
                    if (selectedProduct) {
                        actionCallback(selectedProduct);
                    }
                });
            });
        }
    }

    // Función para renderizar el formulario de agregar producto
    const renderAddProductoForm = (parentContainer, backToMainMenuCallback) => {
        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Agregar Nuevo Producto</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-sku" placeholder="SKU" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-producto" placeholder="Nombre del Producto" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-presentacion" placeholder="Presentación" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <select id="add-rubro" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecciona Rubro</option>
                        ${Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                    </select>
                    <select id="add-segmento" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Selecciona Segmento</option>
                    </select>
                    <input type="number" step="0.01" id="add-precio" placeholder="Precio ($)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="number" id="add-cantidad" placeholder="Cantidad en Stock" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button id="btn-submit-add-producto" class="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Confirmar Agregar Producto
                </button>
                <button id="btn-back-add-producto" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;
        // Lógica para actualizar el select de Segmento cuando cambia el Rubro
        const addRubroSelect = parentContainer.querySelector('#add-rubro');
        const addSegmentoSelect = parentContainer.querySelector('#add-segmento');
        addRubroSelect.addEventListener('change', () => {
            const selectedRubro = addRubroSelect.value;
            addSegmentoSelect.innerHTML = '<option value="">Selecciona Segmento</option>'; // Limpiar opciones anteriores
            if (selectedRubro && rubroSegmentoMap[selectedRubro]) {
                rubroSegmentoMap[selectedRubro].forEach(segmento => {
                    const option = document.createElement('option');
                    option.value = segmento;
                    option.textContent = segmento;
                    addSegmentoSelect.appendChild(option);
                });
                addSegmentoSelect.disabled = false; // Habilitar el select de Segmento
            } else {
                addSegmentoSelect.disabled = true; // Deshabilitar si no hay rubro seleccionado
            }
        });

        // Conectar el botón de agregar producto
        parentContainer.querySelector('#btn-submit-add-producto').addEventListener('click', async () => {
            const producto = {
                Sku: parentContainer.querySelector('#add-sku').value,
                Producto: parentContainer.querySelector('#add-producto').value,
                Presentacion: parentContainer.querySelector('#add-presentacion').value,
                Rubro: parentContainer.querySelector('#add-rubro').value,
                Segmento: parentContainer.querySelector('#add-segmento').value,
                Precio: parseFloat(parentContainer.querySelector('#add-precio').value),
                Cantidad: parseInt(parentContainer.querySelector('#add-cantidad').value)
            };

            const id = await agregarProducto(producto);
            if (id) {
                showCustomAlert('Producto agregado con éxito, ID: ' + id);
                // Limpiar campos
                parentContainer.querySelector('#add-sku').value = '';
                parentContainer.querySelector('#add-producto').value = '';
                parentContainer.querySelector('#add-presentacion').value = '';
                parentContainer.querySelector('#add-rubro').value = '';
                parentContainer.querySelector('#add-segmento').innerHTML = '<option value="">Selecciona Segmento</option>'; // Limpiar y resetear segmento
                parentContainer.querySelector('#add-segmento').disabled = true;
                parentContainer.querySelector('#add-precio').value = '';
                parentContainer.querySelector('#add-cantidad').value = '';
            } else {
                showCustomAlert('Fallo al agregar producto.');
            }
        });

        // Conectar el botón Volver
        parentContainer.querySelector('#btn-back-add-producto').addEventListener('click', backToMainMenuCallback);
    };

    // Función para mostrar la interfaz de búsqueda para modificar/eliminar
    const showModifyDeleteSearch = async () => {
        inventarioMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Buscar Producto para Modificar/Eliminar</h3>
                <input type="text" id="search-modify-delete-input" placeholder="Buscar por SKU, Nombre, Rubro, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">
                <div id="modify-delete-product-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    <!-- Los productos se mostrarán aquí -->
                    <p class="text-gray-500">Cargando productos...</p>
                </div>
                <button id="btn-back-modify-delete-search" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal
                </button>
            </div>
        `;

        const productListDiv = inventarioSubSection.querySelector('#modify-delete-product-list');
        const searchInput = inventarioSubSection.querySelector('#search-modify-delete-input');
        let allProducts = [];

        allProducts = await verInventarioCompleto();
        renderProductosList(allProducts, productListDiv, (selectedProduct) => {
            renderModifyDeleteForm(selectedProduct); // Pasa el producto seleccionado al formulario de modificar/eliminar
        });

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredProducts = allProducts.filter(product =>
                (product.Sku && product.Sku.toLowerCase().includes(searchTerm)) ||
                (product.Producto && product.Producto.toLowerCase().includes(searchTerm)) ||
                (product.Presentacion && product.Presentacion.toLowerCase().includes(searchTerm)) ||
                (product.Rubro && product.Rubro.toLowerCase().includes(searchTerm)) ||
                (product.Segmento && product.Segmento.toLowerCase().includes(searchTerm))
            );
            renderProductosList(filteredProducts, productListDiv, (selectedProduct) => {
                renderModifyDeleteForm(selectedProduct);
            });
        });

        inventarioSubSection.querySelector('#btn-back-modify-delete-search').addEventListener('click', showInventarioMainButtons);
    };

    // Función para renderizar el formulario de modificar/eliminar
    const renderModifyDeleteForm = (productData = null) => {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Producto</h3>
                <input type="hidden" id="mod-del-producto-id" value="${productData ? productData.id : ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="mod-sku" placeholder="Nuevo SKU (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${productData?.Sku || ''}">
                    <input type="text" id="mod-producto" placeholder="Nuevo Nombre del Producto (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${productData?.Producto || ''}">
                    <input type="text" id="mod-presentacion" placeholder="Nueva Presentación (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${productData?.Presentacion || ''}">
                    <select id="mod-rubro" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Nuevo Rubro (opcional)</option>
                        ${Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}" ${productData?.Rubro === rubro ? 'selected' : ''}>${rubro}</option>`).join('')}
                    </select>
                    <select id="mod-segmento" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" ${productData?.Rubro ? '' : 'disabled'}>
                        <option value="">Nuevo Segmento (opcional)</option>
                        ${productData?.Rubro && rubroSegmentoMap[productData.Rubro] ? rubroSegmentoMap[productData.Rubro].map(segmento => `<option value="${segmento}" ${productData?.Segmento === segmento ? 'selected' : ''}>${segmento}</option>`).join('') : ''}
                    </select>
                    <input type="number" step="0.01" id="mod-precio" placeholder="Nuevo Precio ($) (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${productData?.Precio || ''}">
                    <input type="number" id="mod-cantidad" placeholder="Nueva Cantidad en Stock (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${productData?.Cantidad || ''}">
                </div>
                <div class="flex flex-col md:flex-row gap-4 mt-6">
                    <button id="btn-submit-modify-producto" class="flex-1 bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Confirmar Modificar
                    </button>
                    <button id="btn-submit-delete-producto" class="flex-1 bg-red-600 text-white p-3 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                        Confirmar Eliminar
                    </button>
                </div>
                <button id="btn-back-modify-delete-producto" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        // Lógica para actualizar el select de Segmento cuando cambia el Rubro en modificar
        const modRubroSelect = inventarioSubSection.querySelector('#mod-rubro');
        const modSegmentoSelect = inventarioSubSection.querySelector('#mod-segmento');
        modRubroSelect.addEventListener('change', () => {
            const selectedRubro = modRubroSelect.value;
            modSegmentoSelect.innerHTML = '<option value="">Nuevo Segmento (opcional)</option>'; // Limpiar opciones anteriores
            if (selectedRubro && rubroSegmentoMap[selectedRubro]) {
                rubroSegmentoMap[selectedRubro].forEach(segmento => {
                    const option = document.createElement('option');
                    option.value = segmento;
                    option.textContent = segmento;
                    modSegmentoSelect.appendChild(option);
                });
                modSegmentoSelect.disabled = false; // Habilitar el select de Segmento
            } else {
                modSegmentoSelect.disabled = true; // Deshabilitar si no hay rubro seleccionado
            }
        });

        // Conectar los botones de modificar/eliminar producto
        inventarioSubSection.querySelector('#btn-submit-modify-producto').addEventListener('click', async () => {
            const id = inventarioSubSection.querySelector('#mod-del-producto-id').value;
            const nuevosDatos = {};
            if (inventarioSubSection.querySelector('#mod-sku').value !== (productData?.Sku || '')) nuevosDatos.Sku = inventarioSubSection.querySelector('#mod-sku').value;
            if (inventarioSubSection.querySelector('#mod-producto').value !== (productData?.Producto || '')) nuevosDatos.Producto = inventarioSubSection.querySelector('#mod-producto').value;
            if (inventarioSubSection.querySelector('#mod-presentacion').value !== (productData?.Presentacion || '')) nuevosDatos.Presentacion = inventarioSubSection.querySelector('#mod-presentacion').value;
            if (inventarioSubSection.querySelector('#mod-rubro').value) nuevosDatos.Rubro = inventarioSubSection.querySelector('#mod-rubro').value;
            if (inventarioSubSection.querySelector('#mod-segmento').value) nuevosDatos.Segmento = inventarioSubSection.querySelector('#mod-segmento').value;
            if (inventarioSubSection.querySelector('#mod-precio').value !== (productData?.Precio || '')) nuevosDatos.Precio = parseFloat(inventarioSubSection.querySelector('#mod-precio').value);
            if (inventarioSubSection.querySelector('#mod-cantidad').value !== (productData?.Cantidad || '')) nuevosDatos.Cantidad = parseInt(inventarioSubSection.querySelector('#mod-cantidad').value);

            if (id && Object.keys(nuevosDatos).length > 0) {
                const modificado = await modificarProducto(id, nuevosDatos);
                if (modificado) {
                    showCustomAlert('Producto modificado con éxito.');
                    // Limpiar campos y volver a la búsqueda
                    showModifyDeleteSearch();
                } else {
                    showCustomAlert('Fallo al modificar producto.');
                }
            } else {
                showCustomAlert('Por favor, ingresa el ID del producto y al menos un campo para modificar.');
            }
        });

        inventarioSubSection.querySelector('#btn-submit-delete-producto').addEventListener('click', async () => {
            const id = inventarioSubSection.querySelector('#mod-del-producto-id').value;
            if (id) {
                const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${id}?`);
                if (confirmado) {
                    const eliminado = await eliminarProducto(id);
                    if (eliminado) {
                        showCustomAlert('Producto eliminado con éxito.');
                        // Volver a la búsqueda
                        showModifyDeleteSearch();
                    } else {
                        showCustomAlert('Fallo al eliminar producto.');
                    }
                }
            } else {
                showCustomAlert('Por favor, ingresa el ID del producto a eliminar.');
            }
        });

        // Conectar el botón Volver
        inventarioSubSection.querySelector('#btn-back-modify-delete-producto').addEventListener('click', showModifyDeleteSearch);
    };

    /**
     * Renderiza la sección para ver la lista completa de productos en formato de tabla.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará esta sección.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de inventario.
     */
    async function renderVerInventarioSection(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Inventario Completo</h3>
                <input type="text" id="search-ver-inventario-input" placeholder="Buscar producto por SKU, nombre, rubro, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4">
                <div id="ver-inventario-list-table" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                    <!-- La tabla de productos se mostrará aquí -->
                    <p class="text-gray-500">Cargando inventario...</p>
                </div>
                <button id="btn-back-ver-inventario" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const inventarioListTableDiv = parentContainer.querySelector('#ver-inventario-list-table');
        const searchInput = parentContainer.querySelector('#search-ver-inventario-input');
        const btnBack = parentContainer.querySelector('#btn-back-ver-inventario');

        let allProducts = []; // Para almacenar todos los productos y filtrar sobre ellos

        // Función interna para renderizar la tabla de productos
        const renderProductsTable = (productsToRender) => {
            inventarioListTableDiv.innerHTML = ''; // Limpiar tabla
            if (productsToRender.length === 0) {
                inventarioListTableDiv.innerHTML = '<p class="text-gray-500">No hay productos para mostrar.</p>';
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
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rubro</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio ($)</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- Filas de productos se cargarán aquí -->
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            productsToRender.forEach(producto => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-100';
                row.innerHTML = `
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${producto.Sku || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Producto || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Presentacion || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Rubro || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Segmento || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(producto.Precio || 0).toFixed(2)}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${producto.Cantidad || 0}</td>
                `;
                tbody.appendChild(row);
            });
            inventarioListTableDiv.appendChild(table);
        };

        // Cargar todos los productos al abrir la sección
        try {
            allProducts = await verInventarioCompleto();
            renderProductsTable(allProducts);
        } catch (error) {
            console.error('Error al obtener productos para la lista:', error);
            inventarioListTableDiv.innerHTML = '<p class="text-red-600">Error al cargar productos. Por favor, verifique los permisos.</p>';
        }

        // Lógica de filtrado en tiempo real
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredProducts = allProducts.filter(producto => {
                return (producto.Sku && producto.Sku.toLowerCase().includes(searchTerm)) ||
                       (producto.Producto && producto.Producto.toLowerCase().includes(searchTerm)) ||
                       (producto.Presentacion && producto.Presentacion.toLowerCase().includes(searchTerm)) ||
                       (producto.Rubro && producto.Rubro.toLowerCase().includes(searchTerm)) ||
                       (producto.Segmento && producto.Segmento.toLowerCase().includes(searchTerm));
            });
            renderProductsTable(filteredProducts);
        });

        // Conectar el botón Volver
        btnBack.addEventListener('click', backToMainMenuCallback);
    }

    // --- Funciones para gestionar Rubros y Segmentos (Refactorizadas) ---

    // Función principal para el menú de gestión de Rubros y Segmentos
    async function renderGestionarRubrosSegmentosForm() {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-purple-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-purple-800 mb-4">Gestionar Rubros y Segmentos</h3>

                <div id="rubros-segmentos-management-buttons" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button id="btn-add-rubro-segmento" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Rubro o Segmento
                    </button>
                    <button id="btn-modify-delete-rubro-segmento" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Modificar o Eliminar Rubro o Segmento
                    </button>
                </div>

                <div id="rubros-segmentos-sub-section">
                    <!-- El contenido de añadir o modificar/eliminar se cargará aquí -->
                </div>

                <button id="btn-back-from-rubros-segmentos-management" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal de Inventario
                </button>
            </div>
        `;

        const rubrosSegmentosSubSection = inventarioSubSection.querySelector('#rubros-segmentos-sub-section');
        const btnBack = inventarioSubSection.querySelector('#btn-back-from-rubros-segmentos-management');
        const btnAdd = inventarioSubSection.querySelector('#btn-add-rubro-segmento');
        const btnModifyDelete = inventarioSubSection.querySelector('#btn-modify-delete-rubro-segmento');

        // Función para mostrar los botones principales de gestión de rubros/segmentos
        const showRubrosSegmentosMainButtons = () => {
            rubrosSegmentosSubSection.innerHTML = ''; // Limpiar el contenido de la sub-sección
            inventarioSubSection.querySelector('#rubros-segmentos-management-buttons').classList.remove('hidden'); // Mostrar los botones principales
        };

        // Event Listeners para los botones del menú de gestión de rubros/segmentos
        btnAdd.addEventListener('click', () => {
            inventarioSubSection.querySelector('#rubros-segmentos-management-buttons').classList.add('hidden'); // Oculta los botones del menú
            renderAddRubroSegmentoForm(rubrosSegmentosSubSection, showRubrosSegmentosMainButtons);
        });

        btnModifyDelete.addEventListener('click', () => {
            inventarioSubSection.querySelector('#rubros-segmentos-management-buttons').classList.add('hidden'); // Oculta los botones del menú
            renderModifyDeleteRubroSegmentoForm(rubrosSegmentosSubSection, showRubrosSegmentosMainButtons);
        });

        btnBack.addEventListener('click', showInventarioMainButtons); // Vuelve al menú principal de inventario
    }

    // Función para renderizar el formulario de añadir Rubro o Segmento
    async function renderAddRubroSegmentoForm(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-4 bg-blue-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-blue-800 mb-3">Añadir Rubro o Segmento</h4>

                <div class="mb-4">
                    <label for="add-new-rubro-input" class="block text-sm font-medium text-gray-700 mb-1">Añadir Nuevo Rubro:</label>
                    <input type="text" id="add-new-rubro-input" placeholder="Nombre del nuevo Rubro" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="btn-add-new-rubro" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Rubro
                    </button>
                </div>

                <div class="mb-4">
                    <label for="select-rubro-for-segmento" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Rubro para Añadir Segmento:</label>
                    <select id="select-rubro-for-segmento" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Selecciona un Rubro --</option>
                        ${Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('')}
                    </select>
                    <input type="text" id="add-new-segmento-input" placeholder="Nombre del nuevo Segmento" class="mt-2 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <button id="btn-add-new-segmento" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200" disabled>
                        Añadir Segmento
                    </button>
                </div>

                <button id="btn-back-from-add-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const addNewRubroInput = parentContainer.querySelector('#add-new-rubro-input');
        const btnAddNewRubro = parentContainer.querySelector('#btn-add-new-rubro');
        const selectRubroForSegmento = parentContainer.querySelector('#select-rubro-for-segmento');
        const addNewSegmentoInput = parentContainer.querySelector('#add-new-segmento-input');
        const btnAddNewSegmento = parentContainer.querySelector('#btn-add-new-segmento');
        const btnBack = parentContainer.querySelector('#btn-back-from-add-form');

        // Lógica para añadir nuevo rubro
        btnAddNewRubro.addEventListener('click', async () => {
            const newRubro = addNewRubroInput.value.trim();
            if (newRubro && !rubroSegmentoMap[newRubro]) {
                rubroSegmentoMap[newRubro] = []; // Inicializa el nuevo rubro con un array vacío de segmentos
                if (await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap)) {
                    showCustomAlert(`Rubro "${newRubro}" añadido.`);
                    addNewRubroInput.value = '';
                    // Re-poblar el select de rubros para segmentos
                    selectRubroForSegmento.innerHTML = `<option value="">-- Selecciona un Rubro --</option>` + Object.keys(rubroSegmentoMap).map(rubro => `<option value="${rubro}">${rubro}</option>`).join('');
                } else {
                    showCustomAlert('Fallo al añadir rubro.');
                }
            } else if (rubroSegmentoMap[newRubro]) {
                showCustomAlert(`El rubro "${newRubro}" ya existe.`);
            } else {
                showCustomAlert('Por favor, ingresa un nombre para el nuevo rubro.');
            }
        });

        // Habilitar/deshabilitar input de segmento basado en la selección de rubro
        selectRubroForSegmento.addEventListener('change', () => {
            const selectedRubro = selectRubroForSegmento.value;
            if (selectedRubro) {
                addNewSegmentoInput.disabled = false;
                btnAddNewSegmento.disabled = false;
            } else {
                addNewSegmentoInput.disabled = true;
                btnAddNewSegmento.disabled = true;
            }
        });

        // Lógica para añadir nuevo segmento
        btnAddNewSegmento.addEventListener('click', async () => {
            const selectedRubro = selectRubroForSegmento.value;
            const newSegmento = addNewSegmentoInput.value.trim();
            if (selectedRubro && newSegmento && !rubroSegmentoMap[selectedRubro].includes(newSegmento)) {
                rubroSegmentoMap[selectedRubro].push(newSegmento);
                if (await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap)) {
                    showCustomAlert(`Segmento "${newSegmento}" añadido a "${selectedRubro}".`);
                    addNewSegmentoInput.value = '';
                } else {
                    showCustomAlert('Fallo al añadir segmento.');
                }
            } else if (rubroSegmentoMap[selectedRubro].includes(newSegmento)) {
                showCustomAlert(`El segmento "${newSegmento}" ya existe en "${selectedRubro}".`);
            } else {
                showCustomAlert('Por favor, selecciona un rubro e ingresa un nombre para el nuevo segmento.');
            }
        });

        btnBack.addEventListener('click', backToMainMenuCallback);
    }

    // Función para renderizar el formulario de modificar/eliminar Rubro o Segmento
    async function renderModifyDeleteRubroSegmentoForm(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-yellow-800 mb-3">Modificar o Eliminar Rubro o Segmento</h4>

                <input type="text" id="search-rubro-segmento-input" placeholder="Buscar Rubro o Segmento..." class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="rubro-segmento-list-container" class="max-h-60 overflow-y-auto bg-white p-3 rounded-md border border-gray-200">
                    <!-- Los rubros y segmentos se cargarán aquí -->
                    <p class="text-gray-500">Cargando rubros y segmentos...</p>
                </div>

                <button id="btn-back-from-modify-delete-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-rubro-segmento-input');
        const listContainer = parentContainer.querySelector('#rubro-segmento-list-container');
        const btnBack = parentContainer.querySelector('#btn-back-from-modify-delete-form');

        // Función interna para renderizar la lista de rubros y segmentos con opciones de eliminar
        const renderList = (filteredMap) => {
            listContainer.innerHTML = '';
            if (Object.keys(filteredMap).length === 0) {
                listContainer.innerHTML = '<p class="text-gray-500">No hay resultados.</p>';
                return;
            }

            for (const rubro in filteredMap) {
                const rubroDiv = document.createElement('div');
                rubroDiv.className = 'mb-4 p-3 border border-gray-300 rounded-md bg-gray-50';
                rubroDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h5 class="font-bold text-lg text-gray-800">${rubro}</h5>
                        <button class="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 delete-rubro-btn" data-rubro="${rubro}">Eliminar Rubro</button>
                    </div>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${filteredMap[rubro].map(segmento => `
                            <li class="flex justify-between items-center py-1">
                                <span>${segmento}</span>
                                <button class="bg-red-400 text-white px-2 py-0.5 rounded-md text-xs hover:bg-red-500 delete-segmento-btn" data-rubro="${rubro}" data-segmento="${segmento}">Eliminar</button>
                            </li>
                        `).join('')}
                    </ul>
                `;
                listContainer.appendChild(rubroDiv);
            }

            // Añadir event listeners para eliminar rubros
            listContainer.querySelectorAll('.delete-rubro-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const rubroToDelete = event.target.dataset.rubro;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el rubro "${rubroToDelete}" y todos sus segmentos?`);
                    if (confirmado) {
                        delete rubroSegmentoMap[rubroToDelete];
                        await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap);
                        renderList(rubroSegmentoMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Rubro "${rubroToDelete}" eliminado.`);
                    }
                });
            });

            // Añadir event listeners para eliminar segmentos
            listContainer.querySelectorAll('.delete-segmento-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const rubro = event.target.dataset.rubro;
                    const segmentoToDelete = event.target.dataset.segmento;
                    const confirmado = await showCustomConfirm(`¿Estás seguro de que quieres eliminar el segmento "${segmentoToDelete}" de "${rubro}"?`);
                    if (confirmado) {
                        rubroSegmentoMap[rubro] = rubroSegmentoMap[rubro].filter(s => s !== segmentoToDelete);
                        await guardarConfiguracionRubrosSegmentos(rubroSegmentoMap);
                        renderList(rubroSegmentoMap); // Re-renderizar la lista con el mapa actualizado
                        showCustomAlert(`Sector "${segmentoToDelete}" eliminado de "${rubro}".`);
                    }
                });
            });
        };

        // Renderizado inicial
        renderList(rubroSegmentoMap);

        // Funcionalidad de búsqueda
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredMap = {};
            for (const rubro in rubroSegmentoMap) {
                if (rubro.toLowerCase().includes(searchTerm)) {
                    filteredMap[rubro] = rubroSegmentoMap[rubro];
                } else {
                    const matchingSegments = rubroSegmentoMap[rubro].filter(segmento => segmento.toLowerCase().includes(searchTerm));
                    if (matchingSegments.length > 0) {
                        filteredMap[rubro] = matchingSegments;
                    }
                }
            }
            renderList(filteredMap);
        });

        btnBack.addEventListener('click', backToMainMenuCallback);
    }
}
