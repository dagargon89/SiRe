import { createApiClient } from './api'
import { getIdToken } from './firebase'

/** Instancia única del ApiClient, con el ID token de Firebase inyectado. */
export const api = createApiClient({ getToken: getIdToken })
