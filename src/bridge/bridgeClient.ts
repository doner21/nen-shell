import { httpPiBridge } from './httpPiBridge';

// HTTP client contains mock fallback for offline or malformed local bridge responses.
export const piBridge = httpPiBridge;
