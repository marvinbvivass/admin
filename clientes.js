// clientes.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los clientes
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variable para almacenar el mapa de zonas a sectores, cargado desde Firebase
let zonaSectorMap = {};
const ZONA_SECTOR_CONFIG_DOC_ID = 'zonasSectores'; // ID fijo para el documento de configuración

// Función auxiliar para obtener la instancia de Firestore
async function getFirestoreInstances() {
    while (!window.firebaseDb) {
        console.log('Esperando inicialización de Firebase en clientes.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
        db: window.firebaseDb,
    };
}

/**
 * Obtiene la configuración de zonas y sectores desde Firebase.
 * @returns {Promise<object>} El mapa de zonas a sectores.
 */
async function obtenerConfiguracionZonasSectores() {
    try {
        const { db } = await getFirestoreInstances();
        // Las configuraciones ahora están en la raíz
        const configDocRef = doc(db, `configuracion`, ZONA_SECTOR_CONFIG_DOC_ID);
        const configSnap = await getDoc(configDocRef);

        if (configSnap.exists()) {
            console.log('Configuración de zonas y sectores obtenida:', configSnap.data().mapa);
            return configSnap.data().mapa || {};
        } else {
            console.log('No se encontró configuración de zonas y sectores. Usando mapa predeterminado.');
            // Si no existe, inicializa con un mapa predeterminado o vacío
            return {
                "Santa Teresa": ["Barrio Bolivar", "Principal Santa Teresa", "Los Teques", "Calle 4", "La Villa"],
                "Foraneo": ["No Aplica"],
                "Zona Industrial": ["Zona Industrial"],
                "Machiri": ["Parte Alta", "Parte Baja", "Barrio el Lago"],
                "Palo Gordo": ["Gallardin", "Gallardin Parte Baja", "Gallardin Parte Alta", "Principal Palo Gordo", "Calle Tachira", "Calle del Medio", "Toica", "Nazareno", "La Trinidad", "Calle del Hambre", "Puente/Cancha"]
            };
        }
    } catch (error) {
        console.error('Error al obtener configuración de zonas y sectores:', error);
        // En caso de error, devuelve un mapa vacío para evitar que la app falle.
        return {};
    }
}

/**
 * Guarda la configuración de zonas y sectores en Firebase.
 * @param {object} newMap - El nuevo mapa de zonas a sectores a guardar.
 * @returns {Promise<boolean>} True si se guardó con éxito, false en caso contrario.
 */
async function guardarConfiguracionZonasSectores(newMap) {
    try {
        const { db } = await getFirestoreInstances();
        const configDocRef = doc(db, `configuracion`, ZONA_SECTOR_CONFIG_DOC_ID);
        await setDoc(configDocRef, { mapa: newMap }); // Usa setDoc para sobrescribir o crear
        console.log('Configuración de zonas y sectores guardada con éxito.');
        zonaSectorMap = newMap; // Actualiza la variable global
        return true;
    } catch (error) {
        console.error('Error al guardar configuración de zonas y sectores:', error);
        return false;
    }
}

/**
 * Agrega un nuevo cliente al sistema en Firestore.
 * Los datos se guardarán en una colección compartida en la raíz.
 * Ruta: /datosClientes
 * @param {object} cliente - Objeto con los datos del cliente a agregar.
 * @param {string} cliente.ID - ID único del cliente (puede ser autogenerado por Firestore si no se especifica).
 * @param {string} cliente.CEP - Código de Enrutamiento Postal.
 * @param {string} cliente.NombreComercial - Nombre comercial del cliente.
 * @param {string} cliente.NombrePersonal - Nombre personal del contacto.
 * @param {string} cliente.Zona - Zona geográfica del cliente.
 * @param {string} cliente.Sector - Sector de actividad del cliente.
 * @param {string} cliente.Tlf - Número de teléfono.
 * @param {number} cliente.Deuda - Monto de la deuda del cliente.
 * @param {string} [cliente.Observaciones] - Observaciones adicionales (opcional).
 * @returns {Promise<string|null>} El ID del documento del cliente agregado o null si hubo un error.
 */
export async function agregarCliente(cliente) {
    try {
        const { db } = await getFirestoreInstances();
        const clientesCollectionRef = collection(db, `datosClientes`); // Ruta modificada
        const docRef = await addDoc(clientesCollectionRef, cliente);
        console.log('Cliente agregado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al agregar cliente:', error);
        return null;
    }
}

/**
 * Modifica los datos de un cliente existente en Firestore.
 * @param {string} idCliente - ID único del documento del cliente a modificar.
 * @param {object} nuevosDatos - Objeto con los nuevos datos del cliente.
 * @returns {Promise<boolean>} True si la modificación fue exitosa, false en caso contrario.
 */
export async function modificarCliente(idCliente, nuevosDatos) {
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente); // Ruta modificada
        await updateDoc(clienteDocRef, nuevosDatos);
        console.log('Cliente modificado con éxito. ID:', idCliente);
        return true;
    } catch (error) {
        console.error('Error al modificar cliente:', error);
        return false;
    }
}

