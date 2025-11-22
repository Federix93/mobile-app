// Development config - this will be replaced by server.py in production
window.APP_CONFIG = {
  databricksHost: import.meta.env.VITE_DATABRICKS_HOST || '',
  genieSpaceId: import.meta.env.VITE_GENIE_SPACE_ID || '01f08cd0897513558f56d69f8fd6bf3e',
  sqlWarehouseId: import.meta.env.VITE_SQL_WAREHOUSE_ID || '9b40d49f75567565',
  isOBO: false, // OBO not available in local dev
  clientId: ''
};
console.log('📦 Loaded dev config:', window.APP_CONFIG);
