import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

const createRealClient = () => createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false,
});

const ENTITY_NAMES = [
  'Asset',
  'AssetTransaction',
  'Location',
  'MaintenanceTask',
  'Part',
  'CameraSystem',
  'Learning',
  'ChatSession',
];

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const makeId = (name) => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `preview_${name}_${random}`;
};

const sanitizeRecord = (record) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
};

const getEntityKey = (name) => `tim_preview_entity_${name}`;

const readEntityRecords = (name) => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(getEntityKey(name)) || '[]');
  } catch {
    return [];
  }
};

const writeEntityRecords = (name, records) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(getEntityKey(name), JSON.stringify(records));
};

const sortRecords = (records, order) => {
  if (!order) return records;
  const descending = String(order).startsWith('-');
  const field = descending ? String(order).slice(1) : String(order);
  return [...records].sort((a, b) => {
    const left = a[field] || '';
    const right = b[field] || '';
    if (left === right) return 0;
    return (left > right ? 1 : -1) * (descending ? -1 : 1);
  });
};

const createPreviewEntity = (name) => ({
  async list(order, limit) {
    const records = sortRecords(readEntityRecords(name), order);
    return Number.isFinite(limit) ? records.slice(0, limit) : records;
  },

  async filter(criteria = {}) {
    return readEntityRecords(name).filter((record) => (
      Object.entries(criteria).every(([key, value]) => record[key] === value)
    ));
  },

  async get(id) {
    const record = readEntityRecords(name).find((item) => item.id === id);
    if (!record) throw new Error(`${name} not found`);
    return record;
  },

  async create(data) {
    const now = new Date().toISOString();
    const record = {
      ...sanitizeRecord(data),
      id: makeId(name),
      created_date: now,
      updated_date: now,
    };
    const records = readEntityRecords(name);
    writeEntityRecords(name, [record, ...records]);
    return record;
  },

  async update(id, data) {
    const now = new Date().toISOString();
    const records = readEntityRecords(name);
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`${name} not found`);
    const updated = {
      ...records[index],
      ...sanitizeRecord(data),
      id,
      updated_date: now,
    };
    records[index] = updated;
    writeEntityRecords(name, records);
    return updated;
  },

  async delete(id) {
    const records = readEntityRecords(name).filter((item) => item.id !== id);
    writeEntityRecords(name, records);
    return { id };
  },
});

const createPreviewEntities = () => {
  const cache = Object.fromEntries(ENTITY_NAMES.map((name) => [name, createPreviewEntity(name)]));

  return new Proxy(cache, {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop];
      if (!target[prop]) target[prop] = createPreviewEntity(prop);
      return target[prop];
    },
  });
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const createPreviewClient = () => {
  const entities = createPreviewEntities();
  const previewAuth = {
    me: async () => ({
      id: 'local-preview',
      email: 'preview@tim.local',
      role: 'admin',
      full_name: 'Local Preview',
    }),
    redirectToLogin: () => {},
    logout: () => {},
  };
  const previewCore = {
    UploadFile: async ({ file }) => ({ file_url: await fileToDataUrl(file) }),
    UploadPrivateFile: async ({ file }) => ({ file_url: await fileToDataUrl(file) }),
    InvokeLLM: async () => 'Local preview mode is disconnected from AI services.',
    GenerateImage: async () => ({ url: '' }),
    SendEmail: async () => ({ success: true }),
    SendSMS: async () => ({ success: true }),
    ExtractDataFromUploadedFile: async () => ({}),
  };

  return {
    auth: previewAuth,
    entities,
    integrations: {
      Core: previewCore,
    },
    functions: {
      invoke: async (name, payload) => ({ ok: true, name, payload, preview: true }),
    },
    analytics: {
      track: () => {},
    },
    appLogs: {
      logUserInApp: async () => {},
    },
    asServiceRole: {
      entities,
      connectors: {
        getConnection: async () => ({ accessToken: '' }),
      },
    },
  };
};

export const base44 = appParams.isPreviewMode ? createPreviewClient() : createRealClient();