/**
 * Elimina un cliente del sistema de Firestore.
 * @param {string} idCliente - ID único del documento del cliente a eliminar.
 * @returns {Promise<boolean>} True si la eliminación fue exitosa, false en caso contrario.
 */
export async function eliminarCliente(idCliente) {
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente); // Ruta modificada
        await deleteDoc(clienteDocRef);
        console.log('Cliente eliminado con éxito. ID:', idCliente);
        return true;
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return false;
    }
}

/**
 * Obtiene los datos de un cliente específico de Firestore.
 * @param {string} idCliente - ID único del documento del cliente a obtener.
 * @returns {Promise<object|null>} Los datos del cliente o null si no se encuentra o hay un error.
 */
export async function obtenerCliente(idCliente) {
    try {
        const { db } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `datosClientes`, idCliente); // Ruta modificada
        const clienteSnap = await getDoc(clienteDocRef);

        if (clienteSnap.exists()) {
            console.log('Cliente obtenido:', clienteSnap.data());
            return { id: clienteSnap.id, ...clienteSnap.data() };
        } else {
            console.log('No se encontró el cliente con ID:', idCliente);
            return null;
        }
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        return null;
    }
}

/**
 * Obtiene todos los clientes del sistema de Firestore para el usuario actual.
 * @returns {Promise<Array<object>>} Un array de objetos de cliente.
 */
export async function obtenerTodosLosClientes() {
    try {
        const { db } = await getFirestoreInstances();
        const clientesCollectionRef = collection(db, `datosClientes`); // Ruta modificada
        const querySnapshot = await getDocs(clientesCollectionRef);
        const clientes = [];
        querySnapshot.forEach((doc) => {
            clientes.push({ id: doc.id, ...doc.data() });
        });
        console.log('Todos los clientes obtenidos:', clientes);
        return clientes;
    } catch (error) {
        console.error('Error al obtener todos los clientes:', error);
        return [];
    }
}

/**
 * Renderiza la interfaz de usuario de la sección de clientes dentro del contenedor dado.
 * @param {HTMLElement} container - El elemento DOM donde se renderizará el modal de clientes.
 */
