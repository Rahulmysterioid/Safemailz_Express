import { useMemo } from 'react';

/**
 * Pure utility function to derive and aggregate unique client records from an employee's assigned projects.
 *
 * Data Contract:
 * - Extracts client string/id from project.client || project.selectedClient || project.clientEmail || project.clientId || project.clientName.
 * - Skips projects if client is missing, null, undefined, empty, or '—'.
 * - Normalizes clientKey to lowercase trimmed string.
 * - Cross-references with allClients to find matching client record by id, clientId, email, name, or displayName.
 * - Groups projects by clientKey into an array of EmployeeClientRecord objects.
 *
 * @param {Array} [employeeProjects=[]] - List of projects assigned to the employee
 * @param {Array} [allClients=[]] - List of all registered client objects in the system
 * @returns {Array<Object>} List of grouped client records with associated projects
 */
export function deriveEmployeeClients(employeeProjects = [], allClients = []) {
  if (!Array.isArray(employeeProjects) || employeeProjects.length === 0) {
    return [];
  }

  const clientsList = Array.isArray(allClients) ? allClients : [];
  const groupsMap = new Map();

  for (const project of employeeProjects) {
    if (!project || typeof project !== 'object') {
      continue;
    }

    // Extract client string/id with fallback priority
    const rawClient =
      project.client ??
      project.selectedClient ??
      project.clientEmail ??
      project.clientId ??
      project.clientName;

    if (rawClient === null || rawClient === undefined) {
      continue;
    }

    let clientVal = rawClient;
    if (typeof clientVal === 'object' && clientVal !== null) {
      clientVal =
        clientVal.id ||
        clientVal.clientId ||
        clientVal.name ||
        clientVal.displayName ||
        clientVal.email ||
        '';
    }

    const clientStr = typeof clientVal === 'string' ? clientVal.trim() : String(clientVal).trim();

    // Skip if client is missing, null, undefined, empty, or '—'
    if (
      !clientStr ||
      clientStr === '—' ||
      clientStr === '-' ||
      clientStr.toLowerCase() === 'undefined' ||
      clientStr.toLowerCase() === 'null'
    ) {
      continue;
    }

    const clientKey = clientStr.toLowerCase();

    // Cross-reference with allClients (if available) to match client record
    const matchedClient =
      clientsList.find((c) => {
        if (!c || typeof c !== 'object') return false;

        if (
          c.id !== undefined &&
          c.id !== null &&
          (c.id === clientVal || String(c.id) === clientStr || String(c.id).toLowerCase() === clientKey)
        ) {
          return true;
        }

        if (
          c.clientId !== undefined &&
          c.clientId !== null &&
          (c.clientId === clientVal || String(c.clientId) === clientStr || String(c.clientId).toLowerCase() === clientKey)
        ) {
          return true;
        }

        if (c.email && typeof c.email === 'string' && c.email.toLowerCase() === clientKey) {
          return true;
        }

        if (c.name && typeof c.name === 'string' && c.name.toLowerCase() === clientKey) {
          return true;
        }

        if (c.displayName && typeof c.displayName === 'string' && c.displayName.toLowerCase() === clientKey) {
          return true;
        }

        return false;
      }) || null;

    const projectEntry = {
      projectId: project.id ?? project._id ?? project.projectId,
      projectName: project.projectName || project.name || 'Untitled Project',
      projectEmailId: project.projectEmailId || '—',
      projectLeader: project.leader || project.projectLeader || '—',
      employeeName: project.employeeName || project.empName || '',
      status: project.status || 'Active'
    };

    if (groupsMap.has(clientKey)) {
      const existing = groupsMap.get(clientKey);

      // Enrich clientDetails if existing group lacks details but this project matched one
      if (!existing.clientDetails && matchedClient) {
        existing.clientDetails = matchedClient;
        if (!existing.clientNameOrEmail || existing.clientNameOrEmail === clientStr) {
          existing.clientNameOrEmail = matchedClient.displayName || matchedClient.name || clientStr;
        }
        if (!existing.clientEmail && matchedClient.email) {
          existing.clientEmail = matchedClient.email;
        }
      }

      existing.projects.push(projectEntry);
    } else {
      const clientNameOrEmail = matchedClient?.displayName || matchedClient?.name || clientStr;
      const clientEmail = matchedClient?.email || (clientStr.includes('@') ? clientStr : '');

      groupsMap.set(clientKey, {
        clientKey,
        clientNameOrEmail,
        clientEmail,
        clientDetails: matchedClient,
        projects: [projectEntry]
      });
    }
  }

  return Array.from(groupsMap.values());
}

/**
 * Custom React hook to memoize derived employee clients.
 *
 * @param {Array} [employeeProjects=[]] - List of projects assigned to the employee
 * @param {Array} [allClients=[]] - List of all registered client objects
 * @returns {Array<Object>} Memoized list of aggregated client records
 */
export function useEmployeeClients(employeeProjects = [], allClients = []) {
  return useMemo(() => {
    return deriveEmployeeClients(employeeProjects, allClients);
  }, [employeeProjects, allClients]);
}

export default deriveEmployeeClients;
