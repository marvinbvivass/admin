// inventario.js
// Este archivo gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los productos del inventario
// utilizando Firebase Firestore.

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

// Ejemplo de cómo se usarían estas funciones (esto se ejecutaría en un entorno de módulo ES6)
/*
// Para usar estas funciones en otro archivo JavaScript (ej. main.js o un script type="module" en HTML)
// Asegúrate de que Firebase ya se haya inicializado en index.html antes de llamar a estas funciones.
import { agregarProducto, verInventarioCompleto, buscarProducto, modificarProducto, eliminarProducto } from './inventario.js';

async function testInventario() {
    console.log("--- Probando funciones de Inventario ---");

    // 1. Agregar un producto
    const nuevoProductoId = await agregarProducto({
        Rubro: 'Bebidas',
        Sku: 'CERV-LAGER-001',
        Segmento: 'Cervezas',
        Producto: 'Cerveza Lager',
        Presentacion: 'Botella 330ml',
        Cantidad: 100,
        Precio: 1.50
    });
    if (nuevoProductoId) {
        console.log(`Producto 'Cerveza Lager' agregado con ID: ${nuevoProductoId}`);
    }

    // 2. Ver inventario completo
    const inventarioCompleto = await verInventarioCompleto();
    console.log('Inventario completo:', inventarioCompleto);

    // 3. Buscar un producto por Sku
    const productosEncontrados = await buscarProducto('Sku', 'CERV-LAGER-001');
    console.log('Productos encontrados por Sku:', productosEncontrados);

    // 4. Modificar un producto
    if (nuevoProductoId) {
        const modificado = await modificarProducto(nuevoProductoId, { Cantidad: 95, Precio: 1.60 });
        if (modificado) {
            console.log(`Producto con ID ${nuevoProductoId} modificado.`);
        }
    }

    // 5. Eliminar un producto (descomenta para probar la eliminación)
    // if (nuevoProductoId) {
    //     const eliminado = await eliminarProducto(nuevoProductoId);
    //     if (eliminado) {
    //         console.log(`Producto con ID ${nuevoProductoId} eliminado.`);
    //     }
    // }
}

// Puedes llamar a testInventario() desde otro script o desde la consola del navegador
// después de que la aplicación se haya cargado y Firebase se haya inicializado.
// window.addEventListener('load', testInventario);
*/
