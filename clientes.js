// clientes.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los clientes
// utilizando Firebase Firestore, y también se encarga de renderizar su interfaz de usuario.

// Importa las funciones necesarias de Firebase Firestore.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
 * @param {string} cliente.nombre - Nombre del cliente.
 * @param {string} cliente.apellido - Apellido del cliente.
 * @param {string} cliente.email - Correo electrónico del cliente.
 * @param {string} [cliente.telefono] - Número de teléfono del cliente (opcional).
 * @returns {Promise<string|null>} El ID del documento del cliente agregado o null si hubo un error.
 */
export async function agregarCliente(cliente) {
    try {
        const { db, userId, appId } = await getFirestoreInstances();
        // Construye la ruta de la colección para datos privados del usuario
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
        // Construye la ruta del documento específico del cliente
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
        // Construye la ruta del documento específico del cliente
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button id="btn-show-add-cliente" class="bg-blue-600 text-white p-4 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Agregar Cliente
                </button>
                <button id="btn-show-modify-delete-cliente" class="bg-yellow-600 text-white p-4 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                    Modificar/Eliminar Cliente
                </button>
                <button id="btn-show-list-clientes" class="bg-green-600 text-white p-4 rounded-md font-semibold hover:bg-green-700 transition duration-200 col-span-full">
                    Ver Clientes
                </button>
            </div>

            <!-- Contenedor para las sub-secciones dinámicas -->
            <div id="clientes-sub-section" class="mt-8">
                <!-- El contenido de agregar, modificar/eliminar o listar se cargará aquí -->
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
    const clientesSubSection = container.querySelector('#clientes-sub-section');
    const closeClientesModalBtn = container.querySelector('#close-clientes-modal');

    // Lógica para cerrar el modal
    closeClientesModalBtn.addEventListener('click', () => {
        container.classList.add('hidden'); // Oculta el modal
        clientesSubSection.innerHTML = ''; // Limpia el contenido de la sub-sección
    });

    // Lógica para mostrar la sección de agregar cliente
    container.querySelector('#btn-show-add-cliente').addEventListener('click', () => {
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-blue-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-blue-800 mb-4">Agregar Nuevo Cliente</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="add-nombre" placeholder="Nombre" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="text" id="add-apellido" placeholder="Apellido" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="email" id="add-email" placeholder="Email" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <input type="tel" id="add-telefono" placeholder="Teléfono (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button id="btn-submit-add-cliente" class="mt-6 w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition duration-200">
                    Confirmar Agregar Cliente
                </button>
            </div>
        `;
        // Conectar el botón de agregar cliente
        container.querySelector('#btn-submit-add-cliente').addEventListener('click', async () => {
            const nombre = container.querySelector('#add-nombre').value;
            const apellido = container.querySelector('#add-apellido').value;
            const email = container.querySelector('#add-email').value;
            const telefono = container.querySelector('#add-telefono').value;
            const nuevoCliente = { nombre, apellido, email, telefono };
            const id = await agregarCliente(nuevoCliente);
            if (id) {
                alert('Cliente agregado con éxito, ID: ' + id);
                // Limpiar campos
                container.querySelector('#add-nombre').value = '';
                container.querySelector('#add-apellido').value = '';
                container.querySelector('#add-email').value = '';
                container.querySelector('#add-telefono').value = '';
                // Opcional: Recargar la lista de clientes si estás en la vista de lista
            } else {
                alert('Fallo al agregar cliente.');
            }
        });
    });

    // Lógica para mostrar la sección de modificar/eliminar cliente
    container.querySelector('#btn-show-modify-delete-cliente').addEventListener('click', () => {
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-yellow-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-yellow-800 mb-4">Modificar o Eliminar Cliente</h3>
                <input type="text" id="mod-del-cliente-id" placeholder="ID del Cliente" class="mb-4 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="mod-nombre" placeholder="Nuevo Nombre (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="text" id="mod-apellido" placeholder="Nuevo Apellido (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="email" id="mod-email" placeholder="Nuevo Email (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <input type="tel" id="mod-telefono" placeholder="Nuevo Teléfono (opcional)" class="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                </div>
                <div class="flex flex-col md:flex-row gap-4 mt-6">
                    <button id="btn-submit-modify-cliente" class="flex-1 bg-yellow-600 text-white p-3 rounded-md font-semibold hover:bg-yellow-700 transition duration-200">
                        Confirmar Modificar
                    </button>
                    <button id="btn-submit-delete-cliente" class="flex-1 bg-red-600 text-white p-3 rounded-md font-semibold hover:bg-red-700 transition duration-200">
                        Confirmar Eliminar
                    </button>
                </div>
            </div>
        `;
        // Conectar los botones de modificar/eliminar cliente
        container.querySelector('#btn-submit-modify-cliente').addEventListener('click', async () => {
            const id = container.querySelector('#mod-del-cliente-id').value;
            const nuevosDatos = {};
            if (container.querySelector('#mod-nombre').value) nuevosDatos.nombre = container.querySelector('#mod-nombre').value;
            if (container.querySelector('#mod-apellido').value) nuevosDatos.apellido = container.querySelector('#mod-apellido').value;
            if (container.querySelector('#mod-email').value) nuevosDatos.email = container.querySelector('#mod-email').value;
            if (container.querySelector('#mod-telefono').value) nuevosDatos.telefono = container.querySelector('#mod-telefono').value;

            if (id && Object.keys(nuevosDatos).length > 0) {
                const modificado = await modificarCliente(id, nuevosDatos);
                if (modificado) {
                    alert('Cliente modificado con éxito.');
                    // Limpiar campos
                    container.querySelector('#mod-del-cliente-id').value = '';
                    container.querySelector('#mod-nombre').value = '';
                    container.querySelector('#mod-apellido').value = '';
                    container.querySelector('#mod-email').value = '';
                    container.querySelector('#mod-telefono').value = '';
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
    });

    // Lógica para mostrar la sección de listar clientes
    container.querySelector('#btn-show-list-clientes').addEventListener('click', async () => {
        clientesSubSection.innerHTML = `
            <div class="p-6 bg-green-50 rounded-lg shadow-inner">
                <h3 class="text-2xl font-semibold text-green-800 mb-4">Listado de Clientes</h3>
                <div id="clientes-list" class="bg-white p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    <!-- Los clientes se mostrarán aquí -->
                    <p class="text-gray-500">Cargando clientes...</p>
                </div>
            </div>
        `;
        const clientes = await obtenerTodosLosClientes();
        renderClientesList(clientes, container.querySelector('#clientes-list'));
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
                <p class="font-semibold">${cliente.nombre} ${cliente.apellido} (ID: ${cliente.id})</p>
                <p class="text-sm text-gray-600">Email: ${cliente.email || 'N/A'}</p>
                <p class="text-sm text-gray-600">Teléfono: ${cliente.telefono || 'N/A'}</p>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }
}
