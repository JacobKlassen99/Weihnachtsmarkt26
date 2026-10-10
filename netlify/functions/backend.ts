import type { Handler, HandlerEvent } from '@netlify/functions';

const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzPYXuXu8FSvtmRVaDywv8OxsDZZX45WfxpNBoPmdF29cnezThtfv2bxRxoELdTjUSz/exec';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function resolveQueryString(event: HandlerEvent): string {
  // 1. Try rawQuery if provided
  if (event.rawQuery && typeof event.rawQuery === 'string' && event.rawQuery.trim().length > 0) {
    return event.rawQuery;
  }
  // 2. Try queryStringParameters (standard Netlify / AWS Lambda)
  if (event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(event.queryStringParameters)) {
      if (val !== undefined && val !== null) {
        params.append(key, val);
      }
    }
    const built = params.toString();
    if (built) return built;
  }
  // 3. Try parsing from rawUrl
  if (event.rawUrl && event.rawUrl.includes('?')) {
    const queryPart = event.rawUrl.split('?')[1];
    if (queryPart) return queryPart;
  }
  return '';
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    // 1. GET Requests (e.g. ?action=public)
    if (event.httpMethod === 'GET') {
      const queryString = resolveQueryString(event);
      const targetUrl = queryString
        ? `${GOOGLE_APPS_SCRIPT_URL}?${queryString}`
        : GOOGLE_APPS_SCRIPT_URL;

      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      const responseText = await response.text();
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: responseText,
      };
    }

    // 2. POST Requests
    if (event.httpMethod === 'POST') {
      let bodyStr = event.body || '{}';
      // Decode base64 if Netlify encoded the request body
      if (event.isBase64Encoded && event.body) {
        try {
          bodyStr = Buffer.from(event.body, 'base64').toString('utf-8');
        } catch (decodeErr) {
          console.error('Error al decodificar cuerpo base64:', decodeErr);
        }
      }

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: typeof bodyStr === 'string' ? bodyStr : JSON.stringify(bodyStr),
        redirect: 'follow',
      });

      const responseText = await response.text();
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: responseText,
      };
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: false, error: `Método ${event.httpMethod} no permitido` }),
    };
  } catch (error: any) {
    console.error('Error forwarding request to Google Apps Script:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: error.message || 'Error de conexión con Google Apps Script',
      }),
    };
  }
};
