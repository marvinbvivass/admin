// inventario.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los productos del inventario
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore y el ID de usuario/appId
// Esto asegura que las variables globales de Firebase estén disponibles antes de usarlas.
async function getFirestoreInstances() {
    // Espera hasta que window.firebaseDb y window.currentUserId estén definidos
    while (!window.firebaseDb || !window.currentUserId || !window.currentAppId) {
        console.log('Esperando inicialización de Firebase en inventario.js...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100ms antes de reintentar
    }
    return {
        db: window.firebaseDb,
        userId: window.currentUserId,
        appId: window.currentAppId
    };
}

/**
 * Agrega un nuevo producto al inventario en Firestore.
 * Los datos se guardarán en una colección específica del usuario para mantenerlos privados.
 * Ruta: /artifacts/{appId}/users/{userId}/inventario
 * @param {object} producto - Objeto con los datos del producto a agregar.
 * @param {string} producto.Rubro - Categoría del producto.
 * @param {string} producto.Sku - Código de identificación único del producto.
 * @param {string} producto.Segmento - Segmento al que pertenece el producto.
 * @param {string} producto.Producto - Nombre del producto.
 * @param {string} producto.Presentacion - Formato o presentación del producto.
 * @param {number} producto.Cantidad - Cantidad actual en inventario.
 * @param {number} producto.Precio - Precio unitario del producto.
 * @returns {Promise<string|null>} El ID del documento del producto agregado o null si hubo un error.
 */
export async function agregarProducto(producto) {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/inventario`);
        const docRef = await addDoc(inventarioCollectionRef, producto);
        console.log('Producto agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar producto:', error);
        return null;
    }
}

/**
 * Obtiene el inventario completo del sistema de Firestore para el usuario actual.
 * @returns {Promise<Array<object>>} Un array de objetos de producto.
 */
export async function verInventarioCompleto() {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/inventario`);
        const querySnapshot = await getDocs(inventarioCollectionRef);
        const inventario = [];
        querySnapshot.forEach((doc) => {
            inventario.push({ id: doc.id, ...doc.data() });
        });
        console.log('Inventario completo obtenido:', inventario);
        return inventario;
    } catch (error) {
        console.error('Error al obtener el inventario completo:', error);
        return [];
    }
}

/**
 * Busca productos en el inventario por un campo y valor específicos.
 * @param {string} campo - El nombre del campo por el cual buscar (ej. 'Sku', 'Producto', 'Rubro').
 * @param {any} valor - El valor a buscar en el campo especificado.
 * @returns {Promise<Array<object>>} Un array de objetos de producto que coinciden con la búsqueda.
 */
