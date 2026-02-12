'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation and returns a promise.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  return setDoc(docRef, data, options).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: (options && ('merge' in options || 'mergeFields' in options)) ? 'update' : 'create',
        requestResourceData: data,
      })
    );
    throw error;
  });
}


/**
 * Initiates an addDoc operation and returns a promise.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  return addDoc(colRef, data)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      );
      throw error;
    });
}


/**
 * Initiates an updateDoc operation and returns a promise.
 * It uses setDoc with merge for robustness against certain permission issues.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  return setDoc(docRef, data, { merge: true })
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      );
      throw error;
    });
}


/**
 * Initiates a deleteDoc operation and returns a promise.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  return deleteDoc(docRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      );
      throw error;
    });
}
