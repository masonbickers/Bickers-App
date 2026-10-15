export function selectRecoveryDeployment(search, config) {
  const allowed = new Set(['primary', 'pilot']);
  if (!allowed.has(config?.defaultDeployment) || !Array.isArray(config?.enabledDeployments)
    || !config.enabledDeployments.includes(config.defaultDeployment)
    || config.enabledDeployments.some(value => !allowed.has(value))) {
    throw new Error('Invalid recovery deployment configuration.');
  }
  const requested = new URLSearchParams(search).get('deployment');
  return config.enabledDeployments.includes(requested) ? requested : config.defaultDeployment;
}
