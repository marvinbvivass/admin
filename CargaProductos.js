// CargaProductos.js
// Este archivo gestiona la carga de productos en vehículos,
// permitiendo seleccionar un vehículo, un usuario, y añadir productos con sus cantidades.
// Al guardar, la información completa de la carga se guarda en Firestore y se exporta a un archivo CSV.
// ¡Ahora la cantidad cargada se SUMA al inventario específico del camión!
// NOTA: Esta versión NO actualiza el inventario general (no resta cantidades).

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importa funciones de otros módulos para obtener datos necesarios
import { obtenerTodosLosVehiculos, obtenerTodosLosUsuarios } from './CargasyVehiculos.js';
import { verInventarioCompleto } from './inventario.js'; // Ya no se importa modificarProducto

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    let attempts = 0;
    const maxAttempts = 50; // Intentar por 5 segundos (50 * 100ms)
    while (!window.firebaseDb && attempts < maxAttempts) {
        console.log(`Esperando inicialización de Firebase en CargaProductos.js... Intento ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    if (!window.firebaseDb) {
        console.error('ERROR: Firebase DB no inicializado después de múltiples intentos en CargaProductos.js.');
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
 * Guarda la información de una carga de productos en Firestore.
 * @param {object} cargaData - Objeto con los detalles de la carga (vehículo, usuario, productos).
 * @returns {Promise<string|null>} El ID del documento de la carga agregada o null si hubo un error.
 */
async function guardarCarga(cargaData) {
    console.log('guardarCarga: Iniciando...');
    try {
        const { db } = await getFirestoreInstances();
        const cargasCollectionRef = collection(db, `CargasDeProductos`); // Nueva colección para las cargas
        const docRef = await addDoc(cargasCollectionRef, cargaData);
        console.log('Carga de productos guardada con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al guardar la carga de productos:', error);
        return null;
    } finally {
        console.log('guardarCarga: Finalizado.');
    }
}

/**
 * Convierte los datos de la carga a formato CSV con un formato específico.
 * @param {object} cargaData - Los datos completos de la carga.
 * @returns {string} La cadena de texto en formato CSV.
 */
function convertToCsv(cargaData) {
    const csvRows = [];

    // Fila 1: Información del camión
    // Formato: "Camion: Marca Modelo, Placa: XXX-YYY"
    const vehicleInfo = `Camion: ${cargaData.vehiculo.marca} ${cargaData.vehiculo.modelo}, Placa: ${cargaData.vehiculo.placa}`;
    csvRows.push(`"${vehicleInfo.replace(/"/g, '""')}"`); // Escapar comillas dobles y encerrar en comillas

    // Fila 2: Información del usuario
    // Formato: "Usuario: Nombre Apellido"
    const userInfo = `Usuario: ${cargaData.usuario.nombre} ${cargaData.usuario.apellido}`;
    csvRows.push(`"${userInfo.replace(/"/g, '""')}"`); // Escapar comillas dobles y encerrar en comillas

    // Fila 3: Cabecera de identificación de los productos
    const productHeaders = [
        "ProductoID",
        "ProductoNombre",
        "ProductoPresentacion",
        "ProductoRubro",
        "ProductoSegmento",
        "ProductoPrecioUSD",
        "CantidadCargada"
    ];
    csvRows.push(productHeaders.map(header => `"${header}"`).join(','));

    // De la cuarta fila en adelante: Información de los productos y cantidades
    cargaData.productos.forEach(producto => {
        const row = [
            producto.idProducto,
            producto.Producto,
            producto.Presentacion,
            producto.Rubro,
            producto.Segmento,
            producto.Precio,
            producto.Cantidad
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

    return csvRows.join('\n');
}

/**
 * Genera y descarga un archivo CSV con los datos de la carga.
 * @param {object} cargaData - Los datos completos de la carga.
 */
function generateCargaFile(cargaData) {
    const filename = `carga_${cargaData.vehiculo.placa}_${new Date().toISOString().slice(0, 10)}.csv`;
    const csvString = convertToCsv(cargaData); // Convertir a CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

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
        showCustomAlert(`Archivo de carga "${filename}" generado y descargado.`);
    } else {
        showCustomAlert('Su navegador no soporta la descarga directa de archivos. Los datos de la carga se han copiado a la consola.');
        console.log(csvString);
    }
}


/**
 * Renderiza la interfaz de usuario de la sección de Carga de Productos.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal.
 * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal.
 */
export async function renderCargaProductosSection(container, backToMainMenuCallback) {
    console.log('renderCargaProductosSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderCargaProductosSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return;
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Carga de Productos</h2>

            <div class="p-6 bg-pink-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-pink-800 mb-4">Registrar Nueva Carga</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="select-vehiculo-carga" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Camión:</label>
                        <select id="select-vehiculo-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <option value="">-- Selecciona un Camión --</option>
                        </select>
                    </div>
                    <div>
                        <label for="select-usuario-carga" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Usuario:</label>
                        <select id="select-usuario-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <option value="">-- Selecciona un Usuario --</option>
                        </select>
                    </div>
                </div>

                <div class="mb-4">
                    <label for="filter-rubro-carga" class="block text-sm font-medium text-gray-700 mb-1">Filtrar por Rubro:</label>
                    <select id="filter-rubro-carga" class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                        <option value="">Todos los Rubros</option>
                        <!-- Opciones de rubro se cargarán aquí -->
                    </select>
                </div>

                <div id="productos-disponibles-table-container" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md mb-4">
                    <p class="text-gray-500">Cargando productos disponibles...</p>
                </div>

                <button id="btn-guardar-carga" class="mt-6 w-full bg-pink-600 text-white p-3 rounded-md font-semibold hover:bg-pink-700 transition duration-200">
                    Guardar Carga y Generar Archivo
                </button>
                <button id="btn-back-carga-productos" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal
                </button>
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-carga-productos-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    const selectVehiculoCarga = container.querySelector('#select-vehiculo-carga');
    const selectUsuarioCarga = container.querySelector('#select-usuario-carga');
    const filterRubroCarga = container.querySelector('#filter-rubro-carga'); // Nuevo selector de rubro
    const productosDisponiblesTableContainer = container.querySelector('#productos-disponibles-table-container');
    const btnGuardarCarga = container.querySelector('#btn-guardar-carga');
    const btnBack = container.querySelector('#btn-back-carga-productos');
    const closeCargaProductosModalBtn = container.querySelector('#close-carga-productos-modal');

    let allVehiculos = [];
    let allUsuarios = [];
    let allProductsInventario = []; // Todos los productos del inventario (originales)
    let displayedProducts = []; // Productos actualmente mostrados en la tabla (filtrados)

    let selectedVehiculo = null;
    let selectedUsuario = null;

    // --- Cargar datos iniciales ---
    try {
        allVehiculos = await obtenerTodosLosVehiculos();
        allVehiculos.forEach(vehiculo => {
            const option = document.createElement('option');
            option.value = vehiculo.id;
            option.textContent = `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})`;
            selectVehiculoCarga.appendChild(option);
        });

        allUsuarios = await obtenerTodosLosUsuarios();
        allUsuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = `${usuario.nombre} ${usuario.apellido}`;
            selectUsuarioCarga.appendChild(option);
        });

        allProductsInventario = await verInventarioCompleto();
        
        // Obtener rubros únicos para el filtro
        const uniqueRubros = [...new Set(allProductsInventario.map(p => p.Rubro).filter(Boolean))];
        uniqueRubros.sort().forEach(rubro => {
            const option = document.createElement('option');
            option.value = rubro;
            option.textContent = rubro;
            filterRubroCarga.appendChild(option);
        });

        displayedProducts = [...allProductsInventario]; // Inicialmente, mostrar todos
        renderProductsTable(displayedProducts);

        console.log('Datos iniciales cargados para Carga de Productos.');
    } catch (error) {
        console.error('Error al cargar datos iniciales para Carga de Productos:', error);
        showCustomAlert('Error al cargar datos necesarios. Por favor, intente de nuevo.');
        productosDisponiblesTableContainer.innerHTML = '<p class="text-red-600">Error al cargar productos. Por favor, verifique los permisos o la conexión.</p>';
    }

    // --- Event Listeners para selección principal ---
    selectVehiculoCarga.addEventListener('change', () => {
        selectedVehiculo = allVehiculos.find(v => v.id === selectVehiculoCarga.value);
        console.log('Vehículo seleccionado:', selectedVehiculo);
    });

    selectUsuarioCarga.addEventListener('change', () => {
        selectedUsuario = allUsuarios.find(u => u.id === selectUsuarioCarga.value);
        console.log('Usuario seleccionado:', selectedUsuario);
    });

    // --- Renderizar la tabla de productos ---
    function renderProductsTable(productsToRender) {
        productosDisponiblesTableContainer.innerHTML = '';
        if (productsToRender.length === 0) {
            productosDisponiblesTableContainer.innerHTML = '<p class="text-gray-500">No hay productos que coincidan con la búsqueda.</p>';
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
                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad a Cargar</th>
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
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Segmento || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${product.Producto || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${product.Presentacion || 'N/A'}</td>
                <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                    <input type="number" min="0" value="0" class="w-24 p-1 border border-gray-300 rounded-md text-center cantidad-input" data-product-id="${product.id}">
                </td>
            `;
            tbody.appendChild(row);
        });
        productosDisponiblesTableContainer.appendChild(table);
    }

    // --- Lógica de filtrado por rubro ---
    filterRubroCarga.addEventListener('change', () => {
        const selectedRubro = filterRubroCarga.value;
        if (selectedRubro === "") {
            displayedProducts = [...allProductsInventario]; // Mostrar todos si no hay rubro seleccionado
        } else {
            displayedProducts = allProductsInventario.filter(product =>
                product.Rubro === selectedRubro
            );
        }
        renderProductsTable(displayedProducts);
    });

    // --- Lógica para guardar la carga ---
    btnGuardarCarga.addEventListener('click', async () => {
        if (!selectedVehiculo) {
            showCustomAlert('Por favor, selecciona un camión para la carga.');
            return;
        }
        if (!selectedUsuario) {
            showCustomAlert('Por favor, selecciona un usuario para la carga.');
            return;
        }

        const productosCargados = [];
        const cantidadInputs = productosDisponiblesTableContainer.querySelectorAll('.cantidad-input');

        cantidadInputs.forEach(input => {
            const productId = input.dataset.productId;
            const cantidad = parseInt(input.value);

            if (cantidad > 0) {
                const product = allProductsInventario.find(p => p.id === productId);
                if (product) {
                    productosCargados.push({
                        idProducto: product.id,
                        Producto: product.Producto,
                        Presentacion: product.Presentacion,
                        Rubro: product.Rubro,
                        Segmento: product.Segmento,
                        Precio: product.Precio,
                        Cantidad: cantidad
                    });
                }
            }
        });

        if (productosCargados.length === 0) {
            showCustomAlert('Por favor, añade al menos un producto a la carga con una cantidad mayor a 0.');
            return;
        }

        const confirmed = await showCustomConfirm('¿Estás seguro de que quieres guardar esta carga?');
        if (!confirmed) {
            return;
        }

        const cargaData = {
            fechaCarga: new Date().toISOString(),
            vehiculo: {
                id: selectedVehiculo.id,
                marca: selectedVehiculo.marca,
                modelo: selectedVehiculo.modelo,
                placa: selectedVehiculo.placa,
            },
            usuario: {
                id: selectedUsuario.id,
                nombre: selectedUsuario.nombre,
                apellido: selectedUsuario.apellido,
            },
            productos: productosCargados
        };

        const cargaId = await guardarCarga(cargaData);
        if (cargaId) {
            // --- INICIO: Lógica para SUMAR al inventario del camión ---
            const { db } = await getFirestoreInstances();
            let truckInventoryUpdateSuccess = true;

            for (const loadedProduct of productosCargados) {
                const productDocRef = doc(db, 'Vehiculos', selectedVehiculo.id, 'inventarioCamion', loadedProduct.idProducto);
                
                try {
                    const docSnap = await getDoc(productDocRef);
                    let newQuantity = loadedProduct.Cantidad;
                    let productDetails = {
                        Producto: loadedProduct.Producto,
                        Presentacion: loadedProduct.Presentacion,
                        Rubro: loadedProduct.Rubro,
                        Segmento: loadedProduct.Segmento,
                        Precio: loadedProduct.Precio,
                    };

                    if (docSnap.exists()) {
                        const currentTruckProduct = docSnap.data();
                        newQuantity += (currentTruckProduct.Cantidad || 0);
                        // Mantener los detalles existentes si ya están en el documento del camión
                        // o actualizar si hay nuevos campos. setDoc con merge:true se encarga de esto.
                    }

                    await setDoc(productDocRef, { Cantidad: newQuantity, ...productDetails }, { merge: true });
                    console.log(`Producto ${loadedProduct.Producto} actualizado en el inventario del camión ${selectedVehiculo.placa}. Nueva cantidad: ${newQuantity}`);

                } catch (error) {
                    console.error(`Fallo al actualizar el inventario del camión para el producto ${loadedProduct.Producto}:`, error);
                    truckInventoryUpdateSuccess = false;
                }
            }
            // --- FIN: Lógica para SUMAR al inventario del camión ---

            if (truckInventoryUpdateSuccess) {
                showCustomAlert('Carga guardada y inventario del camión actualizado con éxito. Generando archivo...');
            } else {
                showCustomAlert('Carga guardada, pero hubo problemas al actualizar el inventario del camión. Verifique la consola para más detalles.');
            }
            
            generateCargaFile(cargaData); // Generar el archivo

            // Limpiar el formulario y resetear la tabla después de guardar
            selectVehiculoCarga.value = '';
            selectUsuarioCarga.value = '';
            selectedVehiculo = null;
            selectedUsuario = null;
            // Resetear cantidades en la tabla
            cantidadInputs.forEach(input => input.value = '0');
            filterRubroCarga.value = ''; // Resetear el filtro de rubro
            displayedProducts = [...allProductsInventario]; // Restaurar todos los productos
            renderProductsTable(displayedProducts);

        } else {
            showCustomAlert('Fallo al guardar la carga.');
        }
    });

    // --- Lógica para cerrar el modal ---
    closeCargaProductosModalBtn.addEventListener('click', () => {
        container.classList.add('hidden');
        backToMainMenuCallback();
    });

    // --- Lógica para el botón "Volver" ---
    btnBack.addEventListener('click', () => {
        container.classList.add('hidden');
        backToMainMenuCallback();
    });

    console.log('renderCargaProductosSection: Función completada.');
}
