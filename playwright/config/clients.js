/**
 * Dynamic Client Manager
 * 
 * This module discovers and configures clients from environment variables.
 */

const resolveUrl = (clientId, customUrl) => {
  if (customUrl) return customUrl;
  
  if (clientId === "dev-oms" || clientId.startsWith("dev")) {
    return "https://bopis-dev.hotwax.io";
  }
  if (clientId.endsWith("-uat")) {
    // If there's a UAT specific deployment for BOPIS, otherwise fallback to standard
    return "https://bopis-uat.hotwax.io"; 
  }
  
  return "https://bopis.hotwax.io";
};

const getEnvPrefix = (key) => key.toUpperCase().replace(/-/g, '_');

const getClientConfig = (clientId) => {
  const key = clientId || process.env.CLIENT;
  if (!key) throw new Error('CLIENT environment variable is not set.');

  let config = { clientId: key, name: key };

  const prefix = getEnvPrefix(key);
  const baseUrl = process.env.URL || process.env[`${prefix}_URL`];
  const username = process.env.USERNAME || process.env[`${prefix}_USERNAME`];
  const password = process.env.PASSWORD || process.env[`${prefix}_PASSWORD`];

  if (baseUrl || username || password) {
    config = {
      ...config,
      baseUrl: resolveUrl(key, baseUrl),
      username: username,
      password: password
    };
  }

  if (process.env.CLIENTS) {
    try {
      const clientsStr = process.env.CLIENTS.replace(/^'|'$/g, '').replace(/\\'/g, "'");
      const clientsMap = JSON.parse(clientsStr);
      const data = clientsMap[key] || {};
      
      return {
        ...config,
        name: data.name || config.name,
        baseUrl: config.baseUrl || resolveUrl(key, data.url || data.baseUrl),
        oms: data.oms || key,
        username: config.username || data.username,
        password: config.password || data.password,
        shopify: data.shopify || {}
      };
    } catch (e) {
      console.error("[Config Error] Failed to parse CLIENTS JSON:", e);
    }
  }

  return config;
};

const getAllClients = () => {
  const discoveredIds = new Set();

  if (process.env.CLIENT) {
    discoveredIds.add(process.env.CLIENT);
  } else if (process.env.CLIENTS) {
    try {
      const clientsStr = process.env.CLIENTS.replace(/^'|'$/g, '').replace(/\\'/g, "'");
      Object.keys(JSON.parse(clientsStr)).forEach(id => discoveredIds.add(id));
    } catch (e) { }
  }

  return Array.from(discoveredIds).map(id => getClientConfig(id));
};

module.exports = {
  getClientConfig,
  getAllClients
};