export async function buscarProducto(campo, valor) {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const inventarioCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/inventario`);
        // Nota: Firestore requiere índices para consultas de igualdad en campos no ID.
        // Si no tienes un índice para el campo 'campo', esta consulta podría fallar.
        const q = query(inventarioCollectionRef, where(campo, '==', valor));
        const querySnapshot = await getDocs(q);
        const resultados = [];
        querySnapshot.forEach((doc) => {
            resultados.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Productos encontrados por ${campo} = ${valor}:`, resultados);
        return resultados;
    } catch (error) {
        console.error(`Error al buscar producto por ${campo}:`, error);
        return [];
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
        const { db, userId, appId } = await getFirestoreInstances();
        const productoDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventario`, idProducto);
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
        const { db, userId, appId } = await getFirestoreInstances();
        const productoDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventario`, idProducto);
        await deleteDoc(productoDocRef);
        console.log('Producto eliminado con éxito. ID:', idProducto);
        return true;
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return false;
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

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button id="btn-show-add-producto" class="bg-indigo-600 text-white p-4 rounded-md font-semibold hover:bg-indigo-700 transition duration-200">
                    Agregar Producto
                </button>
                <button id="btn-show-modify-delete-producto" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar/Eliminar Producto
                </button>
                <button id="btn-show-search-producto" class="bg-gray-600 text-white p-4 rounded-md font-semibold hover:bg-gray-700 transition duration-200">
                    Buscar Producto
                </button>
                <button id="btn-show-full-inventario" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200 col-span-full">
                    Ver Inventario Completo
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="inventario-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar, buscar o listar se cargará aquí -->
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
    const inventarioSubSection = container.querySelector('#inventario-sub-section');
    const closeInventarioModalBtn = container.querySelector('#close-inventario-modal');

    // Lógica para cerrar el modal
    closeInventarioModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        inventarioSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
    });

    // Lógica para mostrar la sección de agregar producto
    container.querySelector('#btn-show-add-producto').addEventListener('click', () => {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-indigo-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-indigo-800 mb-4">Agregar Nuevo Producto</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-rubro" placeholder="Rubro" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="text" id="add-sku" placeholder="SKU" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="text" id="add-segmento" placeholder="Segmento" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="text" id="add-producto-nombre" placeholder="Producto" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="text" id="add-presentacion" placeholder="Presentación" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="number" id="add-cantidad" placeholder="Cantidad" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <input type="number" step="0.01" id="add-precio" placeholder="Precio" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <button id="btn-submit-add-producto" class="mt-6 w-full bg-indigo-600 text-white p-3 rounded-md font-semibold hover:bg-indigo-700 transition duration-200">
                    Confirmar Agregar Producto
                </button>
            </div>
        `;
        // Conectar el botón de agregar producto
        container.querySelector('#btn-submit-add-producto').addEventListener('click', async () => {
            const producto = {
                Rubro: container.querySelector('#add-rubro').value,
                Sku: container.querySelector('#add-sku').value,
                Segmento: container.querySelector('#add-segmento').value,
                Producto: container.querySelector('#add-producto-nombre').value,
                Presentacion: container.querySelector('#add-presentacion').value,
                Cantidad: parseFloat(container.querySelector('#add-cantidad').value),
                Precio: parseFloat(container.querySelector('#add-precio').value)
            };

            // Validación básica
            if (!producto.Rubro || !producto.Sku || !producto.Producto || isNaN(producto.Cantidad) || isNaN(producto.Precio)) {
                alert('Por favor, completa todos los campos obligatorios (Rubro, SKU, Producto, Cantidad, Precio).');
                return;
            }

            const id = await agregarProducto(producto);
            if (id) {
                alert('Producto agregado con éxito, ID: ' + id);
                // Limpiar campos
                container.querySelector('#add-rubro').value = '';
                container.querySelector('#add-sku').value = '';
                container.querySelector('#add-segmento').value = '';
                container.querySelector('#add-producto-nombre').value = '';
                container.querySelector('#add-presentacion').value = '';
                container.querySelector('#add-cantidad').value = '';
                container.querySelector('#add-precio').value = '';
            } else {
                alert('Fallo al agregar producto.');
            }
        });
    });

    // Lógica para mostrar la sección de modificar/eliminar producto
    container.querySelector('#btn-show-modify-delete-producto').addEventListener('click', () => {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Producto</h3>
                <input type="text" id="mod-del-producto-id" placeholder="ID del Producto" class="mb-4 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="mod-rubro" placeholder="Nuevo Rubro (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-sku" placeholder="Nuevo SKU (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-segmento" placeholder="Nuevo Segmento (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-producto-nombre" placeholder="Nuevo Producto (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-presentacion" placeholder="Nueva Presentación (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="number" id="mod-cantidad" placeholder="Nueva Cantidad (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="number" step="0.01" id="mod-precio" placeholder="Nuevo Precio (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                </div>
                <div class="flex flex-col md:flex-row gap-4 mt-6">
                    <button id="btn-submit-modify-producto" class="flex-1 bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Confirmar Modificar
                    </button>
                    <button id="btn-submit-delete-producto" class="flex-1 bg-red-600 text-white p-3 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                        Confirmar Eliminar
                    </button>
                </div>
            </div>
        `;
        // Conectar los botones de modificar/eliminar producto
        container.querySelector('#btn-submit-modify-producto').addEventListener('click', async () => {
            const id = container.querySelector('#mod-del-producto-id').value;
            const nuevosDatos = {};
            if (container.querySelector('#mod-rubro').value) nuevosDatos.Rubro = container.querySelector('#mod-rubro').value;
            if (container.querySelector('#mod-sku').value) nuevosDatos.Sku = container.querySelector('#mod-sku').value;
            if (container.querySelector('#mod-segmento').value) nuevosDatos.Segmento = container.querySelector('#mod-segmento').value;
            if (container.querySelector('#mod-producto-nombre').value) nuevosDatos.Producto = container.querySelector('#mod-producto-nombre').value;
            if (container.querySelector('#mod-presentacion').value) nuevosDatos.Presentacion = container.querySelector('#mod-presentacion').value;
            if (container.querySelector('#mod-cantidad').value) nuevosDatos.Cantidad = parseFloat(container.querySelector('#mod-cantidad').value);
            if (container.querySelector('#mod-precio').value) nuevosDatos.Precio = parseFloat(container.querySelector('#mod-precio').value);

            if (id && Object.keys(nuevosDatos).length > 0) {
                const modificado = await modificarProducto(id, nuevosDatos);
                if (modificado) {
                    alert('Producto modificado con éxito.');
                    // Limpiar campos
                    container.querySelector('#mod-del-producto-id').value = '';
                    container.querySelector('#mod-rubro').value = '';
                    container.querySelector('#mod-sku').value = '';
                    container.querySelector('#mod-segmento').value = '';
                    container.querySelector('#mod-producto-nombre').value = '';
                    container.querySelector('#mod-presentacion').value = '';
                    container.querySelector('#mod-cantidad').value = '';
                    container.querySelector('#mod-precio').value = '';
                } else {
                    alert('Fallo al modificar producto.');
                }
            } else {
                alert('Por favor, ingresa el ID del producto y al menos un campo para modificar.');
            }
        });

        container.querySelector('#btn-submit-delete-producto').addEventListener('click', async () => {
            const id = container.querySelector('#mod-del-producto-id').value;
            if (id) {
                const eliminado = await eliminarProducto(id);
                if (eliminado) {
                    alert('Producto eliminado con éxito.');
                    container.querySelector('#mod-del-producto-id').value = '';
                } else {
                    alert('Fallo al eliminar producto.');
                }
            } else {
                alert('Por favor, ingresa el ID del producto a eliminar.');
            }
        });
    });

    // Lógica para mostrar la sección de buscar producto
    container.querySelector('#btn-show-search-producto').addEventListener('click', () => {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-gray-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Buscar Producto</h3>
                <input type="text" id="search-field" placeholder="Campo a buscar (Ej: Sku, Producto)" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 mb-4">
                <input type="text" id="search-value" placeholder="Valor a buscar" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 mb-4">
                <button id="btn-submit-search-producto" class="w-full bg-gray-600 text-white p-3 rounded-md font-semibold hover:bg-gray-700 transition duration-200">
                    Confirmar Búsqueda
                </button>
                <div id="search-results-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto mt-4">
                    <!-- Los resultados de la búsqueda se mostrarán aquí -->
                    <p class="text-gray-500">Los resultados aparecerán aquí.</p>
                </div>
            </div>
        `;
        // Conectar el botón de búsqueda
        container.querySelector('#btn-submit-search-producto').addEventListener('click', async () => {
            const campo = container.querySelector('#search-field').value;
            const valor = container.querySelector('#search-value').value;

            if (campo && valor) {
                const resultados = await buscarProducto(campo, valor);
                renderInventarioList(resultados, container.querySelector('#search-results-list')); // Muestra los resultados de la búsqueda
                if (resultados.length === 0) {
                    alert(`No se encontraron productos con ${campo}: ${valor}`);
                }
            } else {
                alert('Por favor, ingresa el campo y el valor para buscar.');
            }
        });
    });

    // Lógica para mostrar la sección de ver inventario completo
    container.querySelector('#btn-show-full-inventario').addEventListener('click', async () => {
        inventarioSubSection.innerHTML = `
            <div class="p-6 bg-purple-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-purple-800 mb-4">Inventario Completo</h3>
                <div id="full-inventario-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    <!-- Los productos se mostrarán aquí -->
                    <p class="text-gray-500">Cargando inventario...</p>
                </div>
            </div>
        `;
        const inventario = await verInventarioCompleto();
        renderInventarioList(inventario, container.querySelector('#full-inventario-list'));
    });

    // Función auxiliar para renderizar la lista de productos
    function renderInventarioList(productos, listContainer) {
        listContainer.innerHTML = ''; // Limpiar lista
        if (productos.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500">No hay productos para mostrar aún.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-200';
        productos.forEach(producto => {
            const li = document.createElement('li');
            li.className = 'py-2';
            li.innerHTML = `
                <p class="font-semibold">${producto.Producto} (${producto.Presentacion}) - SKU: ${producto.Sku} (ID: ${producto.id})</p>
                <p class="text-sm text-gray-600">Rubro: ${producto.Rubro || 'N/A'} | Segmento: ${producto.Segmento || 'N/A'}</p>
                <p class="text-sm text-gray-600">Cantidad: ${producto.Cantidad || 0} | Precio: $${(producto.Precio || 0).toFixed(2)}</p>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }
}
