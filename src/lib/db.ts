import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Annotation } from '@/types';

interface PdfAnnotatorDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      fileName: string;
      totalPages: number;
      fileData: ArrayBuffer;
      lastOpenedAt: number;
      createdAt: number;
    };
  };
  annotations: {
    key: string; // documentId
    value: {
      documentId: string;
      annotationsByPage: Record<number, Annotation[]>;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'pdf-annotator-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PdfAnnotatorDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PdfAnnotatorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('annotations')) {
          db.createObjectStore('annotations', { keyPath: 'documentId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: {
  id: string;
  fileName: string;
  totalPages: number;
  fileData: ArrayBuffer;
}) {
  const db = await getDB();
  await db.put('documents', {
    ...doc,
    lastOpenedAt: Date.now(),
    createdAt: Date.now(),
  });
}

export async function getDocument(id: string) {
  const db = await getDB();
  return db.get('documents', id);
}

export async function getAllDocuments() {
  const db = await getDB();
  return db.getAll('documents');
}

export async function deleteDocument(id: string) {
  const db = await getDB();
  await db.delete('documents', id);
  await db.delete('annotations', id);
}

export async function saveAnnotations(
  documentId: string,
  annotationsByPage: Record<number, Annotation[]>
) {
  const db = await getDB();
  await db.put('annotations', {
    documentId,
    annotationsByPage,
    updatedAt: Date.now(),
  });
}

export async function getAnnotations(documentId: string) {
  const db = await getDB();
  return db.get('annotations', documentId);
}