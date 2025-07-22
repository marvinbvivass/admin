// clientes.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los clientes
// utilizando Firebase Firestore.

// Importa las funciones necesarias de Firebase Firestore.
// Estas funciones se obtendrán de la instancia de Firebase que se inicializa en index.html
// y se expone globalmente a través de window.firebaseDb.
// Es importante que el index.html se cargue y Firebase se inicialice antes de que este módulo intente usar 'db'.
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Función auxiliar para obtener la instancia de Firestore y el ID de usuario/appId
// Esto asegura que las variables globales de Firebase estén disponibles antes de usarlas.
async function getFirestoreInstances() {
    // Espera hasta que window.firebaseDb y window.currentUserId estén definidos
    // Esto es crucial porque la inicialización de Firebase es asíncrona en index.html
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

// Ejemplo de cómo se usarían estas funciones (esto se ejecutaría en un entorno de módulo ES6)
/*
// Para usar estas funciones en otro archivo JavaScript (ej. main.js o un script type="module" en HTML)
// Asegúrate de que Firebase ya se haya inicializado en index.html antes de llamar a estas funciones.
import { agregarCliente, modificarCliente, eliminarCliente, obtenerCliente, obtenerTodosLosClientes } from './clientes.js';

async function testClientes() {
    console.log("--- Probando funciones de Clientes ---");

    // 1. Agregar un cliente
    const nuevoClienteId = await agregarCliente({
        nombre: 'Ana',
        apellido: 'García',
        email: 'ana.garcia@example.com',
        telefono: '111-222-3333'
    });
    if (nuevoClienteId) {
        console.log(`Cliente 'Ana García' agregado con ID: ${nuevoClienteId}`);
    }

    // 2. Obtener un cliente por su ID
    if (nuevoClienteId) {
        const clienteObtenido = await obtenerCliente(nuevoClienteId);
        if (clienteObtenido) {
            console.log('Cliente obtenido:', clienteObtenido);
        }
    }

    // 3. Modificar un cliente
    if (nuevoClienteId) {
        const modificado = await modificarCliente(nuevoClienteId, { telefono: '999-888-7777', ciudad: 'Madrid' });
        if (modificado) {
            console.log(`Cliente con ID ${nuevoClienteId} modificado.`);
        }
    }

    // 4. Obtener todos los clientes
    const todosLosClientes = await obtenerTodosLosClientes();
    console.log('Lista de todos los clientes:', todosLosClientes);

    // 5. Eliminar un cliente (descomenta para probar la eliminación)
    // if (nuevoClienteId) {
    //     const eliminado = await eliminarCliente(nuevoClienteId);
    //     if (eliminado) {
    //         console.log(`Cliente con ID ${nuevoClienteId} eliminado.`);
    //     }
    // }
}

// Puedes llamar a testClientes() desde otro script o desde la consola del navegador
// después de que la aplicación se haya cargado y Firebase se haya inicializado.
// Por ejemplo, en un archivo main.js importado por index.html:
// window.addEventListener('load', testClientes);
*/