export async function renderClientesSection(container) {
    console.log('renderClientesSection: Iniciando. Contenedor recibido:', container);
    if (!container) {
        console.error('renderClientesSection: ERROR - El elemento contenedor es nulo o indefinido.');
        return; // Detener la ejecución si no hay contenedor
    }

    container.innerHTML = `
        <div class="modal-content">
            <h2 class="text-4xl font-bold text-gray-900 mb-6 text-center">Gestión de Clientes</h2>

            <div id="clientes-main-buttons-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button id="btn-show-add-cliente" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Agregar Cliente
                </button>
                <button id="btn-show-modify-delete-cliente" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar/Eliminar Cliente
                </button>
                <button id="btn-show-ver-clientes" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200">
                    Ver Lista de Clientes
                </button>
                <button id="btn-show-manage-zones-sectors" class="bg-purple-600 text-white p-4 rounded-md font-semibold hover:bg-purple-700 transition duration-200 col-span-full">
                    Gestionar Zonas y Sectores
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="clientes-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar o buscar/listar se cargará aquí -->
            </div>

            <!-- Botón para cerrar el modal -->
            <button id="close-clientes-modal" class="absolute top-4 right-4 bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    console.log('renderClientesSection: HTML inyectado en el contenedor.');
    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const clientesMainButtonsContainer = container.querySelector('#clientes-main-buttons-container');
    const clientesSubSection = container.querySelector('#clientes-sub-section');
    const closeClientesModalBtn = container.querySelector('#close-clientes-modal');

    // Referencias a los botones principales
    const btnShowAddCliente = container.querySelector('#btn-show-add-cliente');
    const btnShowModifyDeleteCliente = container.querySelector('#btn-show-modify-delete-cliente');
    const btnShowVerClientes = container.querySelector('#btn-show-ver-clientes');
    const btnShowManageZonesSectors = container.querySelector('#btn-show-manage-zones-sectors');

    console.log('renderClientesSection: Verificando referencias de botones:');
    console.log('  btnShowAddCliente:', btnShowAddCliente ? 'Encontrado' : 'NO ENCONTRADO');
    console.log('  btnShowModifyDeleteCliente:', btnShowModifyDeleteCliente ? 'Encontrado' : 'NO ENCONTRADO');
    console.log('  btnShowVerClientes:', btnShowVerClientes ? 'Encontrado' : 'NO ENCONTRADO');
    console.log('  btnShowManageZonesSectors:', btnShowManageZonesSectors ? 'Encontrado' : 'NO ENCONTRADO');

    // Cargar el mapa de zonas y sectores al inicio de la sección de clientes
    zonaSectorMap = await obtenerConfiguracionZonasSectores();

    // Función para mostrar los botones principales y limpiar la sub-sección
    const showClientesMainButtons = () => {
        clientesSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        clientesMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    };

    /**
     * Función auxiliar para renderizar la lista de clientes.
     * Esta función se usa en "Buscar Cliente" y "Modificar/Eliminar Cliente".
     * No muestra el ID del cliente.
     * @param {Array<object>} clientes - Array de objetos de cliente.
     * @param {HTMLElement} listContainer - El elemento DOM donde se renderizará la lista.
     * @param {function(object): void} [actionCallback] - Función a ejecutar cuando se selecciona un cliente.
     */
    function renderClientesList(clientes, listContainer, actionCallback = null) {
        listContainer.innerHTML = ''; // Limpiar lista
        if (clientes.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500">No hay clientes para mostrar aún.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-200';
        clientes.forEach(cliente => {
            const li = document.createElement('li');
            li.className = 'py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center';
            li.innerHTML = `
                <div>
                    <p class="font-semibold">${cliente.NombreComercial || 'N/A'} (${cliente.NombrePersonal || 'N/A'})</p>
                    <p class="text-sm text-gray-600">CEP: ${cliente.CEP || 'N/A'} | Teléfono: ${cliente.Tlf || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Zona: ${cliente.Zona || 'N/A'} | Sector: ${cliente.Sector || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Deuda: $${(cliente.Deuda || 0).toFixed(2)}</p>
                    <p class="text-sm text-gray-600">Observaciones: ${cliente.Observaciones || 'N/A'}</p>
                </div>
                ${actionCallback ? `<button class="mt-2 sm:mt-0 sm:ml-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition duration-200 select-client-btn" data-client-id="${cliente.id}">Seleccionar</button>` : ''}
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);

        // Adjuntar event listeners a los botones "Seleccionar" si existen
        if (actionCallback) {
            listContainer.querySelectorAll('.select-client-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const clientId = event.target.dataset.clientId;
                    const selectedClient = clientes.find(c => c.id === clientId);
                    if (selectedClient) {
                        actionCallback(selectedClient);
                    }
                });
            });
        }
    }

    // Función para renderizar el formulario de agregar cliente
    const renderAddClienteForm = (parentContainer, backToMainMenuCallback) => {
        parentContainer.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Agregar Nuevo Cliente</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-cep" placeholder="CEP" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-nombre-comercial" placeholder="Nombre Comercial" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-nombre-personal" placeholder="Nombre Personal" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <select id="add-zona" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecciona Zona</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('')}
                    </select>
                    <select id="add-sector" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Selecciona Sector</option>
                    </select>
                    <input type="tel" id="add-tlf" placeholder="Teléfono" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="number" step="0.01" id="add-deuda" placeholder="Deuda" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <textarea id="add-observaciones" placeholder="Observaciones (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-full"></textarea>
                </div>
                <button id="btn-submit-add-cliente" class="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Confirmar Agregar Cliente
                </button>
                <button id="btn-back-add-cliente" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;
        // Lógica para actualizar el select de Sector cuando cambia la Zona
        const addZonaSelect = parentContainer.querySelector('#add-zona');
        const addSectorSelect = parentContainer.querySelector('#add-sector');
        addZonaSelect.addEventListener('change', () => {
            const selectedZona = addZonaSelect.value;
            addSectorSelect.innerHTML = '<option value="">Selecciona Sector</option>'; // Limpiar opciones anteriores
            if (selectedZona && zonaSectorMap[selectedZona]) {
                zonaSectorMap[selectedZona].forEach(sector => {
                    const option = document.createElement('option');
                    option.value = sector;
                    option.textContent = sector;
                    addSectorSelect.appendChild(option);
                });
                addSectorSelect.disabled = false; // Habilitar el select de Sector
            } else {
                addSectorSelect.disabled = true; // Deshabilitar si no hay zona seleccionada
            }
        });

        // Conectar el botón de agregar cliente
        parentContainer.querySelector('#btn-submit-add-cliente').addEventListener('click', async () => {
            const cliente = {
                CEP: parentContainer.querySelector('#add-cep').value,
                NombreComercial: parentContainer.querySelector('#add-nombre-comercial').value,
                NombrePersonal: parentContainer.querySelector('#add-nombre-personal').value,
                Zona: parentContainer.querySelector('#add-zona').value,
                Sector: parentContainer.querySelector('#add-sector').value,
                Tlf: parentContainer.querySelector('#add-tlf').value,
                Deuda: parseFloat(parentContainer.querySelector('#add-deuda').value) || 0, // Capturar Deuda
                Observaciones: parentContainer.querySelector('#add-observaciones').value
            };

            const id = await agregarCliente(cliente);
            if (id) {
                alert('Cliente agregado con éxito, ID: ' + id);
                // Limpiar campos
                parentContainer.querySelector('#add-cep').value = '';
                parentContainer.querySelector('#add-nombre-comercial').value = '';
                parentContainer.querySelector('#add-nombre-personal').value = '';
                parentContainer.querySelector('#add-zona').value = '';
                parentContainer.querySelector('#add-sector').innerHTML = '<option value="">Selecciona Sector</option>'; // Limpiar y resetear sector
                parentContainer.querySelector('#add-sector').disabled = true;
                parentContainer.querySelector('#add-tlf').value = '';
                parentContainer.querySelector('#add-deuda').value = ''; // Limpiar Deuda
                parentContainer.querySelector('#add-observaciones').value = '';
            } else {
                alert('Fallo al agregar cliente.');
            }
        });

        // Conectar el botón Volver
        parentContainer.querySelector('#btn-back-add-cliente').addEventListener('click', backToMainMenuCallback);
    };

    // Función para mostrar la interfaz de búsqueda para modificar/eliminar
    const showModifyDeleteSearch = async () => {
        clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Buscar Cliente para Modificar/Eliminar</h3>
                <input type="text" id="search-modify-delete-input" placeholder="Buscar por Nombre, CEP, Zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">
                <div id="modify-delete-client-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    <!-- Los clientes se mostrarán aquí -->
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>
                <button id="btn-back-modify-delete-search" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal
                </button>
            </div>
        `;

        const clientListDiv = clientesSubSection.querySelector('#modify-delete-client-list');
        const searchInput = clientesSubSection.querySelector('#search-modify-delete-input');
        let allClients = [];

        allClients = await obtenerTodosLosClientes();
        renderClientesList(allClients, clientListDiv, (selectedClient) => {
            renderModifyDeleteForm(selectedClient); // Pasa el cliente seleccionado al formulario de modificar/eliminar
        });

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredClients = allClients.filter(cliente => {
                return (cliente.NombreComercial && cliente.NombreComercial.toLowerCase().includes(searchTerm)) ||
                       (cliente.NombrePersonal && cliente.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                       (cliente.CEP && cliente.CEP.toLowerCase().includes(searchTerm)) ||
                       (cliente.Zona && cliente.Zona.toLowerCase().includes(searchTerm)) ||
                       (cliente.Sector && cliente.Sector.toLowerCase().includes(searchTerm)) ||
                       (cliente.Tlf && cliente.Tlf.toLowerCase().includes(searchTerm)) ||
                       (cliente.Observaciones && cliente.Observaciones.toLowerCase().includes(searchTerm));
            });
            renderClientesList(filteredClients, clientListDiv, (selectedClient) => {
                renderModifyDeleteForm(selectedClient);
            });
        });

        clientesSubSection.querySelector('#btn-back-modify-delete-search').addEventListener('click', showClientesMainButtons);
    };

    // Función para renderizar el formulario de modificar/eliminar
    const renderModifyDeleteForm = (clientData = null) => {
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Cliente</h3>
                <input type="hidden" id="mod-del-cliente-id" value="${clientData ? clientData.id : ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="mod-cep" placeholder="Nuevo CEP (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData?.CEP || ''}">
                    <input type="text" id="mod-nombre-comercial" placeholder="Nuevo Nombre Comercial (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData?.NombreComercial || ''}">
                    <input type="text" id="mod-nombre-personal" placeholder="Nuevo Nombre Personal (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData?.NombrePersonal || ''}">
                    <select id="mod-zona" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Nueva Zona (opcional)</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}" ${clientData?.Zona === zona ? 'selected' : ''}>${zona}</option>`).join('')}
                    </select>
                    <select id="mod-sector" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" ${clientData?.Zona ? '' : 'disabled'}>
                        <option value="">Nuevo Sector (opcional)</option>
                        ${clientData?.Zona && zonaSectorMap[clientData.Zona] ? zonaSectorMap[clientData.Zona].map(sector => `<option value="${sector}" ${clientData?.Sector === sector ? 'selected' : ''}>${sector}</option>`).join('') : ''}
                    </select>
                    <input type="tel" id="mod-tlf" placeholder="Nuevo Teléfono (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData?.Tlf || ''}">
                    <input type="number" step="0.01" id="mod-deuda" placeholder="Nueva Deuda (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" value="${clientData?.Deuda || ''}">
                    <textarea id="mod-observaciones" placeholder="Nuevas Observaciones (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 col-span-full">${clientData?.Observaciones || ''}</textarea>
                </div>
                <div class="flex flex-col md:flex-row gap-4 mt-6">
                    <button id="btn-submit-modify-cliente" class="flex-1 bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Confirmar Modificar
                    </button>
                    <button id="btn-submit-delete-cliente" class="flex-1 bg-red-600 text-white p-3 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                        Confirmar Eliminar
                    </button>
                </div>
                <button id="btn-back-modify-delete-cliente" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        // Lógica para actualizar el select de Sector cuando cambia la Zona en modificar
        const modZonaSelect = clientesSubSection.querySelector('#mod-zona');
        const modSectorSelect = clientesSubSection.querySelector('#mod-sector');
        modZonaSelect.addEventListener('change', () => {
            const selectedZona = modZonaSelect.value;
            modSectorSelect.innerHTML = '<option value="">Nuevo Sector (opcional)</option>'; // Limpiar opciones anteriores
            if (selectedZona && zonaSectorMap[selectedZona]) {
                zonaSectorMap[selectedZona].forEach(sector => {
                    const option = document.createElement('option');
                    option.value = sector;
                    option.textContent = sector;
                    modSectorSelect.appendChild(option);
                });
                modSectorSelect.disabled = false; // Habilitar el select de Sector
            } else {
                modSectorSelect.disabled = true; // Deshabilitar si no hay zona seleccionada
            }
        });

        // Conectar los botones de modificar/eliminar cliente
        clientesSubSection.querySelector('#btn-submit-modify-cliente').addEventListener('click', async () => {
            const id = clientesSubSection.querySelector('#mod-del-cliente-id').value;
            const nuevosDatos = {};
            if (clientesSubSection.querySelector('#mod-cep').value !== (clientData?.CEP || '')) nuevosDatos.CEP = clientesSubSection.querySelector('#mod-cep').value;
            if (clientesSubSection.querySelector('#mod-nombre-comercial').value !== (clientData?.NombreComercial || '')) nuevosDatos.NombreComercial = clientesSubSection.querySelector('#mod-nombre-comercial').value;
            if (clientesSubSection.querySelector('#mod-nombre-personal').value !== (clientData?.NombrePersonal || '')) nuevosDatos.NombrePersonal = clientesSubSection.querySelector('#mod-nombre-personal').value;
            if (clientesSubSection.querySelector('#mod-zona').value) nuevosDatos.Zona = clientesSubSection.querySelector('#mod-zona').value;
            if (clientesSubSection.querySelector('#mod-sector').value) nuevosDatos.Sector = clientesSubSection.querySelector('#mod-sector').value;
            if (clientesSubSection.querySelector('#mod-tlf').value !== (clientData?.Tlf || '')) nuevosDatos.Tlf = clientesSubSection.querySelector('#mod-tlf').value;
            if (clientesSubSection.querySelector('#mod-deuda').value !== (clientData?.Deuda || '')) nuevosDatos.Deuda = parseFloat(clientesSubSection.querySelector('#mod-deuda').value); // Capturar Deuda
            if (clientesSubSection.querySelector('#mod-observaciones').value !== (clientData?.Observaciones || '')) nuevosDatos.Observaciones = clientesSubSection.querySelector('#mod-observaciones').value;


            if (id && Object.keys(nuevosDatos).length > 0) {
                const modificado = await modificarCliente(id, nuevosDatos);
                if (modificado) {
                    alert('Cliente modificado con éxito.');
                    // Limpiar campos y volver a la búsqueda
                    showModifyDeleteSearch();
                } else {
                    alert('Fallo al modificar cliente.');
                }
            } else {
                alert('Por favor, ingresa el ID del cliente y al menos un campo para modificar.');
            }
        });

        clientesSubSection.querySelector('#btn-submit-delete-cliente').addEventListener('click', async () => {
            const id = clientesSubSection.querySelector('#mod-del-cliente-id').value;
            if (id) {
                const eliminado = await eliminarCliente(id);
                if (eliminado) {
                    alert('Cliente eliminado con éxito.');
                    // Volver a la búsqueda
                    showModifyDeleteSearch();
                } else {
                    alert('Fallo al eliminar cliente.');
                }
            } else {
                alert('Por favor, ingresa el ID del cliente a eliminar.');
            }
        });

        // Conectar el botón Volver
        clientesSubSection.querySelector('#btn-back-modify-delete-cliente').addEventListener('click', showModifyDeleteSearch);
    };


    /**
     * Renderiza la sección para ver la lista completa de clientes en formato de tabla.
     * @param {HTMLElement} parentContainer - El contenedor donde se renderizará esta sección.
     * @param {function(): void} backToMainMenuCallback - Callback para volver al menú principal de clientes.
     */
    async function renderVerClientesSection(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Lista Completa de Clientes</h3>
                <input type="text" id="search-ver-clientes-input" placeholder="Buscar cliente por nombre, CEP, zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4">
                <div id="ver-clientes-list-table" class="bg-white p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto shadow-md">
                    <!-- La tabla de clientes se mostrará aquí -->
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>
                <button id="btn-back-ver-clientes" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const clientesListTableDiv = parentContainer.querySelector('#ver-clientes-list-table');
        const searchInput = parentContainer.querySelector('#search-ver-clientes-input');
        const btnBack = parentContainer.querySelector('#btn-back-ver-clientes');

        let allClients = []; // Para almacenar todos los clientes y filtrar sobre ellos

        // Función interna para renderizar la tabla de clientes
        const renderClientsTable = (clientsToRender) => {
            clientesListTableDiv.innerHTML = ''; // Limpiar tabla
            if (clientsToRender.length === 0) {
                clientesListTableDiv.innerHTML = '<p class="text-gray-500">No hay clientes para mostrar.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'min-w-full divide-y divide-gray-200';
            table.innerHTML = `
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Comercial</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Personal</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CEP</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zona</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda ($)</th>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- Filas de clientes se cargarán aquí -->
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            clientsToRender.forEach(cliente => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-100';
                row.innerHTML = `
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-900">${cliente.NombreComercial || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.NombrePersonal || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.CEP || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.Zona || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.Sector || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.Tlf || 'N/A'}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">$${(cliente.Deuda || 0).toFixed(2)}</td>
                    <td class="px-2 py-1 whitespace-nowrap text-xs text-gray-500">${cliente.Observaciones || 'N/A'}</td>
                `;
                tbody.appendChild(row);
            });
            clientesListTableDiv.appendChild(table);
        };

        // Cargar todos los clientes al abrir la sección
        try {
            allClients = await obtenerTodosLosClientes();
            renderClientsTable(allClients);
        } catch (error) {
            console.error('Error al obtener clientes para la lista:', error);
            clientesListTableDiv.innerHTML = '<p class="text-red-600">Error al cargar clientes. Por favor, verifique los permisos.</p>';
        }

        // Lógica de filtrado en tiempo real
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredClients = allClients.filter(cliente => {
                    return (cliente.NombreComercial && cliente.NombreComercial.toLowerCase().includes(searchTerm)) ||
                           (cliente.NombrePersonal && cliente.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                           (cliente.CEP && cliente.CEP.toLowerCase().includes(searchTerm)) ||
                           (cliente.Zona && cliente.Zona.toLowerCase().includes(searchTerm)) ||
                           (cliente.Sector && cliente.Sector.toLowerCase().includes(searchTerm)) ||
                           (cliente.Tlf && cliente.Tlf.toLowerCase().includes(searchTerm)) ||
                           (cliente.Observaciones && cliente.Observaciones.toLowerCase().includes(searchTerm));
                });
                renderClientsTable(filteredClients);
            });
        } else {
            console.error('renderVerClientesSection: Input #search-ver-clientes-input no encontrado.');
        }


        // Conectar el botón Volver
        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderVerClientesSection: Botón #btn-back-ver-clientes no encontrado.');
        }
    }


    // --- Funciones para gestionar Zonas y Sectores (Refactorizadas) ---

    // Función principal para el menú de gestión de Zonas y Sectores
    async function renderGestionarZonasSectoresForm() {
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-purple-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-purple-800 mb-4">Gestionar Zonas y Sectores</h3>

                <div id="zones-sectors-management-buttons" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button id="btn-add-zone-sector" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Zona o Sector
                    </button>
                    <button id="btn-modify-delete-zone-sector" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Modificar o Eliminar Zona o Sector
                    </button>
                </div>

                <div id="zones-sectors-sub-section">
                    <!-- El contenido de añadir o modificar/eliminar se cargará aquí -->
                </div>

                <button id="btn-back-from-zones-sectors-management" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver al Menú Principal de Clientes
                </button>
            </div>
        `;

        const zonesSectorsSubSection = clientesSubSection.querySelector('#zones-sectors-sub-section');
        const btnBack = clientesSubSection.querySelector('#btn-back-from-zones-sectors-management');
        const btnAdd = clientesSubSection.querySelector('#btn-add-zone-sector');
        const btnModifyDelete = clientesSubSection.querySelector('#btn-modify-delete-zone-sector');

        // Función para mostrar los botones principales de gestión de zonas/sectores
        const showZonesSectorsMainButtons = () => {
            zonesSectorsSubSection.innerHTML = ''; // Limpiar el contenido de la sub-sección
            clientesSubSection.querySelector('#zones-sectors-management-buttons').classList.remove('hidden'); // Mostrar los botones principales
        };

        // Event Listeners para los botones del menú de gestión de zonas/sectores
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                clientesSubSection.querySelector('#zones-sectors-management-buttons').classList.add('hidden'); // Oculta los botones del menú
                renderAddZoneSectorForm(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-add-zone-sector no encontrado.');
        }

        if (btnModifyDelete) {
            btnModifyDelete.addEventListener('click', () => {
                clientesSubSection.querySelector('#zones-sectors-management-buttons').classList.add('hidden'); // Oculta los botones del menú
                renderModifyDeleteZoneSectorForm(zonesSectorsSubSection, showZonesSectorsMainButtons);
            });
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-modify-delete-zone-sector no encontrado.');
        }

        if (btnBack) {
            btnBack.addEventListener('click', showClientesMainButtons); // Vuelve al menú principal de clientes
        } else {
            console.error('renderGestionarZonasSectoresForm: Botón #btn-back-from-zones-sectors-management no encontrado.');
        }
    }

    // Función para renderizar el formulario de añadir Zona o Sector
    async function renderAddZoneSectorForm(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-4 bg-blue-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-blue-800 mb-3">Añadir Zona o Sector</h4>

                <div class="mb-4">
                    <label for="add-new-zone-input" class="block text-sm font-medium text-gray-700 mb-1">Añadir Nueva Zona:</label>
                    <input type="text" id="add-new-zone-input" placeholder="Nombre de la nueva Zona" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="btn-add-new-zone" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                        Añadir Zona
                    </button>
                </div>

                <div class="mb-4">
                    <label for="select-zone-for-sector" class="block text-sm font-medium text-gray-700 mb-1">Seleccionar Zona para Añadir Sector:</label>
                    <select id="select-zone-for-sector" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Selecciona una Zona --</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('')}
                    </select>
                    <input type="text" id="add-new-sector-input" placeholder="Nombre del nuevo Sector" class="mt-2 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <button id="btn-add-new-sector" class="mt-2 w-full bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200" disabled>
                        Añadir Sector
                    </button>
                </div>

                <button id="btn-back-from-add-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const addNewZoneInput = parentContainer.querySelector('#add-new-zone-input');
        const btnAddNewZone = parentContainer.querySelector('#btn-add-new-zone');
        const selectZoneForSector = parentContainer.querySelector('#select-zone-for-sector');
        const addNewSectorInput = parentContainer.querySelector('#add-new-sector-input');
        const btnAddNewSector = parentContainer.querySelector('#btn-add-new-sector');
        const btnBack = parentContainer.querySelector('#btn-back-from-add-form');

        // Lógica para añadir nueva zona
        if (btnAddNewZone) {
            btnAddNewZone.addEventListener('click', async () => {
                const newZona = addNewZoneInput.value.trim();
                if (newZona && !zonaSectorMap[newZona]) {
                    zonaSectorMap[newZona] = []; // Inicializa la nueva zona con un array vacío de sectores
                    if (await guardarConfiguracionZonasSectores(zonaSectorMap)) {
                        alert(`Zona "${newZona}" añadida.`);
                        addNewZoneInput.value = '';
                        // Re-poblar el select de zonas para sectores
                        selectZoneForSector.innerHTML = `<option value="">-- Selecciona una Zona --</option>` + Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('');
                    } else {
                        alert('Fallo al añadir zona.');
                    }
                } else if (zonaSectorMap[newZona]) {
                    alert(`La zona "${newZona}" ya existe.`);
                } else {
                    alert('Por favor, ingresa un nombre para la nueva zona.');
                }
            });
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-add-new-zone no encontrado.');
        }


        // Habilitar/deshabilitar input de sector basado en la selección de zona
        if (selectZoneForSector) {
            selectZoneForSector.addEventListener('change', () => {
                const selectedZone = selectZoneForSector.value;
                if (selectedZone) {
                    addNewSectorInput.disabled = false;
                    btnAddNewSector.disabled = false;
                } else {
                    addNewSectorInput.disabled = true;
                    btnAddNewSector.disabled = true;
                }
            });
        } else {
            console.error('renderAddZoneSectorForm: Select #select-zone-for-sector no encontrado.');
        }


        // Lógica para añadir nuevo sector
        if (btnAddNewSector) {
            btnAddNewSector.addEventListener('click', async () => {
                const selectedZone = selectZoneForSector.value;
                const newSector = addNewSectorInput.value.trim();
                if (selectedZone && newSector && !zonaSectorMap[selectedZone].includes(newSector)) {
                    zonaSectorMap[selectedZone].push(newSector);
                    if (await guardarConfiguracionZonasSectores(zonaSectorMap)) {
                        alert(`Sector "${newSector}" añadido a "${selectedZone}".`);
                        addNewSectorInput.value = '';
                    } else {
                        alert('Fallo al añadir sector.');
                    }
                } else if (zonaSectorMap[selectedZone].includes(newSector)) {
                    alert(`El sector "${newSector}" ya existe en "${selectedZone}".`);
                } else {
                    alert('Por favor, selecciona una zona e ingresa un nombre para el nuevo sector.');
                }
            });
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-add-new-sector no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderAddZoneSectorForm: Botón #btn-back-from-add-form no encontrado.');
        }
    }

    // Función para renderizar el formulario de modificar/eliminar Zona o Sector
    async function renderModifyDeleteZoneSectorForm(parentContainer, backToMainMenuCallback) {
        parentContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 rounded-lg shadow-inner">
                <h4 class="text-xl font-semibold text-yellow-800 mb-3">Modificar o Eliminar Zona o Sector</h4>

                <input type="text" id="search-zone-sector-input" placeholder="Buscar Zona o Sector..." class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4">

                <div id="zone-sector-list-container" class="max-h-60 overflow-y-auto bg-white p-3 rounded-md border border-gray-200">
                    <!-- Las zonas y sectores se cargarán aquí -->
                    <p class="text-gray-500">Cargando zonas y sectores...</p>
                </div>

                <button id="btn-back-from-modify-delete-form" class="mt-4 w-full bg-gray-400 text-white p-2 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;

        const searchInput = parentContainer.querySelector('#search-zone-sector-input');
        const listContainer = parentContainer.querySelector('#zone-sector-list-container');
        const btnBack = parentContainer.querySelector('#btn-back-from-modify-delete-form');

        // Función interna para renderizar la lista de zonas y sectores con opciones de eliminar
        const renderList = (filteredMap) => {
            listContainer.innerHTML = '';
            if (Object.keys(filteredMap).length === 0) {
                listContainer.innerHTML = '<p class="text-gray-500">No hay resultados.</p>';
                return;
            }

            for (const zona in filteredMap) {
                const zonaDiv = document.createElement('div');
                zonaDiv.className = 'mb-4 p-3 border border-gray-300 rounded-md bg-gray-50';
                zonaDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h5 class="font-bold text-lg text-gray-800">${zona}</h5>
                        <button class="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 delete-zona-btn" data-zona="${zona}">Eliminar Zona</button>
                    </div>
                    <ul class="list-disc pl-5 text-gray-700">
                        ${filteredMap[zona].map(sector => `
                            <li class="flex justify-between items-center py-1">
                                <span>${sector}</span>
                                <button class="bg-red-400 text-white px-2 py-0.5 rounded-md text-xs hover:bg-red-500 delete-sector-btn" data-zona="${zona}" data-sector="${sector}">Eliminar</button>
                            </li>
                        `).join('')}
                    </ul>
                `;
                listContainer.appendChild(zonaDiv);
            }

            // Añadir event listeners para eliminar zonas
            listContainer.querySelectorAll('.delete-zona-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zonaToDelete = event.target.dataset.zona;
                    if (confirm(`¿Estás seguro de que quieres eliminar la zona "${zonaToDelete}" y todos sus sectores?`)) {
                        delete zonaSectorMap[zonaToDelete];
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap); // Re-renderizar la lista con el mapa actualizado
                        alert(`Zona "${zonaToDelete}" eliminada.`);
                    }
                });
            });

            // Añadir event listeners para eliminar sectores
            listContainer.querySelectorAll('.delete-sector-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const zona = event.target.dataset.zona;
                    const sectorToDelete = event.target.dataset.sector;
                    if (confirm(`¿Estás seguro de que quieres eliminar el sector "${sectorToDelete}" de "${zona}"?`)) {
                        zonaSectorMap[zona] = zonaSectorMap[zona].filter(s => s !== sectorToDelete);
                        await guardarConfiguracionZonasSectores(zonaSectorMap);
                        renderList(zonaSectorMap); // Re-renderizar la lista con el mapa actualizado
                        alert(`Sector "${sectorToDelete}" eliminado de "${zona}".`);
                    }
                });
            });
        };

        // Renderizado inicial
        renderList(zonaSectorMap);

        // Funcionalidad de búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredMap = {};
                for (const zona in zonaSectorMap) {
                    if (zona.toLowerCase().includes(searchTerm)) {
                        filteredMap[zona] = zonaSectorMap[zona];
                    } else {
                        const matchingSectors = zonaSectorMap[zona].filter(sector => sector.toLowerCase().includes(searchTerm));
                        if (matchingSectors.length > 0) {
                            filteredMap[zona] = matchingSectors;
                        }
                    }
                }
                renderList(filteredMap);
            });
        } else {
            console.error('renderModifyDeleteZoneSectorForm: Input #search-zone-sector-input no encontrado.');
        }


        if (btnBack) {
            btnBack.addEventListener('click', backToMainMenuCallback);
        } else {
            console.error('renderModifyDeleteZoneSectorForm: Botón #btn-back-from-modify-delete-form no encontrado.');
        }
    }
}
