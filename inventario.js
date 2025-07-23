// clientes.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los clientes
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Mapa de Zonas a Sectores para las listas desplegables
const zonaSectorMap = {
    "Santa Teresa": ["Barrio Bolivar", "Principal Santa Teresa", "Los Teques", "Calle 4", "La Villa"],
    "Foraneo": ["No Aplica"],
    "Zona Industrial": ["Zona Industrial"],
    "Machiri": ["Parte Alta", "Parte Baja", "Barrio el Lago"],
    "Palo Gordo": ["Gallardin", "Gallardin Parte Baja", "Gallardin Parte Alta", "Principal Palo Gordo", "Calle Tachira", "Calle del Medio", "Toica", "Nazareno", "La Trinidad", "Calle del Hambre", "Puente/Cancha"]
};

// Función auxiliar para obtener la instancia de Firestore y el ID de usuario/appId
// Esto asegura que las variables globales de Firebase estén disponibles antes de usarlas.
async function getFirestoreInstances() {
    // Espera hasta que window.firebaseDb y window.currentUserId estén definidos
    while (!window.firebaseDb || !window.currentUserId || !window.currentAppId) {
        console.log('Esperando inicialización de Firebase en clientes.js...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100ms antes de reintentar
    }
    return {
        db: window.firebaseDb,
        userId: window.currentUserId,
        appId: window.currentAppId
    };
}

/**
 * Agrega un nuevo cliente al sistema en Firestore.
 * Los datos se guardarán en una colección específica del usuario para mantenerlos privados.
 * Ruta: /artifacts/{appId}/users/{userId}/clientes
 * @param {object} cliente - Objeto con los datos del cliente a agregar.
 * @param {string} cliente.ID - ID único del cliente (puede ser autogenerado por Firestore si no se especifica).
 * @param {string} cliente.CEP - Código de Enrutamiento Postal.
 * @param {string} cliente.NombreComercial - Nombre comercial del cliente.
 * @param {string} cliente.NombrePersonal - Nombre personal del contacto.
 * @param {string} cliente.Zona - Zona geográfica del cliente.
 * @param {string} cliente.Sector - Sector de actividad del cliente.
 * @param {string} cliente.Tlf - Número de teléfono.
 * @param {string} [cliente.Observaciones] - Observaciones adicionales (opcional).
 * @returns {Promise<string|null>} El ID del documento del cliente agregado o null si hubo un error.
 */
export async function agregarCliente(cliente) {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        const clientesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clientes`);
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
        const { db, userId, appId } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `artifacts/${appId}/users/${userId}/clientes`, idCliente);
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
        const { db, userId, appId } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `artifacts/${appId}/users/${userId}/clientes`, idCliente);
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
        const { db, userId, appId } = await getFirestoreInstances();
        const clienteDocRef = doc(db, `artifacts/${appId}/users/${userId}/clientes`, idCliente);
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
        const { db, userId, appId } = await getFirestoreInstances();
        const clientesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clientes`);
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
                <button id="btn-show-search-cliente" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200 col-span-full">
                    Buscar Cliente
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

    // Obtener referencias a los elementos del DOM después de que se hayan renderizado
    const clientesMainButtonsContainer = container.querySelector('#clientes-main-buttons-container');
    const clientesSubSection = container.querySelector('#clientes-sub-section');
    const closeClientesModalBtn = container.querySelector('#close-clientes-modal');

    // Función para mostrar los botones principales y limpiar la sub-sección
    const showClientesMainButtons = () => {
        clientesSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
        clientesMainButtonsContainer.classList.remove('hidden'); // Muestra los botones principales
    };

    // Lógica para cerrar el modal
    closeClientesModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        showClientesMainButtons(); // Vuelve a la vista de botones principales al cerrar
    });

    // Lógica para mostrar la sección de agregar cliente
    container.querySelector('#btn-show-add-cliente').addEventListener('click', () => {
        clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        clientesSubSection.innerHTML = `
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
        const addZonaSelect = container.querySelector('#add-zona');
        const addSectorSelect = container.querySelector('#add-sector');
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
        container.querySelector('#btn-submit-add-cliente').addEventListener('click', async () => {
            const cliente = {
                CEP: container.querySelector('#add-cep').value,
                NombreComercial: container.querySelector('#add-nombre-comercial').value,
                NombrePersonal: container.querySelector('#add-nombre-personal').value,
                Zona: container.querySelector('#add-zona').value,
                Sector: container.querySelector('#add-sector').value,
                Tlf: container.querySelector('#add-tlf').value,
                Observaciones: container.querySelector('#add-observaciones').value
            };

            const id = await agregarCliente(cliente);
            if (id) {
                alert('Cliente agregado con éxito, ID: ' + id);
                // Limpiar campos
                container.querySelector('#add-cep').value = '';
                container.querySelector('#add-nombre-comercial').value = '';
                container.querySelector('#add-nombre-personal').value = '';
                container.querySelector('#add-zona').value = '';
                container.querySelector('#add-sector').innerHTML = '<option value="">Selecciona Sector</option>'; // Limpiar y resetear sector
                container.querySelector('#add-sector').disabled = true;
                container.querySelector('#add-tlf').value = '';
                container.querySelector('#add-observaciones').value = '';
            } else {
                alert('Fallo al agregar cliente.');
            }
        });

        // Conectar el botón Volver
        container.querySelector('#btn-back-add-cliente').addEventListener('click', showClientesMainButtons);
    });

    // Lógica para mostrar la sección de modificar/eliminar cliente
    container.querySelector('#btn-show-modify-delete-cliente').addEventListener('click', () => {
        clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Cliente</h3>
                <input type="text" id="mod-del-cliente-id" placeholder="ID del Cliente" class="mb-4 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="mod-cep" placeholder="Nuevo CEP (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-nombre-comercial" placeholder="Nuevo Nombre Comercial (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-nombre-personal" placeholder="Nuevo Nombre Personal (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <select id="mod-zona" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Nueva Zona (opcional)</option>
                        ${Object.keys(zonaSectorMap).map(zona => `<option value="${zona}">${zona}</option>`).join('')}
                    </select>
                    <select id="mod-sector" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500" disabled>
                        <option value="">Nuevo Sector (opcional)</option>
                    </select>
                    <input type="tel" id="mod-tlf" placeholder="Nuevo Teléfono (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <textarea id="mod-observaciones" placeholder="Nuevas Observaciones (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 col-span-full"></textarea>
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
        const modZonaSelect = container.querySelector('#mod-zona');
        const modSectorSelect = container.querySelector('#mod-sector');
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
        container.querySelector('#btn-submit-modify-cliente').addEventListener('click', async () => {
            const id = container.querySelector('#mod-del-cliente-id').value;
            const nuevosDatos = {};
            if (container.querySelector('#mod-cep').value) nuevosDatos.CEP = container.querySelector('#mod-cep').value;
            if (container.querySelector('#mod-nombre-comercial').value) nuevosDatos.NombreComercial = container.querySelector('#mod-nombre-comercial').value;
            if (container.querySelector('#mod-nombre-personal').value) nuevosDatos.NombrePersonal = container.querySelector('#mod-nombre-personal').value;
            if (container.querySelector('#mod-zona').value) nuevosDatos.Zona = container.querySelector('#mod-zona').value;
            if (container.querySelector('#mod-sector').value) nuevosDatos.Sector = container.querySelector('#mod-sector').value;
            if (container.querySelector('#mod-tlf').value) nuevosDatos.Tlf = container.querySelector('#mod-tlf').value;
            if (container.querySelector('#mod-observaciones').value) nuevosDatos.Observaciones = container.querySelector('#mod-observaciones').value;


            if (id && Object.keys(nuevosDatos).length > 0) {
                const modificado = await modificarCliente(id, nuevosDatos);
                if (modificado) {
                    alert('Cliente modificado con éxito.');
                    // Limpiar campos
                    container.querySelector('#mod-del-cliente-id').value = '';
                    container.querySelector('#mod-cep').value = '';
                    container.querySelector('#mod-nombre-comercial').value = '';
                    container.querySelector('#mod-nombre-personal').value = '';
                    container.querySelector('#mod-zona').value = '';
                    container.querySelector('#mod-sector').innerHTML = '<option value="">Nuevo Sector (opcional)</option>';
                    container.querySelector('#mod-sector').disabled = true;
                    container.querySelector('#mod-tlf').value = '';
                    container.querySelector('#mod-observaciones').value = '';
                } else {
                    alert('Fallo al modificar cliente.');
                }
            } else {
                alert('Por favor, ingresa el ID del cliente y al menos un campo para modificar.');
            }
        });

        container.querySelector('#btn-submit-delete-cliente').addEventListener('click', async () => {
            const id = container.querySelector('#mod-del-cliente-id').value;
            if (id) {
                const eliminado = await eliminarCliente(id);
                if (eliminado) {
                    alert('Cliente eliminado con éxito.');
                    container.querySelector('#mod-del-cliente-id').value = '';
                } else {
                    alert('Fallo al eliminar cliente.');
                }
            } else {
                alert('Por favor, ingresa el ID del cliente a eliminar.');
            }
        });

        // Conectar el botón Volver
        container.querySelector('#btn-back-modify-delete-cliente').addEventListener('click', showClientesMainButtons);
    });

    // Lógica para mostrar la sección de buscar cliente (anteriormente listar)
    container.querySelector('#btn-show-search-cliente').addEventListener('click', async () => {
        clientesMainButtonsContainer.classList.add('hidden'); // Oculta los botones principales
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Buscar Cliente</h3>
                <input type="text" id="search-cliente-input" placeholder="Buscar por Nombre, CEP, Zona, etc." class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-4">
                <div id="clientes-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    <!-- Los clientes se mostrarán aquí -->
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>
                <button id="btn-back-search-cliente" class="mt-4 w-full bg-gray-400 text-white p-3 rounded-md font-semibold hover:bg-gray-500 transition duration-200">
                    Volver
                </button>
            </div>
        `;
        const clientesListDiv = container.querySelector('#clientes-list');
        const searchInput = container.querySelector('#search-cliente-input');
        let allClients = []; // Para almacenar todos los clientes y filtrar sobre ellos

        // Cargar todos los clientes al abrir la sección
        allClients = await obtenerTodosLosClientes();
        renderClientesList(allClients, clientesListDiv);

        // Lógica de filtrado en tiempo real
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredClients = allClients.filter(cliente => {
                // Busca en todos los campos relevantes
                return (cliente.NombreComercial && cliente.NombreComercial.toLowerCase().includes(searchTerm)) ||
                       (cliente.NombrePersonal && cliente.NombrePersonal.toLowerCase().includes(searchTerm)) ||
                       (cliente.CEP && cliente.CEP.toLowerCase().includes(searchTerm)) ||
                       (cliente.Zona && cliente.Zona.toLowerCase().includes(searchTerm)) ||
                       (cliente.Sector && cliente.Sector.toLowerCase().includes(searchTerm)) ||
                       (cliente.Tlf && cliente.Tlf.toLowerCase().includes(searchTerm)) ||
                       (cliente.Observaciones && cliente.Observaciones.toLowerCase().includes(searchTerm));
            });
            renderClientesList(filteredClients, clientesListDiv);
        });

        // Conectar el botón Volver
        container.querySelector('#btn-back-search-cliente').addEventListener('click', showClientesMainButtons);
    });

    // Función auxiliar para renderizar la lista de clientes
    function renderClientesList(clientes, listContainer) {
        listContainer.innerHTML = ''; // Limpiar lista
        if (clientes.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500">No hay clientes para mostrar aún.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'divide-y divide-gray-200';
        clientes.forEach(cliente => {
            const li = document.createElement('li');
            li.className = 'py-2';
            li.innerHTML = `
                <p class="font-semibold">${cliente.NombreComercial || 'N/A'} (${cliente.NombrePersonal || 'N/A'})</p>
                <p class="text-sm text-gray-600">ID: ${cliente.id || 'N/A'} | CEP: ${cliente.CEP || 'N/A'}</p>
                <p class="text-sm text-gray-600">Zona: ${cliente.Zona || 'N/A'} | Sector: ${cliente.Sector || 'N/A'}</p>
                <p class="text-sm text-gray-600">Teléfono: ${cliente.Tlf || 'N/A'}</p>
                <p class="text-sm text-gray-600">Observaciones: ${cliente.Observaciones || 'N/A'}</p>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }
}
